import { api, demo } from "../api.js";
import { conceptChips, loadConcepts } from "../concepts.js";
import { copyText, emptyBox, errorBox, focusResults, h, loading, nextSteps, para, setBusy } from "../render.js";
import { getLevel, guide, mountShell } from "../shell.js";

mountShell("/chat");

const form = document.getElementById("form");
const box = document.getElementById("chat");
const results = document.getElementById("results");
const run = document.getElementById("run");
const count = document.getElementById("count");

const PROBLEMS = {
  vague: "Too vague",
  "no-context": "Missing context",
  "no-error": "No error shown",
  "too-big": "Too much at once",
  "no-goal": "No clear goal",
  other: "Could be sharper",
};

function item(i) {
  return h(
    "article",
    { class: "pair rise" },
    h("div", { class: "before" }, h("span", { class: "badge" }, PROBLEMS[i.problem] ?? PROBLEMS.other), h("p", { class: "label" }, "You wrote"), h("blockquote", {}, i.excerpt)),
    h(
      "div",
      { class: "after" },
      h("p", { class: "label" }, "Clearer version"),
      h("blockquote", {}, i.rewrite),
      h("div", {}, h("button", { type: "button", class: "btn ghost small", onclick: () => copyText(i.rewrite) }, "Copy rewrite")),
    ),
    h("div", { class: "pair-foot" }, para(i.why), conceptChips(i.concept ? [i.concept] : [])),
  );
}

function overview(o) {
  const list = (items) => h("ul", {}, items.map((t) => h("li", {}, t)));
  return h(
    "section",
    { class: "overview-grid rise" },
    h("div", { class: "card" }, h("h3", {}, "Patterns"), o.patterns.length ? list(o.patterns) : h("p", { class: "muted" }, "None stood out.")),
    o.strongest ? h("div", { class: "card" }, h("h3", {}, "Strongest prompt"), h("p", {}, o.strongest)) : null,
    o.weakest ? h("div", { class: "card" }, h("h3", {}, "Weakest prompt"), h("p", {}, o.weakest)) : null,
  );
}

function render(result) {
  const n = result.items.length;
  const nodes = [
    h("div", { class: "section-head rise" }, h("p", { class: "eyebrow" }, "Your review"), h("h2", {}, n ? `${n} prompt${n === 1 ? "" : "s"} to improve` : "Your prompts look clear"), h("p", { class: "muted", style: "margin:0" }, n ? "Each one shows what you wrote, a clearer version you can copy, and why it works better. Click a blue idea to learn it." : "")),
    overview(result.overview),
  ];
  if (n) nodes.push(...result.items.map(item));
  else nodes.push(emptyBox("No specific prompts could be flagged in this chat. That usually means it was already clear."));
  nodes.push(nextSteps("Use the clearer prompts in your next chat. Then see how the code your AI wrote fits together.", [["/repo", "Explain my repo"], ["/kickoff", "Plan a new idea"]]));
  results.replaceChildren(...nodes);
  focusResults(results);
}

async function review() {
  const chat = box.value.trim();
  if (chat.length < 20) {
    results.replaceChildren(errorBox("Paste a longer chat so there is something to review.", "Not enough to review"));
    return;
  }
  setBusy(run, true, "Review my prompts", "Reviewing...");
  results.replaceChildren(loading("Reading your chat. This usually takes 5 to 15 seconds.", 6, true));
  focusResults(results);
  try {
    render(await api("/api/chat/review", { chat, level: getLevel() }));
  } catch (e) {
    results.replaceChildren(errorBox(e.message));
  } finally {
    setBusy(run, false, "Review my prompts", "Reviewing...");
  }
}

async function loadExample() {
  try {
    const data = await demo("chat");
    box.value = data.chat;
    count.textContent = data.chat.length.toLocaleString();
    render(data.result); // pre-generated: no model call
  } catch (e) {
    results.replaceChildren(errorBox(e.message));
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  review();
});
document.getElementById("example").addEventListener("click", loadExample);
box.addEventListener("input", () => (count.textContent = box.value.length.toLocaleString()));

guide({ input: box, button: run, results, min: 20, pressAt: 2, need: "Paste your chat in the box above to turn this button on." });
await loadConcepts();
if (new URLSearchParams(location.search).has("example")) loadExample();
