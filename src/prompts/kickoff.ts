import { z } from "zod";
import { conceptList, rules, type Level } from "./common.ts";

export const VERSION = "kickoff-v2";

const lines = (max: number) => z.array(z.string()).transform((a) => a.slice(0, max));
// A plain string (older answer shape) becomes an alternative without a "better when" note.
const alternative = z.union([z.string().transform((name) => ({ name, betterWhen: "" })), z.object({ name: z.string(), betterWhen: z.string().catch("") })]);

export const schema = z.object({
  restatement: z.string(),
  decisions: z.array(
    z.object({
      id: z.string(),
      question: z.string(),
      pick: z.string().catch(""),
      choice: z.string(),
      why: z.string(),
      tradeoffs: z.string(),
      alternatives: z.array(alternative).transform((a) => a.slice(0, 3)),
      concepts: conceptList,
    }),
  ).transform((list) =>
    list.slice(0, 6).map((d) => ({ ...d, alternatives: d.alternatives.filter((a) => a.name.trim().toLowerCase() !== d.pick.trim().toLowerCase()) })), // models sometimes repeat the pick as an "alternative"
  ),
  firstSteps: lines(6),
  stack: lines(8),
  structure: lines(12),
  rules: lines(8),
});

export function build(idea: string, level: Level) {
  const system = `You are a senior engineer helping a beginner start a new project. From their idea, restate it in one sentence, then explain 4 to 6 key decisions to make before writing code (for example: frontend approach, backend or hosting, where data lives, how users sign in, how to deploy). For each decision give the question, your recommended choice as a short name of 1 to 5 words ("pick", in the same style as the alternatives, for example "Supabase" or "Email and password"), the choice explained in one sentence, why, the trade-offs, and 2 real alternatives that are different from the pick, each with one sentence on when it would be the better choice. The person will guess between the pick and the alternatives, so make them comparable and never make the pick obvious from its wording. Prefer simple, popular, low-cost choices. Also give: first steps (max 6, small and concrete), the stack as short items, a project structure as short lines like "/src - server code", and 5 to 8 project rules for an AI coding assistant.
${rules(level)}
Schema: {"restatement":string,"decisions":[{"id":string,"question":string,"pick":string,"choice":string,"why":string,"tradeoffs":string,"alternatives":[{"name":string,"betterWhen":string}],"concepts":conceptId[]}],"firstSteps":string[],"stack":string[],"structure":string[],"rules":string[]}`;
  return { system, user: `<user_content>\n${idea}\n</user_content>`, schema, maxTokens: 3000 };
}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** AGENTS.md (read by most coding agents) is assembled from a fixed template; the model only fills the list fields. */
export function agentsMd(r: z.infer<typeof schema>): string {
  const list = (items: string[]) => items.map((i) => `- ${clean(i)}`).join("\n");
  return `# AGENTS.md

## What this is
${clean(r.restatement)}

## Stack
${list(r.stack)}

## Structure
${list(r.structure)}

## How to work
- Build one small step at a time. Explain the plan before changing many files.
- Commit after every working change with a clear message.
- Ask before adding a dependency. Prefer none.
- If something fails, say so plainly. Do not hide it.

## Rules
${list(r.rules)}

## Security
- Never commit secrets. Keep them in a gitignored env file and in the host's secret store.
- Validate all input. Never put user text into the page with innerHTML.
`;
}
