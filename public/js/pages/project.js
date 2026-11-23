import { commitRow, liveSource } from "../commits.js";
import { allConcepts, conceptChips, loadConcepts } from "../concepts.js";
import { clean, clear, hasProject, load, save } from "../project-store.js";
import { copyText, emptyBox, errorBox, h, loading, toast } from "../render.js";
import { mountShell } from "../shell.js";

mountShell("/project");

const results = document.getElementById("results");
const title = document.getElementById("title");

const meter = (done, total) => h("div", { class: "meter", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(total), "aria-valuenow": String(done) }, h("i", { style: `--p:${total ? Math.round((done / total) * 100) : 0}%` }));
const card = (heading, ...kids) => h("section", { class: "card stack rise" }, h("h3", {}, heading), ...kids);

// ---------- What changed since last visit ----------

function changesCard(p) {
  if (!p.repo) {
    return card("What changed since your last visit", h("p", { class: "muted" }, "Track a repo and this shows the commits that are new since you last looked, each one explainable."), h("a", { class: "btn small", href: "/repo" }, "Track a repo"));
  }
  const list = h("div", { class: "commits" }, loading("Checking GitHub for new commits...", 3));
  const caughtUp = h("button", { type: "button", class: "btn ghost small", hidden: true }, "Mark all as seen");
  const summary = h("p", { class: "muted", style: "margin:0" });
  const source = liveSource(p.repo);

  (async () => {
    try {
      const commits = await source.commits();
      const seenAt = commits.findIndex((c) => c.sha === p.lastSeenSha);
      const fresh = seenAt === -1 ? commits.length : seenAt;
      summary.textContent = !p.lastSeenSha
        ? "Your first visit: here are the latest commits."
        : fresh === 0
          ? "You are all caught up. Nothing new since your last visit."
          : `${fresh}${seenAt === -1 ? "+" : ""} new commit${fresh === 1 ? "" : "s"} since your last visit. Explain them to learn what changed.`;
      const shown = commits.slice(0, (p.lastSeenSha ? fresh : 2) + 3); // new ones plus a little context; the full history is on the map page
      list.replaceChildren(...(shown.length ? shown.map((c, i) => commitRow(c, source, { isNew: Boolean(p.lastSeenSha) && i < fresh })) : [emptyBox("This repo has no commits yet.")]));
      if (commits.length && commits[0].sha !== p.lastSeenSha) {
        caughtUp.hidden = false;
        caughtUp.onclick = () => {
          save({ lastSeenSha: commits[0].sha });
          render();
          toast("Caught up. New commits will be marked from here.");
        };
      }
    } catch (e) {
      list.replaceChildren(errorBox(e.message));
    }
  })();

  return card(
    "What changed since your last visit",
    h("div", { class: "row", style: "justify-content: space-between" }, h("a", { href: `/repo?repo=${encodeURIComponent(p.repo)}`, class: "chip" }, p.repo), h("div", { class: "row" }, caughtUp, h("a", { class: "btn small", href: `/repo?repo=${encodeURIComponent(p.repo)}` }, "Open the map"))),
    summary,
    list,
  );
}

// ---------- Plan checklist ----------

function planCard(p) {
  if (!p.plan) {
    return card("Your plan", h("p", { class: "muted" }, "Describe your idea on Start a project and save the plan here, then tick off steps as you build."), h("a", { class: "btn small", href: "/kickoff" }, "Plan a project"));
  }
  const steps = p.plan.firstSteps;
  const status = h("p", { class: "muted", style: "margin:0" }, `${p.done.length} of ${steps.length} steps done`);
  const bar = h("div");
  const sync = () => {
    const done = load().done.length;
    status.textContent = `${done} of ${steps.length} steps done${done === steps.length && done ? ". Nice work." : ""}`;
    bar.replaceChildren(meter(done, steps.length));
  };
  sync();
  const items = steps.map((s, i) => {
    const box = h("input", { type: "checkbox", checked: p.done.includes(i) });
    box.addEventListener("change", () => {
      const done = new Set(load().done);
      box.checked ? done.add(i) : done.delete(i);
      save({ done: [...done] });
      sync();
    });
    return h("li", {}, h("label", {}, box, h("span", {}, s)));
  });
  return card(
    "Your plan",
    h("p", { style: "margin:0; font: 400 1.4rem/1.25 var(--font-display)" }, p.plan.restatement),
    bar,
    status,
    h("ul", { class: "checklist" }, items),
    h("div", { class: "row" }, h("button", { type: "button", class: "btn ghost small", onclick: () => copyText(p.plan.claudeMd) }, "Copy CLAUDE.md")),
  );
}

// ---------- Concepts explored ----------

function conceptsCard(p) {
  const all = allConcepts();
  const learned = p.learned.filter((id) => all.some((c) => c.id === id));
  const next = all.filter((c) => !learned.includes(c.id)).slice(0, 4).map((c) => c.id);
  return card(
    "Concepts explored",
    h("div", { class: "row", style: "align-items: baseline" }, h("span", { class: "big-num" }, String(learned.length)), h("span", { class: "muted" }, `of ${all.length} concept cards`)),
    meter(learned.length, all.length),
    learned.length ? conceptChips(learned) : h("p", { class: "muted", style: "margin:0" }, "Open any concept chip anywhere on Lumen and it is collected here."),
    next.length ? h("div", { class: "stack", style: "gap: var(--s2)" }, h("p", { class: "label", style: "margin:0" }, "Try next"), conceptChips(next)) : null,
  );
}

// ---------- Settings: rename, export, import, clear ----------

function settingsCard(p) {
  const name = h("input", { type: "text", value: p.name, maxlength: "80", "aria-label": "Project name", placeholder: "Name your project" });
  name.addEventListener("change", () => {
    save({ name: name.value.trim() });
    setTitle();
    toast("Renamed");
  });
  const file = h("input", { type: "file", accept: "application/json,.json", hidden: true });
  file.addEventListener("change", async () => {
    const f = file.files?.[0];
    if (!f) return;
    try {
      if (f.size > 100_000) throw new Error("That file is too big to be a Lumen project.");
      const data = clean(JSON.parse(await f.text()));
      if (!hasProject(data)) throw new Error("That file does not contain a Lumen project.");
      save(data);
      render();
      toast("Project imported");
    } catch (e) {
      toast(e instanceof SyntaxError ? "That file is not valid JSON." : e.message);
    }
  });
  const download = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(load(), null, 2)], { type: "application/json" }));
    h("a", { href: url, download: `${(load().name || "lumen-project").replace(/[^\w-]+/g, "-")}.json` }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const reset = () => {
    if (!confirm("Remove this project from this browser? Your concepts explored are kept.")) return;
    clear();
    render();
  };
  return card(
    "Project",
    h("div", { class: "field" }, h("label", {}, "Name"), name),
    h("p", { class: "hint", style: "margin:0" }, "Saved only in this browser. Export a file to move it to another device."),
    h("div", { class: "row" }, h("button", { type: "button", class: "btn ghost small", onclick: download }, "Export"), h("button", { type: "button", class: "btn ghost small", onclick: () => file.click() }, "Import"), h("button", { type: "button", class: "btn ghost small", onclick: reset }, "Remove"), file),
  );
}

// ---------- Page ----------

function setTitle() {
  const { name } = load();
  if (name) title.replaceChildren(name);
}

function emptyState() {
  const file = settingsCard(load()).querySelector('input[type="file"]');
  return h(
    "section",
    { class: "card stack rise", style: "text-align:center; justify-items:center; padding: var(--s7) var(--s5)" },
    h("h2", {}, "No project yet"),
    h("p", { class: "muted", style: "max-width: 34rem" }, "Save a plan from Start a project, or track a repo from Understand my repo. Everything stays in this browser."),
    h("div", { class: "row", style: "justify-content:center" }, h("a", { class: "btn accent", href: "/kickoff" }, "Plan a project"), h("a", { class: "btn", href: "/repo" }, "Track a repo"), h("button", { type: "button", class: "btn ghost", onclick: () => file.click() }, "Import a file"), file),
  );
}

function render() {
  const p = load();
  setTitle();
  if (!hasProject(p)) {
    results.replaceChildren(emptyState(), conceptsCard(p));
    return;
  }
  results.replaceChildren(h("div", { class: "project-grid" }, h("div", { class: "stack" }, changesCard(p), planCard(p)), h("div", { class: "stack" }, conceptsCard(p), settingsCard(p))));
}

await loadConcepts();
render();
