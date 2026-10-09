// Turns a parsed physical model into a themed SVG DOM element.

import { PmModel } from "./parser";
import { layoutModel, Layout } from "./layout";

const SVGNS = "http://www.w3.org/2000/svg";
const RADIUS = 4;

function svgEl(name: string, attrs: Record<string, string | number>): SVGElement {
  const e = document.createElementNS(SVGNS, name);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  return e;
}

// header band: a rectangle with only its top corners rounded, matching the box
function headerPath(x: number, y: number, w: number, h: number, r: number): string {
  return (
    `M ${x} ${y + h} L ${x} ${y + r} A ${r} ${r} 0 0 1 ${x + r} ${y} ` +
    `L ${x + w - r} ${y} A ${r} ${r} 0 0 1 ${x + w} ${y + r} L ${x + w} ${y + h} Z`
  );
}

export function renderModel(model: PmModel): SVGElement {
  const L: Layout = layoutModel(model);

  const svg = svgEl("svg", {
    class: "pm-svg",
    width: L.width,
    height: L.height,
    viewBox: `0 0 ${L.width} ${L.height}`,
    xmlns: SVGNS,
  });

  if (L.title) {
    const t = svgEl("text", {
      x: L.width / 2,
      y: L.titleY,
      class: "pm-title",
      "text-anchor": "middle",
      "font-size": L.titleFont,
      "font-family": L.fontFamily,
    });
    t.textContent = L.title;
    svg.appendChild(t);
  }

  // containment connectors first, so entity boxes sit on top
  for (const ln of L.lines)
    svg.appendChild(
      svgEl("line", { x1: ln.x1, y1: ln.y1, x2: ln.x2, y2: ln.y2, class: "pm-line" })
    );

  for (const b of L.boxes) {
    const g = svgEl("g", { class: `pm-entity pm-lvl-${b.level}${b.outer ? " pm-outer" : ""}` });
    g.appendChild(
      svgEl("rect", { x: b.x, y: b.y, width: b.w, height: b.h, rx: RADIUS, class: "pm-box" })
    );
    g.appendChild(
      svgEl("path", { d: headerPath(b.x, b.y, b.w, b.headerH, RADIUS), class: "pm-header" })
    );
    g.appendChild(
      svgEl("line", {
        x1: b.x,
        y1: b.y + b.headerH,
        x2: b.x + b.w,
        y2: b.y + b.headerH,
        class: "pm-header-rule",
      })
    );
    // outline drawn last so the header band never covers it
    g.appendChild(
      svgEl("rect", { x: b.x, y: b.y, width: b.w, height: b.h, rx: RADIUS, class: "pm-border" })
    );
    for (const t of b.texts) {
      const el = svgEl("text", {
        x: b.x + t.x,
        y: b.y + t.y,
        class: t.cls,
        "text-anchor": t.anchor,
        "dominant-baseline": "central",
        "font-size": t.size,
        "font-family": L.fontFamily,
      });
      el.textContent = t.text;
      g.appendChild(el);
    }
    svg.appendChild(g);
  }

  return svg;
}
