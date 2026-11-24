import { allConcepts, loadConcepts, openConcept } from "../concepts.js";
import { load as loadProject } from "../project-store.js";
import { emptyBox, errorBox, h } from "../render.js";
import { mountShell } from "../shell.js";

mountShell("");

const grid = document.getElementById("grid");
const find = document.getElementById("find");
const count = document.getElementById("count");

function tile(c, seen) {
  const el = h("button", { type: "button", class: "concept-tile" }, seen ? h("span", { class: "seen" }, "Explored") : null, h("b", {}, c.name), h("span", {}, c.oneLine));
  el.addEventListener("click", () => {
    openConcept(c.id);
    if (!el.querySelector(".seen")) el.prepend(h("span", { class: "seen" }, "Explored")); // in place, so focus returns here when the card closes
    if (!find.value.trim()) count.textContent = explored();
  });
  return el;
}

const explored = () => `${allConcepts().filter((c) => loadProject().learned.includes(c.id)).length} of ${allConcepts().length} explored`;

function draw() {
  const q = find.value.trim().toLowerCase();
  const learned = loadProject().learned;
  const list = allConcepts().filter((c) => !q || `${c.name} ${c.oneLine} ${c.explain}`.toLowerCase().includes(q));
  count.textContent = q ? `${list.length} match${list.length === 1 ? "" : "es"}` : explored();
  grid.replaceChildren(...(list.length ? list.map((c) => tile(c, learned.includes(c.id))) : [emptyBox(`No card matches "${find.value.trim()}". Try a shorter word.`)]));
}

await loadConcepts();
if (!allConcepts().length) grid.replaceChildren(errorBox("The concept cards could not be loaded. Check your connection and reload the page."));
else {
  const id = new URLSearchParams(location.search).get("id");
  if (id) openConcept(id); // before drawing, so its tile already shows as explored
  draw();
  find.addEventListener("input", draw);
}
