import { z } from "zod";
import { conceptList, rules, type Level } from "./common.ts";

export const VERSION = "repoOverview-v1";

export const schema = z.object({
  stack: z.array(z.string()).transform((s) => s.slice(0, 8)),
  summary: z.string(),
  modules: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      paths: z.array(z.string()),
      layer: z.enum(["ui", "api", "logic", "data", "external", "config"]).catch("logic"),
      role: z.string(),
      whyItExists: z.string(),
      concepts: conceptList,
      evidence: z.array(z.object({ path: z.string(), lines: z.string().optional() })),
    }),
  ),
  edges: z.array(z.object({ from: z.string(), to: z.string(), label: z.string() })),
});

export function build(meta: { fullName: string; description: string | null }, paths: string[], files: Record<string, string>, level: Level) {
  const system = `You teach software architecture. Given a public repo's file list and key files, map it into 4 to 9 modules (a module is a part of the system: e.g. "Web pages", "API routes", "Database", "Payment provider"). For each module give: a short id, a name, the repo paths it covers, a layer (ui, api, logic, data, external for third-party services, config), its role in one sentence, why it exists (the design reason, teach it), up to 3 concepts, and evidence: at least one file path taken from the provided file list, with a line range only if you saw those lines. Then give edges (which module calls or depends on which, with a 1-3 word label), a stack list and a 2 sentence summary.
${rules(level)}
Schema: {"stack":string[],"summary":string,"modules":[{"id":string,"name":string,"paths":string[],"layer":"ui"|"api"|"logic"|"data"|"external"|"config","role":string,"whyItExists":string,"concepts":conceptId[],"evidence":[{"path":string,"lines":"12-30"?}]}],"edges":[{"from":moduleId,"to":moduleId,"label":string}]}`;
  const fileBlocks = Object.entries(files).map(([p, c]) => `--- ${p}\n${c}`).join("\n\n");
  const user = `<user_content>\nRepo: ${meta.fullName}\nDescription: ${meta.description ?? "none"}\n\nFile list:\n${paths.join("\n")}\n\nKey files:\n${fileBlocks}\n</user_content>`;
  return { system, user, schema, maxTokens: 3500 };
}
