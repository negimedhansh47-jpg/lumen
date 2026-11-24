import { ApiError, api, demo } from "../api.js";
import { askPanel } from "../ask.js";
import { fillCommits, liveSource, section } from "../commits.js";
import { announceConcepts, conceptChips, loadConcepts } from "../concepts.js";
import { renderMap } from "../map.js";
import { load as loadProject, save as saveProject } from "../project-store.js";
import { emptyBox, errorBox, focusResults, h, loading, nextSteps, para, setBusy, toast } from "../render.js";
import { getLevel, guide, mountShell } from "../shell.js";
import { quiz, shuffle } from "../steps.js";

mountShell("/repo");

const form = document.getElementById("form");
const input = document.getElementById("repo");
const run = document.getElementById("run");
const results = document.getElementById("results");

const demoSource = (data) => ({
  commits: async () => data.commits,
  moduleCommits: async (m) => data.moduleCommits?.[m.id] ?? [],
  canExplain: (sha) => Boolean(data.explanations?.[sha]),
  explain: async (sha) => {
    if (data.explanations?.[sha]) return data.explanations[sha];
    throw new ApiError("demo", "This example only includes explanations for a few commits. Analyze the repo live to explain any commit.");
  },
});

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
    if (!drawer.classList.contains("open")) return;
    drawer.classList.remove("open");
    scrim.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    onClose();
    opener?.focus();
  }
  closeBtn.addEventListener("click", close);
  scrim.addEventListener("click", close);

  function open(m, connections, guess) {
    opener = document.activeElement;
    title.textContent = m.name;
    layer.textContent = m.layer;
    layer.className = `badge layer-${m.layer}`;
    const commitsSlot = h("div", { class: "mini" });
    const seeCommits = h("button", { type: "button", class: "btn ghost small", onclick: () => { seeCommits.remove(); fillCommits(commitsSlot, () => source.moduleCommits(m), source, true); } }, "See commits touching this");
    const details = [
      section("Role", para(m.role)),
      section("Why it exists", para(m.whyItExists)),
      connections.length ? section("Connections", h("ul", {}, connections.map((c) => h("li", {}, c)))) : null,
      m.concepts.length ? section("Concepts", conceptChips(m.concepts)) : null,
      section("Evidence", h("ul", { class: "evidence" }, m.evidence.map((v) => h("li", {}, v.lines ? `${v.path}:${v.lines}` : v.path)))),
      h("div", {}, seeCommits, commitsSlot),
    ].filter(Boolean); // replaceChildren would print a null as the text "null"
    const showDetails = () => body.append(...details);
    const question = guess(m); // null when there is nothing fair to ask, or it was asked already
    body.replaceChildren(...(question ? [question] : []));
    if (question) question.addEventListener("answered", showDetails, { once: true });
    else showDetails();
    body.scrollTop = 0;
    drawer.classList.add("open");
    scrim.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    closeBtn.focus();
  }
  document.body.append(scrim, drawer);
  return { open, close };
}

// ---------- Track as my project ----------

function trackBar(fullName, latest, onTrack) {
  const tracked = loadProject().repo === fullName;
  const button = h("button", { type: "button", class: "btn accent small" }, tracked ? "Tracked as my project" : "Track as my project");
  button.disabled = tracked;
  button.addEventListener("click", () => {
    const p = loadProject();
    saveProject({ repo: fullName, name: p.name || fullName.split("/")[1], lastSeenSha: latest()?.sha ?? "" });
    button.textContent = "Tracked as my project";
    button.disabled = true;
    toast("Saved. Open My project any time to see what changed.");
    onTrack();
  });
  return h(
    "div",
    { class: "save-bar" },
    h("p", {}, h("b", {}, "Is this your project? "), "Track it, and next time My project shows only the changes that are new since today."),
    button,
  );
}

// ---------- Page ----------

let drawerHandle;
document.addEventListener("keydown", (e) => e.key === "Escape" && drawerHandle?.close()); // once per page, not once per map
function render(o, source, live = false) {
  drawerHandle?.close();
  document.querySelectorAll(".drawer, .scrim").forEach((el) => el.remove());

  const name = (id) => o.modules.find((m) => m.id === id)?.name ?? id;
  const connectionsOf = (m) => o.edges.flatMap((e) => (e.from === m.id ? [`Sends to ${name(e.to)} (${e.label})`] : e.to === m.id ? [`Receives from ${name(e.from)} (${e.label})`] : []));

  // Tour: 1 open a box, 2 explain a change, 3 track or ask. The rest of the page appears after the first box.
  const tourSteps = ["Open the glowing box", "Explain a change", "Track it or ask about it"].map((t) => h("li", {}, t));
  let stage = -1;
  const later = [];
  const tour = (at) => {
    if (at <= stage) return;
    stage = at;
    tourSteps.forEach((li, i) => (li.className = i < at ? "done" : i === at ? "on" : ""));
    if (at > 0) later.forEach((el) => (el.hidden = false));
    if (at > 0) skip.remove();
  };
  const skip = h("button", { type: "button", class: "btn ghost small", onclick: () => tour(1) }, "Show everything");

  const asked = new Set();
  const guess = (m) => {
    const outs = o.edges.filter((e) => e.from === m.id && e.to !== m.id);
    const linked = new Set(o.edges.flatMap((e) => (e.from === m.id ? [e.to] : e.to === m.id ? [e.from] : [])));
    const strangers = o.modules.filter((x) => x.id !== m.id && !linked.has(x.id));
    if (asked.has(m.id) || !outs.length || strangers.length < 2) return null;
    asked.add(m.id);
    const edge = outs[Math.floor(Math.random() * outs.length)];
    const target = name(edge.to);
    const reveal = (mine) => [
      mine === null ? null : mine === target ? h("p", { class: "verdict good" }, "Right. You read the map.") : h("p", { class: "verdict" }, "Not this one. Follow the arrows that leave the box on the map."),
      h("p", {}, `On the map: ${m.name} → ${target} (${edge.label})`),
    ];
    return h("div", { class: "drawer-quiz" }, quiz({ prompt: `Guess first: which box does ${m.name} send its work to?`, options: [target, ...shuffle(strangers).slice(0, 2).map((x) => x.name)], answer: target, answerTag: "On the map", reveal }));
  };

  const map = o.modules.length
    ? renderMap(o.modules, o.edges, (m) => {
        map.node(start)?.classList.remove("pulse");
        tour(1);
        drawerHandle.open(m, connectionsOf(m), guess);
      })
    : null;
  const degree = (m) => o.edges.filter((e) => e.from === m.id || e.to === m.id).length;
  const start = o.modules.reduce((best, m) => (degree(m) > degree(best) ? m : best), o.modules[0])?.id;
  map?.node(start)?.classList.add("pulse");
  // Explaining a change moves the tour on and offers the concepts it used.
  const touring = {
    ...source,
    explain: async (sha) => {
      const r = await source.explain(sha);
      tour(2);
      announceConcepts(r.concepts);
      return r;
    },
  };
  drawerHandle = makeDrawer(touring, () => map?.select(null));

  let commits = null;
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
    { class: "rise" },
    h("div", { class: "section-head", style: "margin-bottom: var(--s4)" }, h("h2", {}, "Architecture map"), map ? h("p", { class: "map-hint", style: "margin:0" }, "👆 Start with the glowing box. Each box shows what it does, why it exists, and the files behind it.") : null),
    map ? map.el : emptyBox("Lumen could not ground any modules in this repo's files, so it shows none rather than guess."),
  );
  const ask = live ? askPanel(() => ({ repo: o.meta.fullName }), { title: `Ask about ${o.meta.name ?? o.meta.fullName}` }) : null;
  ask?.addEventListener("submit", () => tour(3));
  ask?.addEventListener("click", (e) => e.target.closest(".starters button") && tour(3));
  later.push(
    ...[
      ask,
      trackBar(o.meta.fullName, () => commits?.[0], () => tour(3)),
      h("section", { class: "rise" }, h("div", { class: "section-head" }, h("h2", {}, "Recent changes"), h("p", { class: "muted", style: "margin:0" }, "Press Explain on any change to learn what it did and why.")), commitsSlot),
      nextSteps("Track this repo to see new changes explained each time you come back, or review the AI chat you used to build it.", [["/project", "Go to My project"], ["/chat", "Review a chat"]]),
    ].filter(Boolean),
  );
  const tourBar = h("div", { class: "row tour-bar rise" }, h("ol", { class: "howto tour", "aria-label": "Your tour of this repo" }, tourSteps), skip);
  if (map) later.forEach((el) => (el.hidden = true));
  results.replaceChildren(...[head, map ? tourBar : null, mapSection, ...later].filter(Boolean));
  tour(map ? 0 : 1);
  focusResults(results);
  fillCommits(commitsSlot, touring.commits, touring).then((list) => (commits = list));
}

async function load(repo) {
  input.value = repo;
  input.dispatchEvent(new Event("input")); // drops the button hint before we scroll, so results do not land under the header
  setBusy(run, true, "Map it", "Mapping...");
  results.replaceChildren(loading("Reading the repo and drawing the map. The first time takes 15 to 30 seconds; after that it is instant.", 6, true));
  focusResults(results);
  try {
    render(await api(`/api/repo/overview?repo=${encodeURIComponent(repo)}&level=${getLevel()}`), liveSource(repo), true);
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
    input.dispatchEvent(new Event("input"));
    render(data.overview, demoSource(data)); // pre-generated: no model call
  } catch (e) {
    results.replaceChildren(errorBox(e.message));
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  load(input.value);
});

guide({ input, button: run, results, min: 3, need: "Paste a GitHub link in the box above to turn this button on." });
await loadConcepts();
let examples = [];
try {
  examples = await demo("index");
} catch {
  // no examples published: the form still works
}
const exampleRow = document.getElementById("examples");
if (examples.length) exampleRow.append(...examples.map((x) => h("button", { type: "button", class: "btn ghost", onclick: () => loadDemo(x.id) }, x.label)));
else document.getElementById("examples-block").remove();

const params = new URLSearchParams(location.search);
if (params.get("repo")) load(params.get("repo"));
else if (params.has("example") && examples.length) loadDemo(examples[0].id);
