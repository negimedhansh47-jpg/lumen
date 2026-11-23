import { h } from "./render.js";

// Deterministic layout: one column per layer, left to right. No force simulation.
const ORDER = ["ui", "api", "logic", "data", "external"];
const LABELS = { ui: "Interface", api: "API", logic: "Logic", data: "Data", external: "External services", config: "Config" };
const SVG = "http://www.w3.org/2000/svg";
const svg = (tag, attrs = {}) => {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

const isNarrow = () => matchMedia("(max-width: 720px)").matches;

function geometry(a, b, layerA, layerB) {
  const mid = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  if (layerA === "config" || layerB === "config") {
    const down = layerB === "config";
    const p1 = { x: mid(a).x, y: down ? a.bottom : a.top };
    const p2 = { x: mid(b).x, y: down ? b.top : b.bottom };
    const dy = (p2.y - p1.y) / 2;
    return { d: `M${p1.x} ${p1.y} C${p1.x} ${p1.y + dy} ${p2.x} ${p2.y - dy} ${p2.x} ${p2.y}`, label: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 } };
  }
  const ia = ORDER.indexOf(layerA);
  const ib = ORDER.indexOf(layerB);
  if (ia === ib) {
    const p1 = { x: a.right, y: mid(a).y };
    const p2 = { x: b.right, y: mid(b).y };
    return { d: `M${p1.x} ${p1.y} C${p1.x + 44} ${p1.y} ${p2.x + 44} ${p2.y} ${p2.x} ${p2.y}`, label: { x: p1.x + 34, y: (p1.y + p2.y) / 2 } };
  }
  const forward = ia < ib;
  const p1 = { x: forward ? a.right : a.left, y: mid(a).y };
  const p2 = { x: forward ? b.left : b.right, y: mid(b).y };
  const dx = (p2.x - p1.x) / 2;
  return { d: `M${p1.x} ${p1.y} C${p1.x + dx} ${p1.y} ${p2.x - dx} ${p2.y} ${p2.x} ${p2.y}`, label: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 } };
}

/** Builds the map. Returns { el, select(id|null) }. */
export function renderMap(modules, edges, onSelect) {
  const byId = new Map(modules.map((m) => [m.id, m]));
  const nodeEls = new Map();
  let selected = null;

  const makeNode = (m, i) => {
    const el = h("button", { type: "button", class: `node layer-${m.layer}`, "aria-pressed": "false", style: `--i:${i}`, onclick: () => pick(m.id) }, h("b", {}, m.name), h("small", {}, m.role));
    nodeEls.set(m.id, el);
    return el;
  };

  let n = 0;
  const columns = ORDER.filter((l) => modules.some((m) => m.layer === l)).map((layer) =>
    h("div", { class: "map-col" }, h("h4", {}, LABELS[layer]), modules.filter((m) => m.layer === layer).map((m) => makeNode(m, n++))),
  );
  const config = modules.filter((m) => m.layer === "config");
  const colsEl = h("div", { class: "map-cols" }, columns);
  const configEl = config.length ? h("div", { class: "map-config" }, h("h4", { class: "label" }, LABELS.config), h("div", { class: "nodes" }, config.map((m) => makeNode(m, n++)))) : null;
  const edgesEl = svg("svg", { class: "edges", "aria-hidden": "true" });
  const el = h("div", { class: "map" }, edgesEl, colsEl, configEl);

  function draw() {
    edgesEl.replaceChildren();
    if (isNarrow()) return;
    const origin = el.getBoundingClientRect();
    const rel = (node) => {
      const r = node.getBoundingClientRect();
      return { left: r.left - origin.left, right: r.right - origin.left, top: r.top - origin.top, bottom: r.bottom - origin.top, width: r.width, height: r.height };
    };
    const defs = svg("defs");
    const marker = svg("marker", { id: "arrow", viewBox: "0 0 8 8", refX: "7", refY: "4", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" });
    marker.append(svg("path", { d: "M0 0 L8 4 L0 8 z", fill: "#7C98A6" }));
    defs.append(marker);
    edgesEl.append(defs);
    edges.forEach((e) => {
      const from = nodeEls.get(e.from);
      const to = nodeEls.get(e.to);
      if (!from || !to) return;
      const { d, label } = geometry(rel(from), rel(to), byId.get(e.from).layer, byId.get(e.to).layer);
      const g = svg("g", { class: "edge", "data-from": e.from, "data-to": e.to });
      const text = svg("text", { x: label.x, y: label.y - 6, "text-anchor": "middle" });
      text.textContent = e.label;
      const title = svg("title");
      title.textContent = `${byId.get(e.from).name} → ${byId.get(e.to).name}: ${e.label}`;
      g.append(svg("path", { class: "hit", d }), svg("path", { class: "line", d, "marker-end": "url(#arrow)" }), text, title);
      edgesEl.append(g);
    });
    paint();
  }

  function paint() {
    for (const [id, node] of nodeEls) {
      node.setAttribute("aria-pressed", String(id === selected));
      const linked = !selected || id === selected || edges.some((e) => (e.from === selected && e.to === id) || (e.to === selected && e.from === id));
      node.classList.toggle("dim", !linked);
    }
    edgesEl.querySelectorAll(".edge").forEach((g) => {
      const on = selected && (g.dataset.from === selected || g.dataset.to === selected);
      g.classList.toggle("on", Boolean(on));
      g.classList.toggle("dim", Boolean(selected) && !on);
    });
  }

  function pick(id) {
    selected = id;
    paint();
    onSelect(byId.get(id));
  }

  const resize = new ResizeObserver(() => (el.isConnected ? requestAnimationFrame(draw) : resize.disconnect())); // let a replaced map go
  resize.observe(el);
  requestAnimationFrame(draw);
  setTimeout(draw, 700); // once the entrance animation has settled

  return {
    el,
    select(id) {
      selected = id;
      paint();
    },
  };
}

