import { z } from "zod";
import { CONCEPT_IDS, rules, type Level } from "./common.ts";

export const VERSION = "commitExplain-v1";

export const schema = z.object({
  title: z.string(),
  whatChanged: z.string(),
  whyItMatters: z.string(),
  designReasoning: z.string(),
  tradeoffs: z.string(),
  alternatives: z.array(z.string()),
  concepts: z.array(z.enum(CONCEPT_IDS)),
  evidence: z.array(z.object({ path: z.string(), hint: z.string() })),
});

export function build(message: string, diff: string, level: Level) {
  const system = `You teach software engineering. Explain one git commit in plain English: what changed, why it matters, the system-design reasoning, trade-offs, and alternatives. Ground every claim in the diff.
${rules(level)}
Schema: {"title":string,"whatChanged":string,"whyItMatters":string,"designReasoning":string,"tradeoffs":string,"alternatives":string[],"concepts":conceptId[],"evidence":[{"path":string,"hint":string}]}`;
  return { system, user: `<user_content>\nCommit message: ${message}\n\nDiff:\n${diff}\n</user_content>`, schema };
}
