import { z } from "zod";

export interface LlmEnv {
  NVIDIA_API_KEY?: string;
  LLM_MODEL?: string;
  AI?: Ai;
}

export class LlmError extends Error {}

const NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const FALLBACK_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const TIMEOUT_MS = 30_000; // big repo overviews legitimately take 20+ s

export interface Call<T> {
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxTokens?: number;
}

/** Extract the first balanced JSON object (models add fences or trailing text). */
function parseJson(text: string): unknown {
  const start = text.indexOf("{");
  if (start < 0) throw new LlmError("No JSON in model output");
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return JSON.parse(text.slice(start, i + 1).replaceAll("\\'", "'")); // models emit invalid \' escapes
  }
  throw new LlmError("Unterminated JSON in model output");
}

async function nim(env: LlmEnv, { system, user, maxTokens = 2000 }: Call<unknown>): Promise<string> {
  if (!env.NVIDIA_API_KEY) throw new LlmError("NVIDIA_API_KEY is not set");
  const res = await fetch(NIM_URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.NVIDIA_API_KEY}` },
    body: JSON.stringify({
      model: env.LLM_MODEL,
      temperature: 0.2,
      max_tokens: maxTokens,
      chat_template_kwargs: { enable_thinking: false }, // reasoning models otherwise spend the budget thinking
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new LlmError(`NIM ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

async function workersAi(env: LlmEnv, { system, user, maxTokens = 2000 }: Call<unknown>): Promise<string> {
  if (!env.AI) throw new LlmError("Workers AI binding missing");
  const run = env.AI.run(FALLBACK_MODEL as keyof AiModels, {
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    max_tokens: maxTokens,
    temperature: 0.2,
  } as never);
  const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new LlmError("Workers AI timed out")), TIMEOUT_MS));
  const out = (await Promise.race([run, timeout])) as { response?: unknown };
  // Workers AI may return an already-parsed object instead of text.
  return typeof out.response === "string" ? out.response : JSON.stringify(out.response ?? "");
}

async function attempt<T>(ask: () => Promise<string>, schema: z.ZodType<T>): Promise<T> {
  return schema.parse(parseJson(await ask()));
}

/** NIM, retry once, then Workers AI, then a friendly error. */
export async function callLLM<T>(env: LlmEnv, call: Call<T>): Promise<T> {
  const providers = [() => nim(env, call), () => nim(env, call), () => workersAi(env, call)];
  const started = Date.now();
  for (const [i, ask] of providers.entries()) {
    if (i === 1 && Date.now() - started > TIMEOUT_MS / 2) continue; // NIM is slow, not flaky: retrying would only add another long wait
    try {
      return await attempt(ask, call.schema);
    } catch (e) {
      console.error(`llm attempt ${i} failed:`, String((e as Error).message).slice(0, 300)); // model/provider error only, never user content
    }
  }
  throw new LlmError("The explainer is busy right now. Please try again in a moment.");
}

export async function callOnce<T>(env: LlmEnv, provider: "nim" | "workers-ai", call: Call<T>) {
  return attempt(() => (provider === "nim" ? nim(env, call) : workersAi(env, call)), call.schema);
}
