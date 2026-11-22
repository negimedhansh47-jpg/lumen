import { ApiError, api, demo } from "../api.js";
import { conceptChips, loadConcepts } from "../concepts.js";
import { renderMap } from "../map.js";
import { emptyBox, errorBox, h, loading, para, setBusy } from "../render.js";
import { getLevel, mountShell } from "../shell.js";

mountShell("/repo");

const form = document.getElementById("form");
const input = document.getElementById("repo");
const run = document.getElementById("run");
const results = document.getElementById("results");

// A "source" supplies commits and explanations. Live repos call the API; demos read pre-generated files.
const liveSource = (repo) => ({
  commits: () => api(`/api/repo/commits?repo=${encodeURIComponent(repo)}`),
  moduleCommits: (m) => api(`/api/repo/commits?repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(m.paths[0] ?? m.evidence[0].path)}`),
  explain: (sha) => api("/api/commit/explain", { repo, sha, level: getLevel() }),
});
const demoSource = (data) => ({
  commits: async () => data.commits,
  moduleCommits: async (m) => data.moduleCommits?.[m.id] ?? [],
  explain: async (sha) => {
    if (data.explanations?.[sha]) return data.explanations[sha];
    throw new ApiError("demo", "This example only includes explanations for a few commits. Analyze the repo live to explain any commit.");
  },
});

// ---------- Commit explanations ----------

const list = (items) => h("ul", {}, items.map((i) => h("li", {}, i)));
const section = (title, body) => h("div", {}, h("h4", {}, title), body);

function explanation(e) {
  return h(
    "div",
    { class: "explain rise" },
    h("p", {}, h("strong", {}, e.title)),
    section("What changed", para(e.whatChanged)),
    section("Why it matters", para(e.whyItMatters)),
    section("The design reasoning", para(e.designReasoning)),
    section("Trade-offs", para(e.tradeoffs)),
    e.alternatives.length ? section("Alternatives", list(e.alternatives)) : null,
    e.evidence.length ? section("Evidence", h("ul", { class: "evidence" }, e.evidence.map((v) => h("li", {}, `${v.path}: ${v.hint}`)))) : null,
    conceptChips(e.concepts),
  );
}

function commitRow(c, source, mini = false) {
  const slot = h("div");
  const button = h("button", { type: "button", class: "btn ghost small" }, "Explain");
  button.addEventListener("click", async () => {
    setBusy(button, true, "Explain", "Explaining...");
    slot.replaceChildren(loading("Reading the diff. This usually takes 5 to 15 seconds.", 4));
    try {
      slot.replaceChildren(explanation(await source.explain(c.sha)));
      button.remove();
    } catch (e) {
      slot.replaceChildren(errorBox(e.message));
      setBusy(button, false, "Explain", "Explaining...");
    }
  });
  const date = c.date ? new Date(c.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
  return h(
    "div",
    { class: mini ? "" : "commit" },
    h("div", { class: "commit-top" }, h("span", { class: "commit-msg" }, c.message), button),
    h("div", { class: "commit-meta" }, h("code", {}, c.sha.slice(0, 7)), ` · ${c.author} · ${date}`),
    slot,
  );
}

async function fillCommits(target, fetcher, source, mini) {
  target.replaceChildren(loading("Loading commits...", 3));
  try {
    const commits = await fetcher();
    target.replaceChildren(...(commits.length ? commits.map((c) => commitRow(c, source, mini)) : [emptyBox("No commits found for this.")]));
  } catch (e) {
    target.replaceChildren(errorBox(e.message));
  }
}

// ---------- Drawer ----------

function makeDrawer(source, onClose) {
  const title = h("h3");
  const layer = h("span", { class: "badge" });
  const body = h("div", { class: "drawer-body" });
  const closeBtn = h("button", { type: "button", class: "close", "aria-label": "Close details" }, "×");
  const drawer = h("aside", { class: "drawer", role: "dialog", "aria-modal": "false", "aria-label": "Module details", "aria-hidden": "true" }, h("div", { class: "drawer-head" }, h("div", {}, layer, title), closeBtn), body);
  const scrim = h("div", { class: "scrim" });
  let opener = null;

  function close() {
    drawer.classList.remove("open");
    scrim.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    onClose();
    opener?.focus();
  }
  closeBtn.addEventListener("click", close);
  scrim.addEventListener("click", close);
  document.addEventListener("keydown", (e) => e.key === "Escape" && drawer.classList.contains("open") && close());

  function open(m) {
    opener = document.activeElement;
    title.textContent = m.name;
    layer.textContent = m.layer;
    layer.className = `badge layer-${m.layer}`;
    const commitsSlot = h("div", { class: "mini" });
    const seeCommits = h("button", { type: "button", class: "btn ghost small", onclick: () => { seeCommits.remove(); fillCommits(commitsSlot, () => source.moduleCommits(m), source, true); } }, "See commits touching this");
    body.replaceChildren(
      section("Role", para(m.role)),
      section("Why it exists", para(m.whyItExists)),
      m.concepts.length ? section("Concepts", conceptChips(m.concepts)) : null,
      section("Evidence", h("ul", { class: "evidence" }, m.evidence.map((v) => h("li", {}, v.lines ? `${v.path}:${v.lines}` : v.path)))),
      h("div", {}, seeCommits, commitsSlot),
    );
    body.scrollTop = 0;
    drawer.classList.add("open");
    scrim.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    closeBtn.focus();
  }
  document.body.append(scrim, drawer);
  return { open, close };
}

// ---------- Page ----------

let drawerHandle;

function render(o, source) {
  drawerHandle?.close();
  document.querySelectorAll(".drawer, .scrim").forEach((el) => el.remove());

  const map = o.modules.length ? renderMap(o.modules, o.edges, (m) => drawerHandle.open(m)) : null;
  drawerHandle = makeDrawer(source, () => map?.select(null));

  const commitsSlot = h("div", { class: "commits" });
  const head = h(
    "section",
    { class: "card repo-head rise" },
    h("h2", {}, h("a", { href: o.meta.url, rel: "noopener" }, o.meta.fullName)),
    o.meta.description ? h("p", { class: "muted", style: "margin:0" }, o.meta.description) : null,
    h("div", { class: "chips" }, o.stack.map((s) => h("span", { class: "chip" }, s))),
    para(o.summary, { style: "margin:0" }),
    h("p", { class: "hint", style: "margin:0" }, `Analyzed ${o.meta.analyzed} key files of ${o.meta.total}${o.meta.truncated ? " (very large repo: the file list was cut off by GitHub)" : ""}.`),
  );
  const mapSection = h(
    "section",
    {},
    h("h2", { style: "margin-bottom: var(--s5)" }, "Architecture map"),
    map ? map.el : emptyBox("Lumen could not ground any modules in this repo's files, so it shows none rather than guess."),
    map ? h("p", { class: "map-hint" }, "Tap a box for its role, evidence and commits. Hover a line to see how modules connect.") : null,
  );
  results.replaceChildren(head, mapSection, h("section", {}, h("h2", { style: "margin-bottom: var(--s4)" }, "Recent commits"), commitsSlot));
  fillCommits(commitsSlot, source.commits, source, false);
}

async function load(repo) {
  input.value = repo;
  setBusy(run, true, "Map it", "Mapping...");
  results.replaceChildren(loading("Reading the repo and drawing the map. First time takes 15 to 30 seconds; repeat visits are instant.", 6, true));
  try {
    render(await api(`/api/repo/overview?repo=${encodeURIComponent(repo)}&level=${getLevel()}`), liveSource(repo));
    history.replaceState(null, "", `/repo?repo=${encodeURIComponent(repo)}`);
  } catch (e) {
    results.replaceChildren(errorBox(e.message, "Could not map that repo"));
  } finally {
    setBusy(run, false, "Map it", "Mapping...");
  }
}

async function loadDemo(id) {
  results.replaceChildren(loading("Loading example...", 5, true));
  try {
    const data = await demo(id);
    input.value = data.overview.meta.fullName;
    render(data.overview, demoSource(data)); // pre-generated: no model call
  } catch (e) {
    results.replaceChildren(errorBox(e.message));
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  load(input.value);
});

await loadConcepts();
let examples = [];
try {
  examples = await demo("index");
} catch {
  // no examples published: the form still works
}
const exampleRow = document.getElementById("examples");
if (examples.length) exampleRow.append(...examples.map((x) => h("button", { type: "button", class: "btn ghost small", onclick: () => loadDemo(x.id) }, x.label)));
else exampleRow.remove();

const params = new URLSearchParams(location.search);
if (params.get("repo")) load(params.get("repo"));
else if (params.has("example") && examples.length) loadDemo(examples[0].id);
