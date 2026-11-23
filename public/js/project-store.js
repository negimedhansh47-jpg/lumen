// "My project" lives only in this browser (localStorage). Nothing here is ever sent to the server.
const KEY = "lumen-project";
const str = (v, max) => (typeof v === "string" ? v.slice(0, max) : "");
const strs = (v, max, len) => (Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, max).map((x) => x.slice(0, len)) : []);

/** Shape-checks anything read from storage or an imported file, so bad data cannot break the page. */
export function clean(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const plan = r.plan && typeof r.plan === "object" ? { restatement: str(r.plan.restatement, 500), firstSteps: strs(r.plan.firstSteps, 12, 400), claudeMd: str(r.plan.claudeMd, 8000) } : null;
  return {
    v: 1,
    name: str(r.name, 80),
    repo: /^[\w.-]+\/[\w.-]+$/.test(r.repo ?? "") ? r.repo : "",
    plan: plan?.restatement ? plan : null,
    done: Array.isArray(r.done) ? r.done.filter((n) => Number.isInteger(n) && n >= 0 && n < 12) : [],
    lastSeenSha: /^[0-9a-f]{7,40}$/i.test(r.lastSeenSha ?? "") ? r.lastSeenSha : "",
    learned: strs(r.learned, 100, 40),
    updated: Number.isFinite(r.updated) ? r.updated : 0,
  };
}

export function load() {
  try {
    return clean(JSON.parse(localStorage.getItem(KEY) ?? "{}"));
  } catch {
    return clean({});
  }
}

export function save(patch) {
  const next = clean({ ...load(), ...patch, updated: Date.now() });
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage blocked or full: the project just will not persist
  }
  return next;
}

export const hasProject = (p = load()) => Boolean(p.repo || p.plan);

export function learn(conceptId) {
  const p = load();
  if (!p.learned.includes(conceptId)) save({ learned: [...p.learned, conceptId] });
}

export function clear() {
  const { learned } = load(); // concepts you have learned stay yours
  try {
    localStorage.setItem(KEY, JSON.stringify(clean({ learned })));
  } catch {
    // nothing to clear
  }
}
