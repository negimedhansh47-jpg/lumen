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

for (const page of ["/", "/chat", "/repo", "/kickoff", "/project", "/js/project-store.js", "/js/commits.js", "/concepts/concepts.json", "/demo/index.json", "/css/components.css", "/js/shell.js"]) {
  await check(`GET ${page}`, async () => must((await call(page)).status === 200, "not 200"));
}
await check("health", async () => must((await (await call("/api/health")).json()).ok === true, "ok not true"));
await check("404 on unknown API route", async () => must((await call("/api/nope")).status === 404, "not 404"));
await check("rejects short chat", async () => must((await call("/api/chat/review", { chat: "hi", level: "beginner" })).status === 400, "not 400"));
await check("rejects non-github repo", async () => must((await call("/api/repo/overview?repo=" + encodeURIComponent("https://evil.com/a/b"))).status === 400, "not 400"));
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
  must(d.decisions?.length >= 3 && d.claudeMd, "missing decisions or claudeMd");
});

await check("rejects unknown concept", async () => must((await call("/api/concept/explain", { id: "nope", level: "beginner" })).status === 404, "not 404"));
await check("AI: explain concept better", async () => {
  const res = await call("/api/concept/explain", { id: "cache", level: "beginner" });
  const d = await res.json();
  must(res.status === 200, `status ${res.status}: ${JSON.stringify(d)}`);
  must(d.plainer && d.example && d.check?.question, "missing fields");
});

console.log(results.join("\n"));
process.exit(results.some((r) => r.startsWith("FAIL")) ? 1 : 0);
