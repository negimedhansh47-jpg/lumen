import { api } from "./api.js";
import { conceptChips } from "./concepts.js";
import { emptyBox, errorBox, h, loading, para, setBusy } from "./render.js";
import { getLevel } from "./shell.js";

// A "source" supplies commits and explanations. Live repos call the API; demos read pre-generated files.
export const liveSource = (repo) => ({
  commits: () => api(`/api/repo/commits?repo=${encodeURIComponent(repo)}`),
  moduleCommits: (m) => api(`/api/repo/commits?repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(m.paths[0] ?? m.evidence[0].path)}`),
  explain: (sha) => api("/api/commit/explain", { repo, sha, level: getLevel() }),
});

const list = (items) => h("ul", {}, items.map((i) => h("li", {}, i)));
export const section = (title, body) => h("div", {}, h("h4", {}, title), body);

function explanation(e) {
  return h(
    "div",
    { class: "explain rise" },
    h("p", {}, h("strong", {}, e.title)),
    section("What changed", para(e.whatChanged)),
    section("Why it matters", para(e.whyItMatters)),
    section("The design reasoning", para(e.designReasoning)),
    section("Trade-offs", para(e.tradeoffs)),
    e.alternatives.length ? section("Alternatives", list(e.alternatives)) : null,
    e.evidence.length ? section("Evidence", h("ul", { class: "evidence" }, e.evidence.map((v) => h("li", {}, `${v.path}: ${v.hint}`)))) : null,
    conceptChips(e.concepts),
  );
}

export function commitRow(c, source, { mini = false, isNew = false } = {}) {
  const slot = h("div");
  const button = h("button", { type: "button", class: "btn ghost small" }, "Explain");
  button.addEventListener("click", async () => {
    setBusy(button, true, "Explain", "Explaining...");
    slot.replaceChildren(loading("Reading the diff. This usually takes 5 to 15 seconds.", 4));
    try {
      slot.replaceChildren(explanation(await source.explain(c.sha)));
      button.remove();
    } catch (e) {
      slot.replaceChildren(errorBox(e.message));
      setBusy(button, false, "Explain", "Explaining...");
    }
  });
  // Examples ship only a few explanations: say so instead of offering a button that would fail.
  const action = source.canExplain?.(c.sha) === false ? h("span", { class: "hint" }, "Not in this example") : button;
  const date = c.date ? new Date(c.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
  return h(
    "div",
    { class: mini ? "" : `commit${isNew ? " new" : ""}` },
    h("div", { class: "commit-top" }, h("span", { class: "commit-msg" }, c.message), action),
    h("div", { class: "commit-meta" }, h("code", {}, c.sha.slice(0, 7)), ` · ${c.author} · ${date}`),
    slot,
  );
}

/** Loads commits into target. Returns the list (or null on error) so callers can use it. */
export async function fillCommits(target, fetcher, source, mini = false) {
  target.replaceChildren(loading("Loading commits...", 3));
  try {
    const commits = await fetcher();
    target.replaceChildren(...(commits.length ? commits.map((c) => commitRow(c, source, { mini })) : [emptyBox("No commits found for this.")]));
    return commits;
  } catch (e) {
    target.replaceChildren(errorBox(e.message));
    return null;
  }
}
