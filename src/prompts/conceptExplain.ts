import { z } from "zod";
import { rules, type Level } from "./common.ts";

export const VERSION = "conceptExplain-v1";

export const schema = z.object({
  plainer: z.string(),
  example: z.string(),
  check: z.object({ question: z.string(), answer: z.string() }),
});

export interface ConceptCard {
  id: string;
  name: string;
  oneLine: string;
  explain: string;
  analogy: string;
}

/** The card is our own reviewed text, so it goes in as trusted material, not user content. */
export function build(card: ConceptCard, level: Level) {
  const system = `You are a patient teacher. A learner read the concept card below and did not understand it. Explain the same idea again, differently:
- "plainer": 3 to 5 short sentences in everyday words, building up step by step. Do not repeat the card's sentences or its analogy.
- "example": one concrete example from a small web app (a to-do list, a blog, a shop), saying what would happen with and without this idea.
- "check": one simple question the learner can answer to test themselves, and its short answer.
Stay accurate. Do not contradict the card.
${rules(level)}
Schema: {"plainer":string,"example":string,"check":{"question":string,"answer":string}}`;
  const user = `Concept: ${card.name}\nIn one line: ${card.oneLine}\nCard text: ${card.explain}\nCard analogy: ${card.analogy}`;
  return { system, user, schema, maxTokens: 900 };
}
