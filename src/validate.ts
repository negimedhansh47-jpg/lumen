import { z } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const levelSchema = z.enum(["beginner", "intermediate"]).default("beginner");
export type Level = z.infer<typeof levelSchema>;

const MAX_BODY = 64 * 1024;

export async function readBody<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  const text = await req.text();
  if (text.length > MAX_BODY) throw new HttpError(413, "too_large", "That input is too large. Try a shorter one.");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new HttpError(400, "bad_json", "The request was not valid JSON.");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new HttpError(400, "bad_input", parsed.error.issues[0]?.message ?? "Invalid input.");
  return parsed.data;
}

/** Accepts owner/name or a github.com URL. Anything else is rejected (no other hosts, ever). */
export function parseRepo(input: string | null): string {
  const raw = (input ?? "").trim();
  const url = raw.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s?#]+)\/([^/\s?#]+)/i);
  const slug = (url ? `${url[1]}/${url[2].replace(/\.git$/, "")}` : raw).replace(/\/$/, "");
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(slug)) {
    throw new HttpError(400, "bad_repo", "Enter a public GitHub repo as owner/name or a github.com link.");
  }
  return slug;
}

export function parseLevel(value: string | null): Level {
  return levelSchema.parse(value ?? undefined);
}

export function parseSha(value: string): string {
  if (!/^[0-9a-f]{7,40}$/i.test(value)) throw new HttpError(400, "bad_sha", "That commit id is not valid.");
  return value.toLowerCase();
}
