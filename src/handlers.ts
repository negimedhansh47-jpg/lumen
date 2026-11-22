import { z } from "zod";
import { getCached, putCached } from "./cache.ts";
import { getCommit, getFile, getHeadSha, getMeta, getTree, isReadable, listCommits, pickKeyFiles, type GhEnv } from "./github.ts";
import { callLLM, type LlmEnv } from "./llm.ts";
import * as chatReview from "./prompts/chatReview.ts";
import * as commitExplain from "./prompts/commitExplain.ts";
import * as kickoff from "./prompts/kickoff.ts";
import * as repoOverview from "./prompts/repoOverview.ts";
import { spendLlmCall, type LimitEnv } from "./ratelimit.ts";
import { levelSchema, parseLevel, parseRepo, parseSha, readBody } from "./validate.ts";

export interface Env extends LlmEnv, GhEnv, LimitEnv {}

/** Keep a line range only if it lies inside the text we actually fetched for that file. */
function seenLines(lines: string | undefined, content: string | undefined): string | undefined {
  const m = lines?.match(/^(\d+)(?:-(\d+))?$/);
  if (!m || content === undefined) return undefined;
  const start = Number(m[1]);
  const end = Number(m[2] ?? m[1]);
  return start >= 1 && start <= end && end <= content.split("\n").length ? lines : undefined;
}

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/** POST /api/chat/review. Never cached, never stored: chats are private. */
export async function reviewChat(req: Request, env: Env): Promise<Response> {
  const { chat, level } = await readBody(
    req,
    z.object({
      chat: z.string().min(20, "Paste a longer chat so there is something to review.").max(30_000, "That chat is over 30,000 characters. Paste a shorter part."),
      level: levelSchema,
    }),
  );
  await spendLlmCall(env, req);
  const out = await callLLM(env, chatReview.build(chat, level));
  const haystack = norm(chat);
  const seen = new Set<string>();
  const items = out.items
    .filter((i) => i.excerpt.trim() && haystack.includes(norm(i.excerpt))) // drop excerpts the model made up
    .filter((i) => !seen.has(norm(i.excerpt)) && seen.add(norm(i.excerpt))) // one finding per excerpt
    .slice(0, 8)
    .map((i, n) => ({ id: `item-${n + 1}`, ...i }));
  return Response.json({ overview: out.overview, items });
}

/** GET /api/repo/overview?repo=owner/name&level= */
export async function overview(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const repo = parseRepo(url.searchParams.get("repo"));
  const level = parseLevel(url.searchParams.get("level"));

  const meta = await getMeta(env, repo);
  const headSha = await getHeadSha(env, repo, meta.defaultBranch);
  const key = `overview:${repo.toLowerCase()}@${headSha}:${level}`;
  const hit = await getCached(env.DB, key);
  if (hit) return Response.json(hit);

  await spendLlmCall(env, req);
  const { files, truncated } = await getTree(env, repo, headSha);
  const readable = files.filter((f) => isReadable(f.path, f.size));
  const listed = readable.map((f) => f.path).sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b)).slice(0, 350);
  const keyPaths = pickKeyFiles(files);
  const contents = await Promise.all(keyPaths.map((p) => getFile(env, repo, p, headSha, 3000).catch(() => "")));
  const keyFiles = Object.fromEntries(keyPaths.map((p, i) => [p, contents[i]]).filter(([, c]) => c));

  const out = await callLLM(env, repoOverview.build(meta, listed, keyFiles, level));

  const all = new Set(files.map((f) => f.path));
  const exists = (p: string) => all.has(p) || files.some((f) => f.path.startsWith(`${p}/`));
  const tidy = (p: string) => p.replace(/^\.?\//, "").replace(/\/$/, "");
  const modules = out.modules
    .map((m) => ({
      ...m,
      paths: m.paths.map(tidy).filter(exists),
      evidence: m.evidence.map((e) => ({ path: tidy(e.path), lines: seenLines(e.lines, keyFiles[tidy(e.path)]) })).filter((e) => exists(e.path)),
    }))
    .filter((m) => m.evidence.length > 0) // evidence is required: drop modules we cannot ground
    .filter((m, i, all) => all.findIndex((o) => o.id === m.id) === i);
  const ids = new Set(modules.map((m) => m.id));
  const edges = out.edges.filter((e) => ids.has(e.from) && ids.has(e.to) && e.from !== e.to);

  const result = {
    meta: { ...meta, analyzed: Object.keys(keyFiles).length, total: files.length, truncated },
    headSha,
    stack: out.stack,
    summary: out.summary,
    modules,
    edges,
  };
  await putCached(env.DB, key, result);
  return Response.json(result);
}

/** GET /api/repo/commits?repo=owner/name[&path=file/or/dir]: no LLM. */
export async function commits(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const repo = parseRepo(url.searchParams.get("repo"));
  const path = url.searchParams.get("path") ?? undefined;
  return Response.json(await listCommits(env, repo, path?.slice(0, 300), path ? 5 : 15));
}

const MAX_DIFF = 12_000;

/** POST /api/commit/explain */
export async function explainCommit(req: Request, env: Env): Promise<Response> {
  const body = await readBody(req, z.object({ repo: z.string(), sha: z.string(), level: levelSchema }));
  const repo = parseRepo(body.repo);
  const sha = parseSha(body.sha);
  const key = `commit:${repo.toLowerCase()}@${sha}:${body.level}`;
  const hit = await getCached(env.DB, key);
  if (hit) return Response.json(hit);

  await spendLlmCall(env, req);
  const commit = await getCommit(env, repo, sha);
  const usable = commit.files.filter((f) => f.patch && isReadable(f.path, 0));
  const diff = usable.map((f) => `--- ${f.path}\n${f.patch}`).join("\n\n").slice(0, MAX_DIFF);
  if (!diff) return Response.json({ error: { code: "no_diff", message: "This commit has no readable code changes (maybe only lockfiles or images)." } }, { status: 422 });

  const out = await callLLM(env, commitExplain.build(commit.message, diff, body.level));
  const changed = new Set(commit.files.map((f) => f.path));
  const result = { ...out, evidence: out.evidence.filter((e) => changed.has(e.path)) };
  await putCached(env.DB, key, result);
  return Response.json(result);
}

/** POST /api/kickoff. Not cached: ideas are private. */
export async function kickoffHandler(req: Request, env: Env): Promise<Response> {
  const { idea, level } = await readBody(
    req,
    z.object({
      idea: z.string().trim().min(10, "Describe your idea in a sentence or two.").max(500, "Keep the idea under 500 characters."),
      level: levelSchema,
    }),
  );
  await spendLlmCall(env, req);
  const out = await callLLM(env, kickoff.build(idea, level));
  return Response.json({ restatement: out.restatement, decisions: out.decisions, firstSteps: out.firstSteps, claudeMd: kickoff.claudeMd(out) });
}

