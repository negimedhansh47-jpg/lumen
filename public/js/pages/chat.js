import { api, demo } from "../api.js";
import { announceConcepts, conceptChips, loadConcepts } from "../concepts.js";
import { copyText, emptyBox, errorBox, focusResults, h, loading, nextSteps, para, setBusy } from "../render.js";
import { getLevel, guide, mountShell } from "../shell.js";
import { quiz, shuffle, stepper } from "../steps.js";

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
  const ideas = i.concept ? [i.concept] : [];
  const right = PROBLEMS[i.problem] ?? PROBLEMS.other;
  const reveal = (mine) => {
    announceConcepts(ideas);
    const verdict = mine === null ? null : mine === right ? h("p", { class: "verdict good" }, "You spotted it.") : h("p", { class: "verdict" }, `Fair guess: several can apply. Lumen reads this one mostly as "${right}".`);
    return [
      verdict,
      para(i.why),
      h("div", { class: "said better" }, h("p", { class: "label" }, "Clearer version"), h("blockquote", {}, i.rewrite), h("div", {}, h("button", { type: "button", class: "btn ghost small", onclick: () => copyText(i.rewrite) }, "Copy rewrite"))),
      conceptChips(ideas),
    ];
  };
  const others = shuffle(Object.entries(PROBLEMS).filter(([k]) => k !== "other" && k !== i.problem).map(([, v]) => v)).slice(0, 2);
  return h(
    "article",
    { class: "card stack rise" },
    h("div", { class: "said" }, h("p", { class: "label" }, "You wrote"), h("blockquote", {}, i.excerpt)),
    i.problem === "other" // no clear category to guess, so show the answer straight away
      ? [h("span", { class: "badge" }, right), ...reveal(null)]
      : quiz({ prompt: "What would make this prompt clearer?", options: [right, ...others], answer: right, answerTag: "Lumen's read", reveal }),
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
  const finish = () =>
    results.append(
      overview(result.overview),
      nextSteps("Use the clearer prompts in your next chat. Then see how the code your AI wrote fits together.", [["/repo", "Explain my repo"], ["/kickoff", "Plan a new idea"]]),
    );
  results.replaceChildren(
    h("div", { class: "section-head rise" }, h("p", { class: "eyebrow" }, "Your review"), h("h2", {}, n ? `${n} prompt${n === 1 ? "" : "s"} to improve` : "Your prompts look clear"), h("p", { class: "muted", style: "margin:0" }, n ? "One at a time: guess what is missing, then see a clearer version you can copy." : "")),
  );
  if (n) results.append(stepper(result.items.map((i) => () => item(i)), { noun: "Prompt", finishLabel: "See your overall patterns →", finish }));
  else {
    results.append(emptyBox("No specific prompts could be flagged in this chat. That usually means it was already clear."));
    finish();
  }
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
    box.dispatchEvent(new Event("input")); // updates the counter and drops the button hint before we scroll
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
