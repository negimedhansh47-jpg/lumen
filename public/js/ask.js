import { api } from "./api.js";
import { conceptChips } from "./concepts.js";
import { errorBox, h, para, setBusy } from "./render.js";
import { getLevel } from "./shell.js";

const STARTERS = ["Where should I start reading this project?", "What should I build or fix next?", "Explain the riskiest part in plain words."];

/** Chat about one project. The conversation lives in memory only; nothing is saved. `context()` returns {repo?, plan?} at send time. */
export function askPanel(context, { title = "Ask about your project" } = {}) {
  const history = [];
  const log = h("div", { class: "ask-log", role: "log", "aria-live": "polite" });
  const starters = h("div", { class: "starters" });
  const box = h("textarea", { maxlength: "600", rows: "2", "aria-label": "Your question", placeholder: "Type a question, for example: why is there a separate api folder?" });
  const send = h("button", { type: "submit", class: "btn accent" }, "Ask");
  const form = h("form", { class: "ask-form" }, box, send);

  const setStarters = (list) => starters.replaceChildren(...list.map((q) => h("button", { type: "button", onclick: () => ask(q) }, q)));

  async function ask(question) {
    question = question.trim();
    if (question.length < 3) return;
    box.value = "";
    log.append(h("div", { class: "msg user" }, question));
    const wait = h("div", { class: "msg ai", "aria-label": "Thinking" }, h("span", { class: "typing-dots" }, h("i"), h("i"), h("i")));
    log.append(wait);
    log.scrollTop = log.scrollHeight;
    setBusy(send, true, "Ask", "Thinking...");
    starters.replaceChildren();
    try {
      const out = await api("/api/project/ask", { question, history: history.slice(-6), ...context(), level: getLevel() });
      history.push({ role: "user", text: question }, { role: "assistant", text: out.answer.slice(0, 1500) });
      wait.replaceChildren(
        ...[
          para(out.answer),
          out.files.length ? h("div", { class: "chips" }, out.files.map((f) => h("code", { class: "chip" }, f))) : null,
          conceptChips(out.concepts), // null when no known concepts
        ].filter(Boolean), // replaceChildren would print a null as the text "null"
      );
      setStarters(out.followUps);
    } catch (e) {
      wait.replaceChildren(errorBox(e.message, "Could not answer"));
    } finally {
      setBusy(send, false, "Ask", "Thinking...");
      log.scrollTop = log.scrollHeight;
    }
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    ask(box.value);
  });
  box.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) (e.preventDefault(), form.requestSubmit());
  });
  setStarters(STARTERS);

  return h(
    "section",
    { class: "card stack ask rise" },
    h("h3", {}, title),
    h("p", { class: "muted", style: "margin:0" }, "Pick a question below or type your own. Answers use only what Lumen has seen of this project. This chat is not saved."),
    log,
    starters,
    form,
  );
}
