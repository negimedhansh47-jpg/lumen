import { HttpError } from "./validate.ts";

export interface LimitEnv {
  DB: D1Database;
  IP_SALT?: string;
  DAILY_LLM_CAP?: string;
}

const PER_IP_PER_HOUR = 30;
const HOUR = 3_600_000;
const DAY = 86_400_000;

async function hash(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const BUMP =
  "INSERT INTO rate_limits (ip_hash, window, count) VALUES (?, ?, 1) ON CONFLICT (ip_hash, window) DO UPDATE SET count = count + 1 RETURNING count";

/** Call before every uncached LLM call: a per-IP hourly counter, then a global daily kill switch. */
export async function spendLlmCall(env: LimitEnv, req: Request): Promise<void> {
  const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
  const ipHash = await hash(`${env.IP_SALT ?? "dev"}:${ip}`);
  const now = Date.now();
  const perIp = await env.DB.prepare(BUMP).bind(ipHash, Math.floor(now / HOUR)).first<{ count: number }>();
  // Checked before touching the global counter, so one visitor's refused calls cannot use up everyone's daily cap.
  if ((perIp?.count ?? 0) > PER_IP_PER_HOUR) {
    throw new HttpError(429, "rate_limited", "You have used your hourly limit. Try the examples, or come back in a while.");
  }
  const [global] = await env.DB.batch<{ count: number }>([
    env.DB.prepare(BUMP).bind("global", -Math.floor(now / DAY)), // negative window keeps daily rows apart from hourly ones
    env.DB.prepare("DELETE FROM rate_limits WHERE (window > 0 AND window < ?) OR (window < 0 AND window > ?)").bind(Math.floor(now / HOUR) - 2, -Math.floor(now / DAY) + 2), // expired counters
  ]);
  if ((global.results[0]?.count ?? 0) > Number(env.DAILY_LLM_CAP ?? 1500)) {
    throw new HttpError(503, "capacity", "Demo capacity reached. Try the examples.");
  }
}
