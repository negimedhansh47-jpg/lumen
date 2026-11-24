import { api, demo } from "../api.js";
import { askPanel } from "../ask.js";
import { announceConcepts, conceptChips, loadConcepts } from "../concepts.js";
import { load as loadProject, save as saveProject } from "../project-store.js";
import { copyText, errorBox, focusResults, h, loading, nextSteps, para, setBusy, toast } from "../render.js";
import { getLevel, guide, mountShell } from "../shell.js";
import { quiz, stepper } from "../steps.js";

mountShell("/kickoff");

const form = document.getElementById("form");
const box = document.getElementById("idea");
const results = document.getElementById("results");
const run = document.getElementById("run");
const count = document.getElementById("count");

function verdict(d, mine) {
  if (mine === null) return null;
  if (mine === d.pick) return h("p", { class: "verdict good" }, "Same as Lumen. Here is why it fits.");
  return h("p", { class: "verdict" }, `${mine} can work too. See below when it is the better choice.`);
}

function decision(d, n, ask) {
  const pick = d.pick || d.choice;
  ask.suggest([`Explain decision ${n + 1} in plain words`, `What do I need to know to choose in decision ${n + 1}?`]);
  const alternatives = d.alternatives.length
    ? h("div", {}, h("p", { class: "label" }, "Other options, and when they win"), h("ul", {}, d.alternatives.map((a) => h("li", {}, h("b", {}, a.name), a.betterWhen ? `. ${a.betterWhen}` : ""))))
    : null;
  const reveal = (mine) => {
    announceConcepts(d.concepts);
    const [a, b] = d.alternatives.map((x) => x.name);
    ask.suggest([a && `Why ${pick} over ${a} for my idea?`, b && `What would change if I chose ${b}?`, `What should I learn first to use ${pick}?`].filter(Boolean));
    return [
      verdict(d, mine),
      h("div", { class: "choice" }, h("span", { class: "label" }, "Lumen's pick"), d.choice),
      para(d.why),
      h("div", { class: "decision-grid" }, h("div", {}, h("p", { class: "label" }, "Trade-offs"), para(d.tradeoffs)), alternatives),
      conceptChips(d.concepts),
    ];
  };
  const canGuess = d.pick && d.alternatives.length;
  return h(
    "article",
    { class: "card decision rise" },
    h("p", { class: "label" }, `Decision ${n + 1}`),
    h("p", { class: "q" }, d.question),
    canGuess ? quiz({ prompt: "What would you pick?", options: [d.pick, ...d.alternatives.map((a) => a.name)], answer: d.pick, answerTag: "Lumen's pick", reveal }) : reveal(null),
  );
}

function recap(r) {
  return h("section", { class: "card rise" }, h("h3", {}, "Your decisions"), h("ul", { class: "recap" }, r.decisions.map((d) => h("li", {}, h("span", { class: "muted" }, d.question), h("b", {}, d.pick || d.choice)))));
}

function download(text, filename) {
  const a = h("a", { href: URL.createObjectURL(new Blob([text], { type: "text/markdown" })), download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function agentsFile(md) {
  return h(
    "section",
    { class: "rise" },
    h(
      "div",
      { class: "md-head" },
      h("div", {}, h("h3", {}, "Your AGENTS.md"), h("p", { class: "hint", style: "margin:0" }, "Save it in your project's main folder and your coding AI follows these decisions. Codex, Cursor, GitHub Copilot's coding agent and many other coding agents read AGENTS.md, and so does Claude Code when the project has no CLAUDE.md.")),
      h("div", { class: "row" }, h("button", { type: "button", class: "btn small", onclick: () => copyText(md) }, "Copy"), h("button", { type: "button", class: "btn ghost small", onclick: () => download(md, "AGENTS.md") }, "Download AGENTS.md")),
    ),
    h("pre", {}, h("code", {}, md)),
  );
}

function saveBar(r) {
  const button = h("button", { type: "button", class: "btn accent small" }, "Save as my project");
  button.addEventListener("click", () => {
    const p = loadProject();
    saveProject({ plan: { restatement: r.restatement, firstSteps: r.firstSteps, agentsMd: r.agentsMd }, name: p.name || r.restatement.slice(0, 60), done: [] });
    button.textContent = "Saved";
    button.disabled = true;
    toast("Plan saved. Tick off steps on My project as you build.");
  });
  return h("div", { class: "save-bar rise" }, h("p", {}, h("b", {}, "Building this? "), "Save the plan to My project and tick off the steps as you go. It stays in this browser."), button);
}

function render(r) {
  const finish = () =>
    results.append(
      recap(r),
      h("section", { class: "card rise" }, h("h3", {}, "Your first steps"), h("ol", { class: "firststeps" }, r.firstSteps.map((s) => h("li", {}, s)))),
      saveBar(r),
      agentsFile(r.agentsMd),
      nextSteps("Save the plan, start building with your AI, then come back to My project to tick off steps and see your changes explained.", [["/project", "Go to My project"], ["/chat", "Review a chat"]]),
    );
  const intro = h(
    "section",
    { class: "rise" },
    h("p", { class: "eyebrow" }, "What you are building"),
    h("h2", {}, r.restatement),
    h("p", { class: "muted", style: "margin:0" }, `${r.decisions.length} decisions to make before you write code. Guess each one first, then see Lumen's pick and why.`),
  );
  // Ask sends this plan with the question; nothing is stored. Limits match the server's.
  const plan = { restatement: r.restatement.slice(0, 500), firstSteps: r.firstSteps.slice(0, 12).map((s) => s.slice(0, 400)), decisions: r.decisions.slice(0, 6).map((d) => ({ question: d.question.slice(0, 300), pick: (d.pick || d.choice).slice(0, 300), why: d.why.slice(0, 600) })) };
  const ask = askPanel(() => ({ plan }), { title: "Questions about these decisions?", intro: "Ask anything: why a pick, how the options compare, what a word means. Answers use this plan and general engineering knowledge, so double-check anything important. This chat is not saved." });
  const steps = r.decisions.map((d, n) => () => decision(d, n, ask));
  results.replaceChildren(intro);
  if (steps.length) results.append(stepper(steps, { noun: "Decision", finishLabel: "See your first steps →", finish }), ask);
  else {
    results.append(ask);
    finish();
  }
  focusResults(results);
}

async function explain() {
  const idea = box.value.trim();
  if (idea.length < 10) {
    results.replaceChildren(errorBox("Describe your idea in a sentence or two.", "Tell me a bit more"));
    return;
  }
  setBusy(run, true, "Explain the decisions", "Thinking...");
  results.replaceChildren(loading("Working through the decisions. This usually takes 10 to 20 seconds.", 6, true));
  focusResults(results);
  try {
    render(await api("/api/kickoff", { idea, level: getLevel() }));
  } catch (e) {
    results.replaceChildren(errorBox(e.message));
  } finally {
    setBusy(run, false, "Explain the decisions", "Thinking...");
  }
}

async function loadExample() {
  try {
    const data = await demo("kickoff");
    box.value = data.idea;
    box.dispatchEvent(new Event("input")); // updates the counter and drops the button hint before we scroll
    render(data.result); // pre-generated: no model call
  } catch (e) {
    results.replaceChildren(errorBox(e.message));
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  explain();
});
document.getElementById("example").addEventListener("click", loadExample);
box.addEventListener("input", () => (count.textContent = String(box.value.length)));

guide({ input: box, button: run, results, min: 10, need: "Type your idea in the box above to turn this button on." });
await loadConcepts();
if (new URLSearchParams(location.search).has("example")) loadExample();
