import { z } from "zod";
import { conceptList, rules, type Level } from "./common.ts";

export const schema = z.object({
  answer: z.string().min(1),
  files: z.array(z.string()).transform((f) => f.slice(0, 5)),
  concepts: conceptList,
  followUps: z.array(z.string()).transform((f) => f.slice(0, 3)),
});

export interface Turn {
  role: "user" | "assistant";
  text: string;
}

/** Repo facts come from our own cached overview (trusted shape, untrusted text); the plan, history and question are user content. */
export function build(context: string, history: Turn[], question: string, level: Level) {
  const system = `You are a patient senior engineer answering questions about ONE project for someone who builds with AI. Use only the project material below. If it does not say, answer "I can't tell from what Lumen has seen" and suggest what to check. Keep answers under 150 words, concrete, no filler. List up to 5 file paths from the material that support the answer in "files", and up to 3 short follow-up questions the person might ask next in "followUps".
${rules(level)}
Schema: {"answer":string,"files":string[],"concepts":conceptId[],"followUps":string[]}`;
  const chat = history.map((t) => `${t.role}: ${t.text}`).join("\n");
  const user = `<user_content>\nProject material:\n${context}\n\nConversation so far:\n${chat || "(none)"}\n\nQuestion: ${question}\n</user_content>`;
  return { system, user, schema, maxTokens: 900 };
}
