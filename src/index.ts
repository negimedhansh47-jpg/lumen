export interface Env {
  DB: D1Database;
}

type Handler = (req: Request, env: Env) => Response | Promise<Response>;

const routes: Record<string, Handler> = {
  "GET /api/health": () => Response.json({ ok: true }),
};

function notFound(): Response {
  return Response.json({ error: { code: "not_found", message: "No such API route." } }, { status: 404 });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(req.url);
    const handler = routes[`${req.method} ${pathname}`];
    if (handler) return handler(req, env);
    return notFound();
  },
} satisfies ExportedHandler<Env>;

