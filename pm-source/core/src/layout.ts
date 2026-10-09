// Deterministic tree layout for ISA-88 physical models.
// Produces absolutely-positioned primitives; no external layout library.
//
// The tree is laid out along two axes: DEPTH (containment level) and BREADTH
// (siblings). TB maps depth to y; LR maps depth to x. Each subtree reserves a
// breadth band wide enough for itself and its children, and a parent is centred
// over its children. In TB "compact" mode, an entity whose children are all
// leaves stacks them vertically under a side rail (org-chart style), which keeps
// models with many control modules narrow.

import { PmModel, PmNode, Level, Flag } from "./parser";

// ---- tunable geometry -------------------------------------------------------
const FONT = "sans-serif";
const TITLE_FONT = 15;
const KIND_FONT = 10; // level name in the header band
const LABEL_FONT = 13;
const META_FONT = 11; // flags / uses / train lines
const NOTE_FONT = 11;

const LABEL_LH = 17;
const META_LH = 15;
const NOTE_LH = 15;

const HEADER_H = 20;
const PAD_X = 12;
const PAD_Y = 8;
const SECTION_GAP = 4; // between label, meta and note blocks
const HEADER_ID_GAP = 12; // between the level name and the id in the header

const MIN_W = 132;
const MAX_W = 232;

const TB_LEVEL_GAP = 40; // vertical gap between depth rows (TB)
const LR_LEVEL_GAP = 56; // horizontal gap between depth columns (LR)
const SIB_GAP = 18; // gap between sibling subtrees
const ROOT_GAP = 36; // gap between top-level trees

const STACK_INDENT = 24; // stacked children sit this far right of their parent
const STACK_TOP = 14; // gap between a parent and its first stacked child
const STACK_GAP = 10; // gap between stacked children

const MARGIN = 24;
const TITLE_H = 34;
// ----------------------------------------------------------------------------

export interface RText {
  x: number; // relative to the box origin
  y: number; // line centre, relative to the box origin
  text: string;
  cls: string;
  size: number;
  anchor: "start" | "middle" | "end";
}

export interface RBox {
  x: number;
  y: number;
  w: number;
  h: number;
  level: Level;
  outer: boolean; // enterprise / site / area — outside the equipment entity model
  headerH: number;
  texts: RText[];
}

export interface RLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Layout {
  width: number;
  height: number;
  title: string;
  titleY: number;
  boxes: RBox[];
  lines: RLine[];
  titleFont: number;
  fontFamily: string;
}

// text measurement via a shared canvas (works in Obsidian desktop + mobile DOM)
let _ctx: CanvasRenderingContext2D | null = null;

// Width estimate used when no canvas is available (server-side rendering). Errs
// slightly wide so labels never overflow their boxes.
function estimateWidth(text: string, px: number, bold: boolean): number {
  let w = 0;
  for (const ch of text) {
    if (ch === " ") w += 0.28;
    else if ("il.,:;'|!()[]{}jI".includes(ch)) w += 0.3;
    else if ("ftr-".includes(ch)) w += 0.36;
    else if ("mwMW@%".includes(ch)) w += 0.86;
    else if (ch >= "A" && ch <= "Z") w += 0.68;
    else if (ch >= "0" && ch <= "9") w += 0.56;
    else if (ch.charCodeAt(0) > 0x2000) w += 0.8;
    else w += 0.53;
  }
  return w * px * (bold ? 1.07 : 1);
}

function textWidth(text: string, px: number, bold = false): number {
  if (!text) return 0;
  if (!_ctx) {
    const c = document.createElement("canvas");
    _ctx = c.getContext("2d");
  }
  if (!_ctx) return estimateWidth(text, px, bold);
  _ctx.font = `${bold ? "600 " : ""}${px}px ${FONT}`;
  return _ctx.measureText(text).width;
}

// wrap text to fit a pixel width; a word too long for a line is broken between characters
function wrapText(text: string, px: number, maxW: number, bold = false): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    if (textWidth(word, px, bold) > maxW) {
      if (cur) {
        lines.push(cur);
        cur = "";
      }
      let chunk = "";
      for (const ch of word) {
        if (chunk && textWidth(chunk + ch, px, bold) > maxW) {
          lines.push(chunk);
          chunk = "";
        }
        chunk += ch;
      }
      cur = chunk;
      continue;
    }
    const trial = cur ? cur + " " + word : word;
    if (textWidth(trial, px, bold) <= maxW || !cur) cur = trial;
    else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [text];
}

const FLAG_TEXT: Record<Flag, string> = {
  shared: "shared-use",
  exclusive: "exclusive-use",
  portable: "portable",
  "recipe-aware": "recipe-aware",
  generic: "generic",
};

const OUTER: Level[] = ["enterprise", "site", "area"];

interface Measured {
  w: number;
  h: number;
  texts: RText[];
}

// minW lets a group of stacked siblings share one width
function measureEntity(node: PmNode, minW = 0): Measured {
  const kind = node.kind.toUpperCase();
  const showId = node.id && node.id !== node.label;
  const headerW =
    textWidth(kind, KIND_FONT, true) +
    (showId ? HEADER_ID_GAP + textWidth(node.id, KIND_FONT, true) : 0) +
    2 * PAD_X;

  const meta: string[] = [];
  if (node.flags.length) meta.push(node.flags.map((f) => FLAG_TEXT[f]).join(" · "));
  if (node.usesLabels.length) meta.push("uses: " + node.usesLabels.join(", "));
  if (node.trains.length)
    meta.push((node.trains.length > 1 ? "trains: " : "train: ") + node.trains.join(", "));

  // natural (unwrapped) width decides the box width, clamped to [MIN_W, MAX_W]
  const natural = Math.max(
    textWidth(node.label, LABEL_FONT, true),
    ...meta.map((m) => textWidth(m, META_FONT)),
    ...node.notes.map((t) => textWidth(t, NOTE_FONT))
  );
  const w = Math.ceil(
    Math.max(minW, headerW, Math.min(MAX_W, Math.max(MIN_W, natural + 2 * PAD_X)))
  );
  const inner = w - 2 * PAD_X;

  const texts: RText[] = [];
  texts.push({
    x: PAD_X,
    y: HEADER_H / 2,
    text: kind,
    cls: "pm-kind",
    size: KIND_FONT,
    anchor: "start",
  });
  if (showId)
    texts.push({
      x: w - PAD_X,
      y: HEADER_H / 2,
      text: node.id,
      cls: "pm-id",
      size: KIND_FONT,
      anchor: "end",
    });

  let y = HEADER_H + PAD_Y;
  for (const ln of wrapText(node.label, LABEL_FONT, inner, true)) {
    texts.push({
      x: w / 2,
      y: y + LABEL_LH / 2,
      text: ln,
      cls: "pm-label",
      size: LABEL_FONT,
      anchor: "middle",
    });
    y += LABEL_LH;
  }
  if (meta.length) {
    y += SECTION_GAP;
    for (const m of meta)
      for (const ln of wrapText(m, META_FONT, inner)) {
        texts.push({
          x: w / 2,
          y: y + META_LH / 2,
          text: ln,
          cls: "pm-meta",
          size: META_FONT,
          anchor: "middle",
        });
        y += META_LH;
      }
  }
  if (node.notes.length) {
    y += SECTION_GAP;
    for (const nt of node.notes)
      for (const ln of wrapText(nt, NOTE_FONT, inner)) {
        texts.push({
          x: w / 2,
          y: y + NOTE_LH / 2,
          text: ln,
          cls: "pm-note",
          size: NOTE_FONT,
          anchor: "middle",
        });
        y += NOTE_LH;
      }
  }
  return { w, h: Math.ceil(y + PAD_Y), texts };
}

interface LBox {
  node: PmNode;
  m: Measured;
  depth: number;
  kids: LBox[];
  stack: boolean; // children are stacked vertically under a side rail
  ext: number; // breadth reserved for the subtree
  centerOff: number; // node centre, relative to the subtree's breadth start
  childShift: number; // children start, relative to the subtree's breadth start
  x: number;
  y: number;
}

export function layoutModel(model: PmModel): Layout {
  const TB = model.direction === "TB";
  const levelGap = TB ? TB_LEVEL_GAP : LR_LEVEL_GAP;
  const bd = (b: LBox) => (TB ? b.m.w : b.m.h); // breadth dimension
  const dd = (b: LBox) => (TB ? b.m.h : b.m.w); // depth dimension

  const build = (node: PmNode, depth: number): LBox => {
    const kids = node.children.map((c) => build(c, depth + 1));
    const stack = TB && model.compact && kids.length >= 2 && kids.every((k) => k.kids.length === 0);
    if (stack) {
      const w = Math.max(...kids.map((k) => k.m.w));
      for (const k of kids) if (k.m.w < w) k.m = measureEntity(k.node, w);
    }
    return {
      node,
      m: measureEntity(node),
      depth,
      kids,
      stack,
      ext: 0,
      centerOff: 0,
      childShift: 0,
      x: 0,
      y: 0,
    };
  };
  const roots = model.roots.map((r) => build(r, 0));

  // depth bands: one row (TB) / column (LR) per containment depth, sized to its
  // largest entity; stacked children hang below their parent instead.
  const depthSize: number[] = [];
  const sizeBands = (b: LBox, stacked: boolean) => {
    if (!stacked) depthSize[b.depth] = Math.max(depthSize[b.depth] ?? 0, dd(b));
    b.kids.forEach((k) => sizeBands(k, b.stack));
  };
  roots.forEach((r) => sizeBands(r, false));
  const depthPos: number[] = [0];
  for (let d = 0; d < depthSize.length; d++)
    depthPos[d + 1] = depthPos[d] + (depthSize[d] ?? 0) + levelGap;

  // breadth extents, bottom-up
  const measureExt = (b: LBox) => {
    if (b.stack) {
      b.ext = Math.max(b.m.w, STACK_INDENT + Math.max(...b.kids.map((k) => k.m.w)));
      b.centerOff = b.m.w / 2;
      return;
    }
    if (!b.kids.length) {
      b.ext = bd(b);
      b.centerOff = bd(b) / 2;
      return;
    }
    b.kids.forEach(measureExt);
    let pos = 0;
    const centers: number[] = [];
    for (const k of b.kids) {
      centers.push(pos + k.centerOff);
      pos += k.ext + SIB_GAP;
    }
    const span = pos - SIB_GAP;
    const c = (centers[0] + centers[centers.length - 1]) / 2;
    const left = Math.min(0, c - bd(b) / 2);
    const right = Math.max(span, c + bd(b) / 2);
    b.ext = right - left;
    b.centerOff = c - left;
    b.childShift = -left;
  };

  // positions, top-down
  const place = (b: LBox, start: number) => {
    const center = start + b.centerOff;
    if (TB) {
      b.x = center - b.m.w / 2;
      b.y = depthPos[b.depth];
    } else {
      b.x = depthPos[b.depth];
      b.y = center - b.m.h / 2;
    }
    if (b.stack) {
      let y = b.y + b.m.h + STACK_TOP;
      for (const k of b.kids) {
        k.x = b.x + STACK_INDENT;
        k.y = y;
        y += k.m.h + STACK_GAP;
      }
      return;
    }
    let pos = start + b.childShift;
    for (const k of b.kids) {
      place(k, pos);
      pos += k.ext + SIB_GAP;
    }
  };

  let pos = 0;
  for (const r of roots) {
    measureExt(r);
    place(r, pos);
    pos += r.ext + ROOT_GAP;
  }

  // connectors
  const lines: RLine[] = [];
  const connect = (b: LBox) => {
    if (!b.kids.length) return;
    if (b.stack) {
      const railX = b.x + STACK_INDENT / 2;
      const last = b.kids[b.kids.length - 1];
      lines.push({ x1: railX, y1: b.y + b.m.h, x2: railX, y2: last.y + last.m.h / 2 });
      for (const k of b.kids)
        lines.push({ x1: railX, y1: k.y + k.m.h / 2, x2: k.x, y2: k.y + k.m.h / 2 });
      return;
    }
    const bus = depthPos[b.depth + 1] - levelGap / 2;
    if (TB) {
      const px = b.x + b.m.w / 2;
      const cxs = b.kids.map((k) => k.x + k.m.w / 2);
      lines.push({ x1: px, y1: b.y + b.m.h, x2: px, y2: bus });
      const lo = Math.min(px, ...cxs);
      const hi = Math.max(px, ...cxs);
      if (hi - lo > 0.5) lines.push({ x1: lo, y1: bus, x2: hi, y2: bus });
      b.kids.forEach((k, i) => lines.push({ x1: cxs[i], y1: bus, x2: cxs[i], y2: k.y }));
    } else {
      const py = b.y + b.m.h / 2;
      const cys = b.kids.map((k) => k.y + k.m.h / 2);
      lines.push({ x1: b.x + b.m.w, y1: py, x2: bus, y2: py });
      const lo = Math.min(py, ...cys);
      const hi = Math.max(py, ...cys);
      if (hi - lo > 0.5) lines.push({ x1: bus, y1: lo, x2: bus, y2: hi });
      b.kids.forEach((k, i) => lines.push({ x1: bus, y1: cys[i], x2: k.x, y2: cys[i] }));
    }
    b.kids.forEach(connect);
  };
  roots.forEach(connect);

  // collect boxes and fit everything inside the margins (below the title)
  const all: LBox[] = [];
  const collect = (b: LBox) => {
    all.push(b);
    b.kids.forEach(collect);
  };
  roots.forEach(collect);
  const contentW = Math.max(...all.map((b) => b.x + b.m.w));
  const contentH = Math.max(...all.map((b) => b.y + b.m.h));
  const titleW = model.title ? textWidth(model.title, TITLE_FONT, true) : 0;
  const ox = MARGIN + Math.max(0, (titleW - contentW) / 2);
  const oy = MARGIN + (model.title ? TITLE_H : 0);

  const width = Math.ceil(Math.max(contentW, titleW) + 2 * MARGIN);
  return {
    width,
    height: Math.ceil(oy + contentH + MARGIN),
    title: model.title,
    titleY: MARGIN + TITLE_FONT,
    boxes: all.map((b) => ({
      x: b.x + ox,
      y: b.y + oy,
      w: b.m.w,
      h: b.m.h,
      level: b.node.level,
      outer: OUTER.includes(b.node.level),
      headerH: HEADER_H,
      texts: b.m.texts,
    })),
    lines: lines.map((l) => ({ x1: l.x1 + ox, y1: l.y1 + oy, x2: l.x2 + ox, y2: l.y2 + oy })),
    titleFont: TITLE_FONT,
    fontFamily: FONT,
  };
}
