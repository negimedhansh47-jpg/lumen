// Step 1 feasibility harness. Usage:
//   node scripts/llm-test.ts models
//   node scripts/llm-test.ts run <model> [<model>...]
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { callOnce } from "../src/llm.ts";
import * as chatReview from "../src/prompts/chatReview.ts";
import * as commitExplain from "../src/prompts/commitExplain.ts";
import { chats } from "./samples.ts";

const vars = Object.fromEntries(
  readFileSync(".dev.vars", "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

if (process.argv[2] === "models") {
  const res = await fetch("https://integrate.api.nvidia.com/v1/models", { headers: { authorization: `Bearer ${vars.NVIDIA_API_KEY}` } });
  const { data } = (await res.json()) as { data: { id: string }[] };
  console.log(data.map((m) => m.id).join("\n"));
  process.exit(0);
}

const diff = execFileSync("git", ["show", "d6e6350", "--", ".", ":!package-lock.json"], { encoding: "utf8" }).slice(0, 12000);
const cases = [
  ...Object.entries(chats).map(([name, chat]) => ({ name: `chat:${name}`, call: chatReview.build(chat, "beginner") })),
  { name: "commit:d6e6350", call: commitExplain.build("Step 0: Worker with static assets, health route, D1 migration, docs", diff, "beginner") },
];

mkdirSync("scripts/out", { recursive: true });
for (const model of process.argv.slice(3)) {
  for (const c of cases) {
    const started = Date.now();
    try {
      const out = await callOnce({ NVIDIA_API_KEY: vars.NVIDIA_API_KEY, LLM_MODEL: model }, "nim", c.call as never);
      const ms = Date.now() - started;
      writeFileSync(`scripts/out/${model.replace(/\W/g, "_")}__${c.name.replace(/\W/g, "_")}.json`, JSON.stringify(out, null, 2));
      console.log(`OK   ${model} ${c.name} ${ms}ms`);
    } catch (e) {
      console.log(`FAIL ${model} ${c.name} ${Date.now() - started}ms ${(e as Error).message.slice(0, 160)}`);
    }
  }
}
