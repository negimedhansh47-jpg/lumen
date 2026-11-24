import { api } from "./api.js";
import { learn, load as loadProject } from "./project-store.js";
import { errorBox, h, loading, para, setBusy } from "./render.js";
import { getLevel } from "./shell.js";

let concepts = new Map();
let dialog;

export const allConcepts = () => [...concepts.values()];

export async function loadConcepts() {
  try {
    const list = await (await fetch("/concepts/concepts.json")).json();
    concepts = new Map(list.map((c) => [c.id, c]));
  } catch {
    concepts = new Map(); // chips simply do not render; the rest of the page still works
  }
}

/** A row of concept chips. Each opens the concept card. Unknown ids are skipped. */
export function conceptChips(ids = []) {
  const known = ids.filter((id) => concepts.has(id));
  if (!known.length) return null;
  return h("div", { class: "chips" }, known.map((id) => h("button", { type: "button", class: "chip", onclick: () => openConcept(id) }, concepts.get(id).name)));
}

let slideIn;

/** Slides in a small card for concepts the person has not opened yet, so they do not have to find the chips. Never takes focus. */
export function announceConcepts(ids = []) {
  const learned = loadProject().learned;
  const fresh = [...new Set(ids)].filter((id) => concepts.has(id) && !learned.includes(id)).slice(0, 3);
  if (!fresh.length || document.querySelector(".drawer.open")) return; // the repo drawer already lists its concepts; never cover it
  slideIn?.remove();
  const close = () => slideIn?.remove();
  slideIn = h(
    "aside",
    { class: "slidein", "aria-label": "New ideas" },
    h("div", { class: "slidein-head" }, h("p", { class: "label", style: "margin:0" }, fresh.length === 1 ? "New idea here. Learn it in 30 s" : `${fresh.length} new ideas here. Learn them in 30 s`), h("button", { type: "button", class: "close", "aria-label": "Dismiss", onclick: close }, "×")),
    h("div", { class: "chips" }, fresh.map((id) => h("button", { type: "button", class: "chip", title: concepts.get(id).oneLine, onclick: () => (close(), openConcept(id)) }, concepts.get(id).name))),
    h("a", { class: "hint", href: "/concepts" }, "See all concept cards"),
  );
  document.body.append(slideIn);
}

function field(label, text) {
  return h("div", {}, h("p", { class: "label" }, label), para(text));
}

/** "Explain this better": asks the model to re-teach the card another way. */
function explainBetter(id) {
  const slot = h("div", { "aria-live": "polite" });
  const button = h("button", { type: "button", class: "btn ghost small" }, "Explain this better");
  button.addEventListener("click", async () => {
    setBusy(button, true, "Explain this better", "Explaining...");
    slot.replaceChildren(loading("Finding another way to explain it...", 3));
    try {
      const r = await api("/api/concept/explain", { id, level: getLevel() });
      button.remove();
      slot.replaceChildren(
        h(
          "div",
          { class: "explain-better rise" },
          field("Another way to see it", r.plainer),
          field("For example", r.example),
          h("details", { class: "check" }, h("summary", {}, `Check yourself: ${r.check.question}`), para(r.check.answer)),
        ),
      );
    } catch (e) {
      slot.replaceChildren(errorBox(e.message));
      setBusy(button, false, "Explain this better", "Explaining...");
    }
  });
  return h("div", { class: "stack" }, button, slot);
}

export function openConcept(id) {
  const c = concepts.get(id);
  if (!c) return;
  learn(id); // counts toward "concepts explored" on My project (stored in this browser only)
  if (!dialog) {
    dialog = h("dialog", { class: "concept" });
    dialog.addEventListener("click", (e) => e.target === dialog && dialog.close());
    document.body.append(dialog);
  }
  dialog.setAttribute("aria-label", `Concept card: ${c.name}`);
  const related = conceptChips(c.related);
  dialog.replaceChildren(
    h(
      "div",
      { class: "concept-body" },
      h("div", { class: "row", style: "justify-content: space-between; align-items: flex-start" }, h("div", {}, h("p", { class: "eyebrow" }, "Concept"), h("h3", {}, c.name)), h("button", { type: "button", class: "close", "aria-label": "Close", onclick: () => dialog.close() }, "×")),
      h("p", { class: "one" }, c.oneLine),
      para(c.explain),
      h("div", { class: "analogy" }, h("p", { class: "label" }, "Think of it like"), para(c.analogy)),
      field("When to use it", c.whenToUse),
      field("Trade-offs", c.tradeoffs),
      explainBetter(id),
      related ? h("div", {}, h("p", { class: "label" }, "Related"), related) : null,
      location.pathname === "/concepts" ? null : h("a", { class: "hint", href: "/concepts" }, "See all concept cards"),
    ),
  );
  if (!dialog.open) dialog.showModal();
}
