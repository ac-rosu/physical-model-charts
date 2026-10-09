import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePhysical, ParseError } from "../src/parser.ts";

function throwsAt(src: string, re: RegExp, line?: number) {
  assert.throws(
    () => parsePhysical(src),
    (e: unknown) => {
      assert.ok(e instanceof ParseError, "expected a ParseError");
      assert.match(e.message, re);
      if (line !== undefined) assert.equal(e.line, line);
      return true;
    }
  );
}

test("parses a full hierarchy from indentation", () => {
  const m = parsePhysical(`physical Plant
enterprise ACME "ACME Foods"
  site S1 "Rotterdam"
    area A1 "Packaging"
      cell PC1 "Line 1"
        unit U1 "Filler"
          em EM1 "Dosing"
            cm V101 "Valve V101"`);
  assert.equal(m.title, "Plant");
  assert.equal(m.direction, "TB");
  assert.equal(m.compact, true);
  assert.equal(m.roots.length, 1);
  const cm = m.roots[0].children[0].children[0].children[0].children[0].children[0].children[0];
  assert.equal(cm.level, "cm");
  assert.equal(cm.id, "V101");
  assert.equal(cm.label, "Valve V101");
});

test("siblings and dedent follow indentation", () => {
  const m = parsePhysical(`unit U1 "Filler"
  em A "Dosing"
    cm a1
    cm a2
  em B "Capping"
    cm b1`);
  const u = m.roots[0];
  assert.deepEqual(
    u.children.map((c) => c.label),
    ["Dosing", "Capping"]
  );
  assert.deepEqual(
    u.children[0].children.map((c) => c.label),
    ["a1", "a2"]
  );
  assert.equal(u.children[1].children.length, 1);
});

test("tabs count as indentation", () => {
  const m = parsePhysical(`unit U1\n\tem E1\n\t\tcm C1`);
  assert.equal(m.roots[0].children[0].children[0].id, "C1");
});

test("an id that matches a flag word is still an id", () => {
  const n = parsePhysical(`em Shared "CIP Skid" shared`).roots[0];
  assert.equal(n.id, "Shared");
  assert.deepEqual(n.flags, ["shared"]);
});

test("multiple top-level entities form a forest", () => {
  const m = parsePhysical(`unit U1\nunit U2\nem Shared`);
  assert.equal(m.roots.length, 3);
});

test("keyword aliases resolve; machine is a unit", () => {
  const m = parsePhysical(`process-cell PC
  machine M1 "Case Packer"
    equipment-module E
      control-module C`);
  const cell = m.roots[0];
  assert.equal(cell.level, "cell");
  assert.equal(cell.children[0].level, "unit");
  assert.equal(cell.children[0].kind, "Machine (Unit)");
  assert.equal(cell.children[0].children[0].level, "em");
  assert.equal(cell.children[0].children[0].children[0].level, "cm");
});

test("id-only entity uses the id as its label", () => {
  const n = parsePhysical(`cm XV101`).roots[0];
  assert.equal(n.id, "XV101");
  assert.equal(n.label, "XV101");
});

test("label-only entity has no id", () => {
  const n = parsePhysical(`unit "Big Filler"`).roots[0];
  assert.equal(n.id, "");
  assert.equal(n.label, "Big Filler");
});

test("unquoted multi-word labels are rejected with a hint", () => {
  throwsAt(`unit Big Filler`, /unknown flag 'Filler'.*quote multi-word labels/, 1);
});

test("flags parse and validate per level", () => {
  const m = parsePhysical(`cell PC
  em CIP "CIP Skid" shared portable
  em DOS "Dosing" recipe-aware`);
  assert.deepEqual(m.roots[0].children[0].flags, ["shared", "portable"]);
  assert.deepEqual(m.roots[0].children[1].flags, ["recipe-aware"]);
  throwsAt(`cm C "c" recipe-aware`, /'recipe-aware' cannot be used on a Control Module/);
  throwsAt(`area A shared`, /'shared' cannot be used on an Area/);
  throwsAt(`em E shared exclusive`, /either 'shared' or 'exclusive'/);
  throwsAt(`em E generic recipe-aware`, /either 'recipe-aware' or 'generic'/);
});

test("comments are ignored, but not inside quotes", () => {
  const m = parsePhysical(`# header comment
unit U1 "a // b" // trailing comment`);
  assert.equal(m.roots[0].label, "a // b");
});

test("levels may not be rearranged", () => {
  throwsAt(`unit U\n  cell C`, /a Unit cannot contain a Process Cell/, 2);
  throwsAt(`unit U\n  unit V`, /a Unit cannot contain a Unit/, 2);
  throwsAt(`cm C\n  em E`, /a Control Module cannot contain an Equipment Module/, 2);
});

test("compound modules are allowed", () => {
  const m = parsePhysical(`em E\n  em E2\n    cm C\n      cm C2`);
  assert.equal(m.roots[0].children[0].children[0].children[0].id, "C2");
});

test("levels may be omitted (unit contains a control module directly)", () => {
  const m = parsePhysical(`cell PC\n  unit U\n    cm C`);
  assert.equal(m.roots[0].children[0].children[0].level, "cm");
});

test("the site may not be omitted under an enterprise", () => {
  throwsAt(`enterprise E\n  area A`, /site level may not be omitted/, 2);
});

test("the process cell may not be omitted under an area", () => {
  throwsAt(`area A\n  unit U`, /must sit inside a Process Cell/, 2);
  throwsAt(`site S\n  em E`, /must sit inside a Process Cell/, 2);
  // site -> cell skips the area, which is allowed
  assert.equal(parsePhysical(`site S\n  cell C`).roots[0].children[0].level, "cell");
});

test("duplicate ids are rejected", () => {
  throwsAt(`unit U1\nunit U1`, /duplicate id 'U1' \(first used on line 1\)/, 2);
});

test("note and uses attach to the entity above", () => {
  const m = parsePhysical(`cell PC
  em CIP "CIP Skid" shared
  unit U1 "Filler"
    note "24 heads"
    uses CIP`);
  const u = m.roots[0].children[1];
  assert.deepEqual(u.notes, ["24 heads"]);
  assert.deepEqual(u.uses, ["CIP"]);
  assert.deepEqual(u.usesLabels, ["CIP Skid"]);
});

test("note / uses need an entity directly above", () => {
  throwsAt(`note "x"`, /'note' must come right after an entity/, 1);
  throwsAt(`unit U\ndirection LR\nnote "x"`, /'note' must come right after an entity/, 3);
  throwsAt(`unit U\nuses`, /needs at least one entity id/, 2);
});

test("uses targets must exist and not be self", () => {
  throwsAt(`unit U\n  uses NOPE`, /'uses' target 'NOPE' is not an entity id/, 2);
  throwsAt(`unit U\n  uses U`, /cannot use itself/, 2);
});

test("trains group units within one process cell", () => {
  const m = parsePhysical(`cell PC
  unit R1
  unit R2
  unit R3
train "Train A" R1 R2
train B R2 R3`);
  const [r1, r2, r3] = m.roots[0].children;
  assert.deepEqual(r1.trains, ["Train A"]);
  assert.deepEqual(r2.trains, ["Train A", "B"]);
  assert.deepEqual(r3.trains, ["B"]);
});

test("train validation", () => {
  throwsAt(`cell PC\n  unit R1\ntrain T`, /needs a label and at least one unit id/, 3);
  throwsAt(`cell PC\n  em E\ntrain T E`, /'E' is not a unit/, 3);
  throwsAt(`cell PC\n  unit R1\ntrain T X`, /'X' is not an entity id/, 3);
  throwsAt(
    `area A\n  cell P1\n    unit R1\n  cell P2\n    unit R2\ntrain T R1 R2`,
    /spans more than one process cell/,
    6
  );
  throwsAt(`cell PC\n  unit R1\ntrain T R1\ntrain T R1`, /duplicate train 'T'/, 4);
});

test("directives", () => {
  const m = parsePhysical(`direction LR\nwide\nunit U`);
  assert.equal(m.direction, "LR");
  assert.equal(m.compact, false);
  assert.equal(parsePhysical(`direction TD\nunit U`).direction, "TB");
  throwsAt(`direction up\nunit U`, /direction must be TB or LR/, 1);
  throwsAt(`physical A\nphysical B\nunit U`, /duplicate 'physical' title/, 2);
});

test("strict completeness rules", () => {
  // valid strict model
  parsePhysical(`strict
enterprise E
  site S
    area A
      cell PC
        unit U
          cm C`);
  throwsAt(`strict\nenterprise E`, /Enterprise 'E' must contain at least one site/, 2);
  throwsAt(`strict\narea A`, /must contain at least one process cell/, 2);
  throwsAt(`strict\ncell PC\n  em E\n    cm C`, /must contain at least one unit/, 2);
  throwsAt(`strict\ncell PC\n  unit U`, /must contain at least one control module/, 2);
  // without strict, partial models are fine
  parsePhysical(`cell PC\n  unit U`);
});

test("unknown statements and empty models error", () => {
  throwsAt(`widget W`, /unknown statement/, 1);
  throwsAt(`// nothing\n`, /model is empty/);
  throwsAt(`unit "open`, /missing closing quote/, 1);
});
