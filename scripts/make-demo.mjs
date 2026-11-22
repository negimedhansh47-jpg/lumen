// Regenerates public/demo/*.json by calling a running Worker (default: local `wrangler dev` on :8799).
// Usage: node scripts/make-demo.mjs [chat] [kickoff] [repos]   (no args = everything)
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:8799";
const REPOS = [
  { id: "lumen", repo: "negimedhansh47-jpg/lumen", label: "Lumen (this project)", explain: 4 },
  { id: "realworld", repo: "gothinkster/node-express-realworld-example-app", label: "Express blog API", explain: 3 },
];
const CHAT = `User: build me an app to track my expenses
AI: Sure! I'll set up a simple expense tracker with React and a small Express server. Here is the code...
User: it's not working
AI: Could you tell me what is happening? An error message or what you expected would help.
User: the page is blank. fix it
AI: A blank page often means a JavaScript error. Please open the browser console and share what it says.
User: idk how. just make it work and also add charts and login and dark mode
AI: That is a lot at once. Let's fix the blank page first, then add features one by one.
User: now it shows but when I add an expense and refresh it's gone
AI: The data lives in memory, so a refresh loses it. You need to store it somewhere permanent.
User: ok add a database`;
const IDEA = "A website where my gym friends log workouts and see a weekly leaderboard";

const pending = {};
const out = (name, data) => (pending[name] = data); // buffered: writing into public/ restarts `wrangler dev` mid-run
const flush = () => {
  mkdirSync("public/demo", { recursive: true });
  for (const [name, data] of Object.entries(pending)) {
    writeFileSync(`public/demo/${name}.json`, JSON.stringify(data, null, 1));
    console.log("wrote", name);
  }
};

async function call(path, body) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(BASE + path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : undefined);
    const data = await res.json();
    if (res.ok) return data;
    console.log(`  ${path} -> ${res.status} ${data.error?.message} (attempt ${attempt})`);
    if (res.status < 500) throw new Error(data.error?.message);
  }
  throw new Error(`${path} failed`);
}

async function makeRepo({ id, repo, explain }) {
  console.log("repo", repo);
  const enc = encodeURIComponent(repo);
  const overview = await call(`/api/repo/overview?repo=${enc}&level=beginner`);
  const commits = await call(`/api/repo/commits?repo=${enc}`);
  const moduleCommits = {};
  for (const m of overview.modules) moduleCommits[m.id] = await call(`/api/repo/commits?repo=${enc}&path=${encodeURIComponent(m.paths[0] ?? m.evidence[0].path)}`);
  const explanations = {};
  for (const c of commits.slice(0, explain)) {
    try {
      explanations[c.sha] = await call("/api/commit/explain", { repo, sha: c.sha, level: "beginner" });
    } catch (e) {
      console.log("  skipped", c.sha.slice(0, 7), e.message);
    }
  }
  out(id, { overview, commits, moduleCommits, explanations });
}

const want = process.argv.slice(2);
const todo = (k) => !want.length || want.includes(k);

if (todo("chat")) out("chat", { chat: CHAT, result: await call("/api/chat/review", { chat: CHAT, level: "beginner" }) });
if (todo("kickoff")) out("kickoff", { idea: IDEA, result: await call("/api/kickoff", { idea: IDEA, level: "beginner" }) });
if (todo("repos")) {
  const made = [];
  for (const r of REPOS) {
    try {
      await makeRepo(r);
      made.push(r);
    } catch (e) {
      console.log("  FAILED", r.repo, e.message);
    }
  }
  out("index", made.map(({ id, label }) => ({ id, label })));
}


flush();

