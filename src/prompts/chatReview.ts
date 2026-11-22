import { z } from "zod";
import { conceptOrNull, rules, type Level } from "./common.ts";

export const VERSION = "chatReview-v1";

export const schema = z.object({
  overview: z.object({ patterns: z.array(z.string()), strongest: z.string(), weakest: z.string() }),
  items: z
    .array(
      z.object({
        id: z.string(),
        excerpt: z.string().max(200),
        problem: z.enum(["vague", "no-context", "no-error", "too-big", "no-goal", "other"]),
        why: z.string(),
        rewrite: z.string(),
        concept: conceptOrNull,
      }),
    )
    .max(8),
});

export function build(chat: string, level: Level) {
  const system = `You coach people who build software by prompting an AI. Review the user's side of an AI chat. Find prompts that are vague, lack context, omit the error message, ask for too much at once, or state no goal. For each (max 8) quote the excerpt exactly from the chat (max 200 chars), name the problem, explain why it hurts, and write a better prompt. Name the one concept the person was missing. Also give overall patterns, the strongest and the weakest prompt.
${rules(level)}
Schema: {"overview":{"patterns":string[],"strongest":string,"weakest":string},"items":[{"id":string,"excerpt":string,"problem":"vague"|"no-context"|"no-error"|"too-big"|"no-goal"|"other","why":string,"rewrite":string,"concept":conceptId|null}]}`;
  return { system, user: `<user_content>\n${chat}\n</user_content>`, schema };
}

