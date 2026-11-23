import { api, demo } from "../api.js";
import { conceptChips, loadConcepts } from "../concepts.js";
import { load as loadProject, save as saveProject } from "../project-store.js";
import { copyText, errorBox, focusResults, h, loading, nextSteps, para, setBusy, toast } from "../render.js";
import { getLevel, guide, mountShell } from "../shell.js";

mountShell("/kickoff");

const form = document.getElementById("form");
const box = document.getElementById("idea");
const results = document.getElementById("results");
const run = document.getElementById("run");
const count = document.getElementById("count");

function decision(d, n) {
  const alternatives = d.alternatives.length ? h("div", {}, h("p", { class: "label" }, "Alternatives"), h("ul", {}, d.alternatives.map((a) => h("li", {}, a)))) : null;
  return h(
    "article",
    { class: "card decision rise" },
    h("p", { class: "label" }, `Decision ${n + 1}`),
    h("p", { class: "q" }, d.question),
    h("div", { class: "choice" }, d.choice),
    para(d.why),
    h("div", { class: "decision-grid" }, h("div", {}, h("p", { class: "label" }, "Trade-offs"), para(d.tradeoffs)), alternatives),
    conceptChips(d.concepts),
  );
}

function saveBar(r) {
  const button = h("button", { type: "button", class: "btn accent small" }, "Save as my project");
  button.addEventListener("click", () => {
    const p = loadProject();
    saveProject({ plan: { restatement: r.restatement, firstSteps: r.firstSteps, claudeMd: r.claudeMd }, name: p.name || r.restatement.slice(0, 60), done: [] });
    button.textContent = "Saved";
    button.disabled = true;
    toast("Plan saved. Tick off steps on My project as you build.");
  });
  return h("div", { class: "save-bar rise" }, h("p", {}, h("b", {}, "Building this? "), "Save the plan to My project and tick off the steps as you go. It stays in this browser."), button);
}

function render(r) {
  results.replaceChildren(
    h("section", { class: "rise" }, h("p", { class: "eyebrow" }, "What you are building"), h("h2", {}, r.restatement)),
    saveBar(r),
    ...r.decisions.map(decision),
    h("section", { class: "card rise" }, h("h3", {}, "Your first steps"), h("ol", { class: "firststeps" }, r.firstSteps.map((s) => h("li", {}, s)))),
    h(
      "section",
      { class: "rise" },
      h("div", { class: "md-head" }, h("div", {}, h("h3", {}, "Your CLAUDE.md"), h("p", { class: "hint", style: "margin:0" }, "Save this in your project folder so your AI follows your decisions.")), h("button", { type: "button", class: "btn small", onclick: () => copyText(r.claudeMd) }, "Copy CLAUDE.md")),
      h("pre", {}, h("code", {}, r.claudeMd)),
    ),
    nextSteps("Save the plan, start building with your AI, then come back to My project to tick off steps and see your changes explained.", [["/project", "Go to My project"], ["/chat", "Review a chat"]]),
  );
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
    count.textContent = String(data.idea.length);
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
