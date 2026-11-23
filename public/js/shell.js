import { h } from "./render.js";

const KEY = "lumen-level";

export function getLevel() {
  try {
    return localStorage.getItem(KEY) === "intermediate" ? "intermediate" : "beginner";
  } catch {
    return "beginner";
  }
}

function setLevel(level) {
  try {
    localStorage.setItem(KEY, level);
  } catch {
    // storage blocked: the choice just will not persist
  }
}

function levelToggle() {
  const buttons = ["beginner", "intermediate"].map((level) =>
    h("button", { type: "button", "data-level": level, onclick: () => choose(level) }, level === "beginner" ? "Beginners" : "Some experience"),
  );
  const sync = () => buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.level === getLevel())));
  function choose(level) {
    setLevel(level);
    sync();
  }
  sync();
  buttons[0].title = "Every term explained in plain words";
  buttons[1].title = "Adds trade-offs and alternatives";
  return h("div", { class: "level-wrap" }, h("span", { "aria-hidden": "true" }, "Explain for:"), h("div", { class: "level", role: "group", "aria-label": "Explain for" }, buttons));
}

const NAV = [
  ["/kickoff", "Plan an idea"],
  ["/chat", "Review a chat"],
  ["/repo", "Explain a repo"],
  ["/project", "My project"],
];

/** Fade-up on scroll. Elements already on screen are shown at once, so nothing flashes. */
export function reveal(root = document) {
  const els = [...root.querySelectorAll(".reveal:not(.in)")];
  if (!("IntersectionObserver" in window)) return els.forEach((el) => el.classList.add("in"));
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) (e.target.classList.add("in"), io.unobserve(e.target));
  }, { rootMargin: "0px 0px -8% 0px" });
  for (const el of els) {
    if (el.getBoundingClientRect().top < innerHeight) el.classList.add("in");
    else io.observe(el);
  }
  document.documentElement.classList.add("js");
}

/** Makes the next move obvious: lights up the 1-2-3 steps, and keeps the main button off (with a reason) until there is enough input. */
export function guide({ input, button, results, min, need, pressAt = 1 }) {
  const steps = [...document.querySelectorAll(".howto li")];
  const hint = h("p", { class: "need", "aria-live": "polite" });
  button.parentElement.after(hint);
  const refresh = () => {
    const ok = input.value.trim().length >= min;
    const done = results.childElementCount > 0 && !results.querySelector(".skeleton, .alert");
    const at = done ? 3 : ok ? pressAt : 0; // index of the step to do now
    steps.forEach((li, i) => (li.className = i < at ? "done" : i === at ? "on" : ""));
    button.disabled = button.dataset.busy === "1" || !ok;
    hint.textContent = ok || button.dataset.busy === "1" ? "" : need;
  };
  input.addEventListener("input", refresh);
  new MutationObserver(refresh).observe(results, { childList: true });
  refresh();
}

export function mountShell(active) {
  const link = ([href, label]) => h("a", { href, "aria-current": href === active ? "page" : null }, label);
  document.body.prepend(
    h("a", { class: "skip", href: "#main" }, "Skip to content"),
    h("header", { class: "site-header" }, h("div", { class: "page" }, h("a", { class: "brand", href: "/" }, "Lumen", h("span", {}, ".")), h("nav", { class: "nav", "aria-label": "Main" }, NAV.map(link)), levelToggle())),
  );
  document.body.append(
    h(
      "footer",
      { class: "site-footer" },
      h(
        "div",
        { class: "page" },
        h("span", { class: "big", "aria-hidden": "true" }, "Lumen", h("span", {}, ".")),
        h("span", {}, "Lumen teaches you the engineering behind the code your AI writes."),
        h("a", { href: "https://github.com/negimedhansh47-jpg/lumen" }, "Source on GitHub"),
      ),
    ),
  );
  reveal();
}
