import { mountShell } from "../shell.js";

mountShell("/");

// Soft accent spotlight that follows the pointer over the entry cards.
for (const card of document.querySelectorAll(".entry")) {
  card.addEventListener("pointermove", (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${e.clientX - r.left}px`);
    card.style.setProperty("--my", `${e.clientY - r.top}px`);
  });
}
