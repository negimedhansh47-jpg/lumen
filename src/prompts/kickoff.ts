import { z } from "zod";
import { conceptList, rules, type Level } from "./common.ts";

export const VERSION = "kickoff-v3";

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
  const system = `You are a senior engineer helping a beginner start a new project. From their idea, restate it in one sentence. Then work out what makes THIS idea hard or special (for example: an AI assistant needs a model, voice input and output, memory and safe limits on the actions it can take; a game needs a game loop; a marketplace needs payments) and explain 4 to 6 key decisions to make before writing code. At least half of the decisions must be about that core, and they come first. Use generic decisions (frontend, hosting, where data lives, sign-in, deploy) only when this idea really needs them, and skip sign-in when only one person uses it. Every pick must satisfy the constraints the idea states (for example "any device" rules out something that only runs on a laptop); say how in "why". For each decision give the question, your recommended choice as a short name of 1 to 5 words ("pick", in the same style as the alternatives, for example "Supabase" or "Email and password"), the choice explained in one sentence, why, the trade-offs, and 2 real alternatives that are different from the pick, each with one sentence on when it would be the better choice. The person will guess between the pick and the alternatives, so make them comparable and never make the pick obvious from its wording. Prefer simple, popular, low-cost choices. Also give: first steps (max 6, small and concrete), the stack as short items, a project structure as short lines like "/src - server code", and 5 to 8 project rules for an AI coding assistant. The stack and structure may only use what your decisions picked: never add a library, framework or folder (for example an ORM or an auth library) that no decision chose.
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
- API keys (for an AI model or any paid service) live only on a server or serverless function, never in browser code. If the plan has no backend, add the smallest one that can hold the key, and say so.
- Validate all input. Never put user text into the page with innerHTML.
`;
}
