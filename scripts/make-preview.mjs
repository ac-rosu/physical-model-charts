// Renders sample physical models to assets/*.png for the README.
// Bundles @pm/core on the fly (its source is TS), renders each model to an SVG
// string, injects a concrete light theme (the runtime CSS uses host theme
// variables), then rasterises with resvg. Run with: npm run preview
import esbuild from "esbuild";
import { Resvg } from "@resvg/resvg-js";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import builtins from "builtin-modules";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const MODELS = {
  "pm-example.png": `physical Filling Line 1
cell PC1 "Filling Line 1"
  em CIP "CIP Skid" shared
  unit U1 "Filler"
    uses CIP
    em DOS "Dosing" recipe-aware
      cm XV101 "Inlet Valve"
      cm P101 "Dosing Pump"
      cm FT101 "Flow Meter"
    em CAP "Capper"
      cm M201 "Capper Drive"
      cm ZS201 "Cap Present"
  unit U2 "Labeler"
    em LAB "Label Applicator"
      cm M301 "Web Drive"
      cm TT301 "Glue Temperature"`,
  "pm-example-lr.png": `physical Packaging Area
direction LR
site S1 "Rotterdam"
  area A1 "Packaging"
    cell PC1 "Line 1"
      machine U1 "Case Packer"
        em EM1 "Infeed"
          cm M1 "Conveyor Drive"
        em EM2 "Erector"
      machine U2 "Palletizer"`,
};

// Concrete light theme mirroring pm-preview.css (GitHub-friendly).
const CSS = `
.pm-line{stroke:#6e7781;stroke-width:1.5}
.pm-box{fill:#ffffff;stroke:none}
.pm-header{fill:#0f766e;fill-opacity:.14;stroke:none}
.pm-header-rule{stroke:#0f766e;stroke-opacity:.45;stroke-width:1}
.pm-border{fill:none;stroke:#0f766e;stroke-width:1.5}
.pm-outer .pm-border{stroke:#6e7781;stroke-dasharray:6 4}
.pm-outer .pm-header{fill:#6e7781;fill-opacity:.1}
.pm-outer .pm-header-rule{stroke:#6e7781}
.pm-outer .pm-kind{fill:#6e7781}
.pm-kind{fill:#0f766e;font-weight:700}
.pm-id{fill:#6e7781;font-weight:600}
.pm-label{fill:#1f2328;font-weight:600}
.pm-meta{fill:#0f766e}
.pm-note{fill:#6e7781;font-style:italic}
.pm-title{fill:#1f2328;font-weight:700}`;

// Bundle the TS core to a temp ESM module we can import.
const out = join(mkdtempSync(join(tmpdir(), "pm-preview-")), "core.mjs");
await esbuild.build({
  stdin: {
    contents: `export { parsePhysical, renderModelToString } from "./pm-source/core/src/index.ts";`,
    resolveDir: root,
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node18",
  outfile: out,
  external: [...builtins],
  logLevel: "warning",
});

const { parsePhysical, renderModelToString } = await import(pathToFileURL(out).href);

const dest = join(root, "assets");
mkdirSync(dest, { recursive: true });

for (const [file, source] of Object.entries(MODELS)) {
  const svg = renderModelToString(parsePhysical(source));
  const [, w, h] = svg.match(/width="(\d+)" height="(\d+)"/);
  const W = Number(w);
  const H = Number(h);
  const P = 24;
  const OW = W + 2 * P;
  const OH = H + 2 * P;

  const framed =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OW}" height="${OH}" viewBox="0 0 ${OW} ${OH}">` +
    `<style>${CSS}</style>` +
    `<rect x="0" y="0" width="${OW}" height="${OH}" rx="12" fill="#ffffff"/>` +
    svg.replace("<svg ", `<svg x="${P}" y="${P}" `) +
    `</svg>`;

  const png = new Resvg(framed, {
    fitTo: { mode: "width", value: OW * 2 },
    font: { defaultFontFamily: "Arial", loadSystemFonts: true },
  })
    .render()
    .asPng();

  writeFileSync(join(dest, file), png);
  console.log(`wrote assets/${file} (${OW * 2}x${OH * 2})`);
}
