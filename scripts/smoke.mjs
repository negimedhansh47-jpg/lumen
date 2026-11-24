// Smoke test: node scripts/smoke.mjs [base-url]. Exits 1 if any check fails.
const base = (process.argv[2] ?? "http://localhost:8799").replace(/\/$/, "");
const results = [];

async function check(name, fn) {
  const t = Date.now();
  try {
    await fn();
    results.push(`PASS ${name} (${((Date.now() - t) / 1000).toFixed(1)}s)`);
  } catch (e) {
    results.push(`FAIL ${name}: ${e.message}`);
  }
}

const must = (cond, msg) => { if (!cond) throw new Error(msg); };
const call = (path, body) => fetch(base + path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {});

for (const page of ["/", "/chat", "/repo", "/kickoff", "/project", "/concepts", "/js/steps.js", "/js/project-store.js", "/js/commits.js", "/concepts/concepts.json", "/demo/index.json", "/css/components.css", "/js/shell.js"]) {
  await check(`GET ${page}`, async () => must((await call(page)).status === 200, "not 200"));
}
await check("health", async () => must((await (await call("/api/health")).json()).ok === true, "ok not true"));
await check("404 on unknown API route", async () => must((await call("/api/nope")).status === 404, "not 404"));
await check("rejects short chat", async () => must((await call("/api/chat/review", { chat: "hi", level: "beginner" })).status === 400, "not 400"));
await check("rejects non-github repo", async () => must((await call("/api/repo/overview?repo=" + encodeURIComponent("https://evil.com/a/b"))).status === 400, "not 400"));
// Regression checks from the 2026-11-23 QA pass (none of these reach the model)
await check("bad level is 400, not 500", async () => must((await call("/api/repo/overview?repo=a/b&level=expert")).status === 400, "not 400"));
await check("whitespace-only chat is 400", async () => must((await call("/api/chat/review", { chat: " ".repeat(25) })).status === 400, "not 400"));
for (const type of ["text/plain", "text/plain; application/json"]) {
  await check(`content type "${type}" is 415`, async () => must((await fetch(base + "/api/chat/review", { method: "POST", headers: { "content-type": type }, body: JSON.stringify({ chat: "x".repeat(30) }) })).status === 415, "not 415"));
}
await check("dot-dot repo segment is 400", async () => must((await call("/api/repo/commits?repo=" + encodeURIComponent("../users"))).status === 400, "not 400"));
await check("unknown page is an HTML 404", async () => { const r = await call("/no-such-page"); must(r.status === 404 && r.headers.get("content-type")?.includes("text/html"), `${r.status} ${r.headers.get("content-type")}`); });
await check("unknown API route stays JSON", async () => must((await call("/api/nope")).headers.get("content-type")?.includes("application/json"), "not JSON"));
await check("AI: chat review", async () => {
  const chat = "User: make me a todo app\nAssistant: Here is a todo app in React.\nUser: it's broken fix it\nAssistant: Which part is broken?";
  const res = await call("/api/chat/review", { chat, level: "beginner" });
  const d = await res.json();
  must(res.status === 200, `status ${res.status}: ${JSON.stringify(d)}`);
  must(d.items.length > 0, "no items");
  const ids = new Set(d.items.map((i) => i.excerpt.toLowerCase()));
  must(ids.size === d.items.length, "duplicate excerpts");
});
await check("AI: kickoff", async () => {
  const res = await call("/api/kickoff", { idea: "A habit tracker for students with weekly reminders", level: "beginner" });
  const d = await res.json();
  must(res.status === 200, `status ${res.status}: ${JSON.stringify(d)}`);
  must(d.decisions?.length >= 3 && d.agentsMd?.startsWith("# AGENTS.md"), "missing decisions or agentsMd");
  must(d.decisions.every((x) => !x.alternatives.some((a) => a.name.toLowerCase() === x.pick.toLowerCase())), "a pick is repeated as an alternative");
});

await check("rejects unknown concept", async () => must((await call("/api/concept/explain", { id: "nope", level: "beginner" })).status === 404, "not 404"));
await check("AI: explain concept better", async () => {
  const res = await call("/api/concept/explain", { id: "cache", level: "beginner" });
  const d = await res.json();
  must(res.status === 200, `status ${res.status}: ${JSON.stringify(d)}`);
  must(d.plainer && d.example && d.check?.question, "missing fields");
});

await check("ask: rejects no context", async () => must((await call("/api/project/ask", { question: "what is this?" })).status === 400, "not 400"));
await check("ask: repo with no cached map is 409", async () => must((await call("/api/project/ask", { question: "what is this?", repo: "nobody-here/no-such-repo-xyz" })).status === 409, "not 409"));
await check("AI: ask about a plan", async () => {
  const plan = { restatement: "A habit tracker for students", firstSteps: ["Pick a stack", "Build the login page"] };
  const res = await call("/api/project/ask", { question: "What should I do first?", plan, level: "beginner" });
  const d = await res.json();
  must(res.status === 200, `status ${res.status}: ${JSON.stringify(d)}`);
  must(d.answer && Array.isArray(d.followUps), "missing answer");
});

console.log(results.join("\n"));
process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
