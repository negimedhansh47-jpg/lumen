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
    h("button", { type: "button", "data-level": level, onclick: () => choose(level) }, level[0].toUpperCase() + level.slice(1)),
  );
  const sync = () => buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.level === getLevel())));
  function choose(level) {
    setLevel(level);
    sync();
  }
  sync();
  return h("div", { class: "level", role: "group", "aria-label": "Explanation level" }, buttons);
}

const NAV = [
  ["/kickoff", "Start a project"],
  ["/chat", "Review my chat"],
  ["/repo", "Understand my repo"],
];

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
      h("div", { class: "page" }, h("span", {}, "Lumen teaches you the engineering behind the code your AI writes."), h("a", { href: "https://github.com/negimedhansh47-jpg/lumen" }, "Source on GitHub")),
    ),
  );
}
