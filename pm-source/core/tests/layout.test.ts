import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePhysical } from "../src/parser.ts";
import { layoutModel } from "../src/layout.ts";
import type { Layout, RBox } from "../src/layout.ts";

// Minimal DOM shim so layout's canvas text measurement falls back deterministically
// (getContext returns null -> textWidth uses its estimate). Set before any
// layoutModel() call; the layout module only touches document lazily.
(globalThis as { document?: unknown }).document = {
  createElement: () => ({ getContext: () => null }),
};

const MACHINE = `physical Filling Line
cell PC1 "Line 1"
  em CIP "CIP Skid" shared
    cm CIP_P "Supply Pump"
  unit U1 "Filler"
    note "Rotary filler, 24 heads, with a long note that wraps across lines"
    uses CIP
    em DOS "Dosing" recipe-aware
      cm V101 "Valve V101"
      cm P101 "Pump P101"
      cm FT101 "Flow Meter FT101"
    em CAP "Capper"
      cm M201 "Capper Drive"
      cm S201 "Cap Present"
    cm TT01 "Bowl Temperature"
  unit U2 "Labeler"
    em LAB "Label Applicator"
      cm M301 "Web Drive"
      em LAB2 "Compound Glue Station"
        cm H301 "Heater"
        cm TT301 "Glue Temp"
  unit U3 "Case Packer"`;

function overlaps(a: RBox, b: RBox): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

function assertNoOverlap(L: Layout) {
  for (let i = 0; i < L.boxes.length; i++)
    for (let j = i + 1; j < L.boxes.length; j++)
      assert.ok(!overlaps(L.boxes[i], L.boxes[j]), `boxes ${i} and ${j} overlap`);
}

function assertInside(L: Layout) {
  for (const b of L.boxes) {
    assert.ok(b.x >= 0 && b.y >= 0, "box starts inside the canvas");
    assert.ok(b.x + b.w <= L.width && b.y + b.h <= L.height, "box ends inside the canvas");
  }
  for (const l of L.lines) {
    for (const v of [l.x1, l.x2]) assert.ok(v >= 0 && v <= L.width);
    for (const v of [l.y1, l.y2]) assert.ok(v >= 0 && v <= L.height);
  }
}

for (const [name, prefix] of [
  ["TB compact", ""],
  ["TB wide", "wide\n"],
  ["LR", "direction LR\n"],
] as const) {
  test(`${name}: every entity laid out, none overlap, all inside the canvas`, () => {
    const L = layoutModel(parsePhysical(prefix + MACHINE));
    assert.equal(L.boxes.length, 19);
    assertNoOverlap(L);
    assertInside(L);
    assert.ok(L.lines.length > 0);
  });
}

test("TB: children sit below their parent; LR: to its right", () => {
  const src = `unit U\n  em A\n  em B`;
  const tb = layoutModel(parsePhysical(src));
  const [u, a] = tb.boxes;
  assert.ok(a.y >= u.y + u.h);
  const lr = layoutModel(parsePhysical("direction LR\n" + src));
  assert.ok(lr.boxes[1].x >= lr.boxes[0].x + lr.boxes[0].w);
});

test("compact stacks leaf-only children vertically; wide puts them side by side", () => {
  const src = `em E\n  cm A\n  cm B "A much longer control module"\n  cm C`;
  const compact = layoutModel(parsePhysical(src));
  const [, a, b, c] = compact.boxes;
  assert.equal(a.x, b.x);
  assert.equal(b.x, c.x);
  assert.ok(a.w === b.w && b.w === c.w, "stacked siblings share one width");
  assert.ok(b.y > a.y && c.y > b.y);

  const wide = layoutModel(parsePhysical("wide\n" + src));
  const [, wa, wb, wc] = wide.boxes;
  assert.equal(wa.y, wb.y);
  assert.ok(wb.x > wa.x && wc.x > wb.x);
});

test("a parent is centred over its (non-stacked) children", () => {
  const L = layoutModel(parsePhysical(`wide\ncell PC\n  unit A\n  unit B`));
  const [pc, a, b] = L.boxes;
  const mid = (a.x + a.w / 2 + b.x + b.w / 2) / 2;
  assert.ok(Math.abs(pc.x + pc.w / 2 - mid) < 0.01);
});

test("a wide parent over narrow, uneven subtrees still does not overlap its neighbour", () => {
  const L = layoutModel(
    parsePhysical(`cell PC
  unit U1 "A very very long unit label that is wide"
    em E1 "x"
      cm a
      cm b
    em E2 "y"
  unit U2 "Neighbour"`)
  );
  assertNoOverlap(L);
});

test("outer levels are flagged for dashed rendering", () => {
  const L = layoutModel(parsePhysical(`enterprise E\n  site S\n    area A\n      cell PC`));
  assert.deepEqual(
    L.boxes.map((b) => b.outer),
    [true, true, true, false]
  );
});

test("long labels wrap inside a clamped width", () => {
  const L = layoutModel(
    parsePhysical(
      `unit "An extremely long unit label that certainly needs to wrap onto more lines"`
    )
  );
  const b = L.boxes[0];
  assert.ok(b.w <= 232);
  assert.ok(b.texts.filter((t) => t.cls === "pm-label").length >= 2);
});

test("header shows the level name and the id when it differs from the label", () => {
  const L = layoutModel(parsePhysical(`unit U1 "Filler"\nunit U2`));
  const kinds = (i: number) =>
    L.boxes[i].texts.filter((t) => t.cls === "pm-kind").map((t) => t.text);
  const ids = (i: number) => L.boxes[i].texts.filter((t) => t.cls === "pm-id").map((t) => t.text);
  assert.deepEqual(kinds(0), ["UNIT"]);
  assert.deepEqual(ids(0), ["U1"]);
  assert.deepEqual(ids(1), []); // label == id: not repeated in the header
});

test("meta lines show flags, uses and trains", () => {
  const L = layoutModel(
    parsePhysical(`cell PC
  em CIP "CIP" shared
  unit R1
    uses CIP
train "Train A" R1`)
  );
  const meta = L.boxes.flatMap((b) =>
    b.texts.filter((t) => t.cls === "pm-meta").map((t) => t.text)
  );
  assert.ok(meta.includes("shared-use"));
  assert.ok(meta.includes("uses: CIP"));
  assert.ok(meta.includes("train: Train A"));
});

test("title widens a narrow model and centres it", () => {
  const L = layoutModel(parsePhysical(`physical A Very Long Title For A Tiny Model Indeed\ncm C`));
  const b = L.boxes[0];
  assert.ok(Math.abs(b.x + b.w / 2 - L.width / 2) < 1);
});
