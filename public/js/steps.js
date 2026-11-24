// Step-by-step results: one thing at a time, and a guess before each answer.
import { focusResults, h } from "./render.js";

const reveals = new WeakMap(); // quiz element -> reveal it without a guess ("Show everything")
export const shuffle = (list) => list.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(([, v]) => v);

/**
 * Multiple choice. The person picks (or "Not sure"), then reveal(picked|null) builds the answer.
 * Fires a bubbling "answered" event so a stepper knows it can offer Next.
 */
export function quiz({ prompt, options, answer, answerTag, reveal }) {
  const slot = h("div", { class: "quiz-reveal" });
  const buttons = shuffle([...new Set(options)]).map((text) => h("button", { type: "button", class: "opt", "data-value": text }, text));
  const unsure = h("button", { type: "button", class: "opt unsure" }, "Not sure, show me");
  const el = h("div", { class: "quiz" }, h("p", { class: "quiz-q" }, prompt), h("div", { class: "opts", role: "group", "aria-label": prompt }, buttons, unsure), slot);

  function pick(choice, quiet = false) {
    if (slot.childElementCount) return;
    for (const b of [...buttons, unsure]) b.disabled = true;
    for (const b of buttons) {
      if (b.dataset.value === answer) b.append(h("span", { class: "tag right" }, answerTag));
      if (!quiet && b.dataset.value === choice) {
        b.classList.add("mine");
        b.append(h("span", { class: "tag" }, "Your pick"));
      }
    }
    if (!quiet && choice === null) unsure.classList.add("mine");
    slot.replaceChildren(...[reveal(quiet ? null : choice)].flat().filter(Boolean));
    el.dispatchEvent(new CustomEvent("answered", { bubbles: true, detail: { quiet } }));
  }
  buttons.forEach((b) => b.addEventListener("click", () => pick(b.dataset.value)));
  unsure.addEventListener("click", () => pick(null));
  reveals.set(el, () => pick(null, true));
  return el;
}

/**
 * Shows steps one at a time. Each step is a function returning an element; a step with a quiz
 * unlocks Next once answered. "Show everything" opens the rest at once. finish() runs at the end.
 */
export function stepper(steps, { noun, finishLabel, finish }) {
  let i = 0;
  let current;
  const fill = h("i");
  const count = h("span", { class: "hint" });
  const all = h("button", { type: "button", class: "btn ghost small" }, "Show everything");
  const next = h("button", { type: "button", class: "btn accent" });
  const nextRow = h("div", { class: "row step-next" }, next);
  const body = h("div", { class: "stack" });
  const wrap = h("div", { class: "stack" }, h("div", { class: "step-head" }, h("div", { class: "meter", "aria-hidden": "true" }, fill), count, all), body);

  function show() {
    current = steps[i]();
    count.textContent = `${noun} ${i + 1} of ${steps.length}`;
    fill.style.setProperty("--p", `${((i + 1) / steps.length) * 100}%`);
    next.textContent = i + 1 < steps.length ? `Next ${noun.toLowerCase()} →` : finishLabel;
    nextRow.remove();
    body.append(current);
    if (!current.querySelector(".quiz")) body.append(nextRow);
  }
  function done() {
    nextRow.remove();
    all.remove();
    count.textContent = `All ${steps.length} done`;
    finish();
  }
  wrap.addEventListener("answered", (e) => {
    if (e.detail.quiet || !current.contains(e.target)) return;
    body.append(nextRow);
    next.focus({ preventScroll: true });
  });
  next.addEventListener("click", () => {
    if (++i >= steps.length) return done();
    show();
    focusResults(current);
    (current.querySelector(".opt") ?? next).focus({ preventScroll: true });
  });
  all.addEventListener("click", () => {
    while (i < steps.length) {
      if (current) current.querySelectorAll(".quiz").forEach((q) => reveals.get(q)?.());
      if (++i < steps.length) show();
    }
    done();
  });
  show();
  return wrap;
}
