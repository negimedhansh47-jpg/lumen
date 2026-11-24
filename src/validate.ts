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
  // A JSON content type forces a CORS preflight, so other websites cannot make visitors' browsers spend the AI budget.
  // Compare the media type itself: "text/plain; application/json" contains the string but is still preflight-free.
  if (req.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new HttpError(415, "bad_type", "Send the request as JSON (content-type: application/json).");
  }
  const text = await req.text();
  if (text.length > MAX_BODY) throw new HttpError(413, "too_large", "That input is too large. Try a shorter one.");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new HttpError(400, "bad_json", "The request was not valid JSON.");
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new HttpError(400, "bad_input", humanIssue(parsed.error.issues[0]));
  return parsed.data;
}

/** Our schemas carry human messages; only zod's own type errors ("expected string, received undefined") need rewording. */
function humanIssue(issue: z.ZodIssue | undefined): string {
  if (!issue) return "Invalid input.";
  const field = issue.path.join(".");
  if (issue.code === "invalid_type") return field ? `"${field}" is missing or has the wrong type.` : "The request body must be a JSON object.";
  return issue.message;
}

/** Accepts owner/name or a github.com URL. Anything else is rejected (no other hosts, ever). */
export function parseRepo(input: string | null): string {
  const raw = (input ?? "").trim();
  const url = raw.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s?#]+)\/([^/\s?#]+)/i);
  const slug = (url ? `${url[1]}/${url[2]}` : raw).replace(/\/$/, "").replace(/\.git$/, "");
  // "." and ".." would be path segments: "../users" makes the URL api.github.com/users.
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(slug) || slug.split("/").some((s) => s === "." || s === "..")) {
    throw new HttpError(400, "bad_repo", "Enter a public GitHub repo as owner/name or a github.com link.");
  }
  return slug;
}

export function parseLevel(value: string | null): Level {
  const parsed = levelSchema.safeParse(value ?? undefined);
  if (!parsed.success) throw new HttpError(400, "bad_level", "Level must be beginner or intermediate.");
  return parsed.data;
}

export function parseSha(value: string): string {
  if (!/^[0-9a-f]{7,40}$/i.test(value)) throw new HttpError(400, "bad_sha", "That commit id is not valid.");
  return value.toLowerCase();
}
