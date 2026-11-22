// Safe DOM helpers. Model and user text only ever enters the page as text nodes, never as HTML.

export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value == null || value === false) continue;
    if (key === "class") el.className = value;
    else if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
    else el.setAttribute(key, value === true ? "" : value);
  }
  el.append(...kids.flat().filter((k) => k != null && k !== false));
  return el;
}

/** Tiny renderer: **bold** and `code` only. Everything else is plain text. */
export function inline(text) {
  const frag = document.createDocumentFragment();
  for (const part of String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/)) {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) frag.append(h("strong", {}, part.slice(2, -2)));
    else if (part.startsWith("`") && part.endsWith("`") && part.length > 2) frag.append(h("code", {}, part.slice(1, -1)));
    else if (part) frag.append(part);
  }
  return frag;
}

export const para = (text, props = {}) => h("p", props, inline(text));

export function skeleton(lines = 5, withBlock = false) {
  const rows = Array.from({ length: lines }, () => h("i"));
  return h("div", { class: "skeleton", "aria-hidden": "true" }, withBlock ? h("i", { class: "block" }) : null, rows);
}

export function loading(label, lines, withBlock) {
  return h("div", { role: "status", "aria-live": "polite" }, h("p", { class: "muted" }, label), skeleton(lines, withBlock));
}

export function errorBox(message, title = "That did not work") {
  return h("div", { class: "alert", role: "alert" }, h("strong", {}, title), message);
}

export const emptyBox = (message) => h("div", { class: "empty" }, message);

export function toast(message) {
  const el = h("div", { class: "toast", role: "status" }, message);
  document.body.append(el);
  setTimeout(() => el.remove(), 1800);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copied");
  } catch {
    toast("Copy failed. Select the text and copy it manually.");
  }
}

export function setBusy(button, busy, idleLabel, busyLabel) {
  button.disabled = busy;
  button.textContent = busy ? busyLabel : idleLabel;
}

