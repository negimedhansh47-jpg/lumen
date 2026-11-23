import { commits, explainCommit, kickoffHandler, overview, reviewChat, type Env } from "./handlers.ts";
import { LlmError } from "./llm.ts";
import { HttpError } from "./validate.ts";

type Handler = (req: Request, env: Env) => Response | Promise<Response>;

const routes: Record<string, Handler> = {
  "GET /api/health": () => Response.json({ ok: true }),
  "POST /api/chat/review": reviewChat,
  "GET /api/repo/overview": overview,
  "GET /api/repo/commits": commits,
  "POST /api/commit/explain": explainCommit,
  "POST /api/kickoff": kickoffHandler,
};

function fail(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

async function handle(req: Request, env: Env): Promise<Response> {
  const handler = routes[`${req.method} ${new URL(req.url).pathname}`];
  if (!handler) return fail(404, "not_found", "No such API route.");
  try {
    return await handler(req, env);
  } catch (e) {
    if (e instanceof HttpError) return fail(e.status, e.code, e.message);
    if (e instanceof LlmError) return fail(502, "llm_failed", e.message);
    if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) return fail(502, "github_error", "GitHub was too slow to answer. Please try again."); // timeout while reading a response body
    console.error("unhandled", e instanceof Error ? e.message : "unknown"); // never log user content
    return fail(500, "server_error", "Something went wrong on our side. Please try again.");
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const res = await handle(req, env);
    res.headers.set("x-content-type-options", "nosniff"); // static assets get this from _headers; API responses need it here
    return res;
  },
} satisfies ExportedHandler<Env>;
