import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePhysical } from "../src/parser.ts";
import { renderModelToString } from "../src/renderString.ts";

test("renders a standalone <svg> string with dimensions", () => {
  const svg = renderModelToString(parsePhysical(`physical T\nunit U\n  em E\n    cm C`));
  assert.match(svg, /^<svg /);
  assert.match(svg, /<\/svg>$/);
  assert.match(svg, /width="\d+"/);
  assert.match(svg, /viewBox="0 0 \d+ \d+"/);
  assert.match(svg, /class="pm-box"/);
  assert.match(svg, /class="pm-entity pm-lvl-unit"/);
  assert.match(svg, /class="pm-line"/);
});

test("outer levels get the pm-outer class", () => {
  const svg = renderModelToString(parsePhysical(`site S\n  cell C`));
  assert.match(svg, /class="pm-entity pm-lvl-site pm-outer"/);
  assert.match(svg, /class="pm-entity pm-lvl-cell"/);
});

test("use-colors tags the svg with pm-colored", () => {
  assert.match(renderModelToString(parsePhysical(`unit U`)), /^<svg class="pm-svg"/);
  assert.match(
    renderModelToString(parsePhysical(`use-colors\nunit U`)),
    /^<svg class="pm-svg pm-colored"/
  );
});

test("escapes text content (no raw markup injection)", () => {
  const svg = renderModelToString(parsePhysical(`unit "a<b>&c"\n  note "<script>"`));
  assert.ok(!svg.includes("<b>"), "raw tag must not appear");
  assert.ok(!svg.includes("<script>"), "raw tag must not appear");
  assert.match(svg, /a&lt;b&gt;&amp;c/);
});

test("renders every construct without throwing", () => {
  const svg = renderModelToString(
    parsePhysical(`physical All
direction LR
enterprise E
  site S
    area A
      cell PC
        em CIP "CIP" shared portable
        machine M1 "Packer"
          note "n"
          uses CIP
          em E1 recipe-aware
            em E2 generic
              cm C1
                cm C2
train "T" M1`)
  );
  assert.match(svg, /MACHINE \(UNIT\)/);
  assert.match(svg, /class="pm-note"/);
  assert.match(svg, /class="pm-meta"/);
  assert.ok(svg.length > 100);
});
