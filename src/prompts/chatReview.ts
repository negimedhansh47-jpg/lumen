import { z } from "zod";
import { conceptOrNull, rules, type Level } from "./common.ts";

export const VERSION = "chatReview-v2";

export const schema = z.object({
  overview: z.object({ patterns: z.array(z.string()).transform((p) => p.slice(0, 5)), strongest: z.string(), weakest: z.string() }),
  items: z.array(
    z.object({
      excerpt: z.string().transform((s) => s.slice(0, 200)),
      problem: z.enum(["vague", "no-context", "no-error", "too-big", "no-goal", "other"]).catch("other"),
      why: z.string(),
      rewrite: z.string(),
      concept: conceptOrNull,
    }),
  ),
});

export function build(chat: string, level: Level) {
  const system = `You coach people who build software by prompting an AI. Review the user's own prompts in an AI chat. Find prompts that are vague, lack context, omit the error message, ask for too much at once, or state no goal. For each (max 6) quote the excerpt EXACTLY from the chat (max 200 chars), name the problem, explain why it hurts, and write a better prompt. In rewrites never invent facts (file names, error text, versions): use placeholders like [paste the exact error here]. Name the one concept the person was missing. Also give overall patterns, the strongest prompt and the weakest prompt (quoted from the chat).
${rules(level)}
Schema: {"overview":{"patterns":string[],"strongest":string,"weakest":string},"items":[{"excerpt":string,"problem":"vague"|"no-context"|"no-error"|"too-big"|"no-goal"|"other","why":string,"rewrite":string,"concept":conceptId|null}]}`;
  return { system, user: `<user_content>\n${chat}\n</user_content>`, schema, maxTokens: 2500 };
}
