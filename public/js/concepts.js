import { h, para } from "./render.js";

let concepts = new Map();
let dialog;

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

function field(label, text) {
  return h("div", {}, h("p", { class: "label" }, label), para(text));
}

export function openConcept(id) {
  const c = concepts.get(id);
  if (!c) return;
  if (!dialog) {
    dialog = h("dialog", { class: "concept", "aria-label": "Concept card" });
    dialog.addEventListener("click", (e) => e.target === dialog && dialog.close());
    document.body.append(dialog);
  }
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
      related ? h("div", {}, h("p", { class: "label" }, "Related"), related) : null,
    ),
  );
  if (!dialog.open) dialog.showModal();
}
