import { z } from "zod";

export interface LlmEnv {
  NVIDIA_API_KEY?: string;
  LLM_MODEL?: string;
  AI?: Ai;
}

export class LlmError extends Error {}

const NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const FALLBACK_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const TIMEOUT_MS = 25_000;

interface Call<T> {
  system: string;
  user: string;
  schema: z.ZodType<T>;
}

/** Extract the first JSON object from model text (models sometimes wrap it in fences). */
function parseJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new LlmError("No JSON in model output");
  return JSON.parse(text.slice(start, end + 1));
}

async function nim(env: LlmEnv, system: string, user: string): Promise<string> {
  if (!env.NVIDIA_API_KEY) throw new LlmError("NVIDIA_API_KEY is not set");
  const res = await fetch(NIM_URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.NVIDIA_API_KEY}` },
    body: JSON.stringify({
      model: env.LLM_MODEL,
      temperature: 0.2,
      max_tokens: 2000,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new LlmError(`NIM ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

async function workersAi(env: LlmEnv, system: string, user: string): Promise<string> {
  if (!env.AI) throw new LlmError("Workers AI binding missing");
  const out = (await env.AI.run(FALLBACK_MODEL as keyof AiModels, {
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    max_tokens: 2000,
    temperature: 0.2,
  } as never)) as { response?: string };
  return out.response ?? "";
}

async function attempt<T>(ask: () => Promise<string>, schema: z.ZodType<T>): Promise<T> {
  return schema.parse(parseJson(await ask()));
}

/** NIM, retry once, then Workers AI, then a friendly error. */
export async function callLLM<T>(env: LlmEnv, { system, user, schema }: Call<T>): Promise<T> {
  const providers = [() => nim(env, system, user), () => nim(env, system, user), () => workersAi(env, system, user)];
  for (const ask of providers) {
    try {
      return await attempt(ask, schema);
    } catch {
      // try the next provider
    }
  }
  throw new LlmError("The explainer is busy right now. Please try again in a moment.");
}

export async function callOnce<T>(env: LlmEnv, provider: "nim" | "workers-ai", c: Call<T>) {
  const ask = provider === "nim" ? () => nim(env, c.system, c.user) : () => workersAi(env, c.system, c.user);
  return attempt(ask, c.schema);
}
