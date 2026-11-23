import { HttpError } from "./validate.ts";

export interface GhEnv {
  GITHUB_TOKEN?: string;
}

const API = "https://api.github.com"; // the only host this app ever fetches repo data from

function request(path: string, accept: string, token?: string): Promise<Response> {
  return fetch(`${API}${path}`, {
    headers: {
      accept,
      "user-agent": "lumen-learn",
      "x-github-api-version": "2022-11-28",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(15_000),
  }).catch(() => {
    throw new HttpError(502, "github_error", "GitHub did not answer in time. Please try again.");
  });
}

async function gh(env: GhEnv, path: string, accept = "application/vnd.github+json"): Promise<Response> {
  let res = await request(path, accept, env.GITHUB_TOKEN?.trim());
  if (res.status === 401 && env.GITHUB_TOKEN) {
    console.error("GITHUB_TOKEN was rejected (401); retrying anonymously. Replace the secret.");
    res = await request(path, accept); // a bad token must not take the whole site down
  }
  if (res.status === 404) {
    throw new HttpError(404, "repo_not_found", "That repo was not found, or it is private. Only public repos work without login.");
  }
  if (res.status === 409) {
    throw new HttpError(404, "repo_empty", "That repo is empty: it has no commits yet.");
  }
  if (res.status === 422) {
    throw new HttpError(404, "not_found", "GitHub could not find that commit or path in this repo.");
  }
  if (res.status === 403 || res.status === 429) {
    throw new HttpError(429, "github_limit", "GitHub's rate limit was reached. Try an example, or retry in a few minutes.");
  }
  if (!res.ok) {
    console.error("github status", res.status, path.split("?")[0]); // 401 here means the GITHUB_TOKEN secret is wrong or expired
    throw new HttpError(502, "github_error", "GitHub did not answer. Please try again.");
  }
  return res;
}

export interface RepoMeta {
  fullName: string;
  description: string | null;
  stars: number;
  language: string | null;
  defaultBranch: string;
  url: string;
}

export async function getMeta(env: GhEnv, repo: string): Promise<RepoMeta> {
  const d = (await (await gh(env, `/repos/${repo}`)).json()) as Record<string, any>;
  if (d.private) throw new HttpError(404, "repo_not_found", "That repo is private. Only public repos work without login.");
  return {
    fullName: d.full_name,
    description: d.description,
    stars: d.stargazers_count,
    language: d.language,
    defaultBranch: d.default_branch,
    url: d.html_url,
  };
}

export async function getHeadSha(env: GhEnv, repo: string, branch: string): Promise<string> {
  const d = (await (await gh(env, `/repos/${repo}/commits/${encodeURIComponent(branch)}`)).json()) as { sha: string };
  return d.sha;
}

export interface TreeEntry {
  path: string;
  size: number;
}

export async function getTree(env: GhEnv, repo: string, sha: string): Promise<{ files: TreeEntry[]; truncated: boolean }> {
  const d = (await (await gh(env, `/repos/${repo}/git/trees/${sha}?recursive=1`)).json()) as {
    tree: { path: string; type: string; size?: number }[];
    truncated: boolean;
  };
  const files = d.tree.filter((e) => e.type === "blob").map((e) => ({ path: e.path, size: e.size ?? 0 }));
  return { files, truncated: d.truncated };
}

export async function getFile(env: GhEnv, repo: string, path: string, sha: string, maxChars: number): Promise<string> {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  const text = await (await gh(env, `/repos/${repo}/contents/${encoded}?ref=${sha}`, "application/vnd.github.raw")).text();
  return text.slice(0, maxChars);
}

export interface CommitSummary {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export async function listCommits(env: GhEnv, repo: string, path?: string, perPage = 15): Promise<CommitSummary[]> {
  const q = new URLSearchParams({ per_page: String(perPage) });
  if (path) q.set("path", path);
  const d = (await (await gh(env, `/repos/${repo}/commits?${q}`)).json()) as Record<string, any>[];
  return d.map((c) => ({
    sha: c.sha,
    message: String(c.commit.message).split("\n")[0],
    author: c.commit.author?.name ?? "unknown",
    date: c.commit.author?.date ?? "",
  }));
}

export interface CommitDetail {
  message: string;
  files: { path: string; patch: string }[];
}

export async function getCommit(env: GhEnv, repo: string, sha: string): Promise<CommitDetail> {
  const d = (await (await gh(env, `/repos/${repo}/commits/${sha}`)).json()) as Record<string, any>;
  return {
    message: d.commit.message,
    files: (d.files ?? []).map((f: Record<string, any>) => ({ path: f.filename, patch: f.patch ?? "" })),
  };
}

// --- Key-file selection: which few files tell the story of a repo --------------------------

const IGNORED = /(^|\/)(node_modules|vendor|dist|build|out|\.git|\.next|coverage|__pycache__|\.venv|target)\//;
const NOISE = /(\.lock|package-lock\.json|pnpm-lock\.yaml|\.min\.(js|css)|\.map|\.(png|jpe?g|gif|svg|ico|webp|woff2?|ttf|eot|pdf|zip|mp[34]|mov))$/i;
const SCORES: [RegExp, number][] = [
  [/^readme(\.\w+)?$/i, 100],
  [/(^|\/)(package\.json|pyproject\.toml|requirements\.txt|cargo\.toml|go\.mod|gemfile|pom\.xml|composer\.json)$/i, 90],
  [/(^|\/)(wrangler\.\w+|vercel\.json|netlify\.toml|dockerfile|docker-compose\.ya?ml|next\.config\.\w+|vite\.config\.\w+)$/i, 70],
  [/(^|\/)(schema|models?)\.\w+$|\.prisma$|(^|\/)migrations?\/|\.sql$/i, 65],
  [/(routes?|router|api|controllers?|handlers?)(\.|\/)/i, 60],
  [/(^|\/)(index|main|app|server)\.\w+$/i, 55],
];

export function isReadable(path: string, size: number): boolean {
  return !IGNORED.test(path) && !NOISE.test(path) && size < 100_000;
}

export function pickKeyFiles(files: TreeEntry[], limit = 12): string[] {
  const scored = files
    .filter((f) => isReadable(f.path, f.size))
    .map((f) => ({ path: f.path, score: Math.max(0, ...SCORES.filter(([re]) => re.test(f.path)).map(([, s]) => s)) - f.path.split("/").length * 3 }))
    .filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((f) => f.path);
}

