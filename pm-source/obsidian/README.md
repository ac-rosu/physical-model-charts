# Physical Model Charts (ISA-88) — Obsidian plugin

Render **ISA-88 physical models** (Enterprise → Site → Area → Process Cell → Unit →
Equipment Module → Control Module) from plain text inside Obsidian, the way Mermaid
renders flowcharts. Write a fenced ` ```physical ` block and the plugin draws a themed
SVG tree in both reading mode and live preview.

````
```physical
physical Filling Line 1
cell PC1 "Filling Line 1"
  em CIP "CIP Skid" shared
  unit U1 "Filler"
    uses CIP
    em DOS "Dosing" recipe-aware
      cm XV101 "Inlet Valve"
      cm P101 "Dosing Pump"
    em CAP "Capper"
      cm M201 "Capper Drive"
  unit U2 "Labeler"
```
````

Large models scroll instead of shrinking past readability. Hover a model for zoom
controls, or hold `Ctrl`/`Cmd` and scroll to zoom.

## Install

Build with `npm run build:obsidian` (from the repo root), then copy the three generated
files from `output/obsidian/` into your vault:

```
<your vault>/.obsidian/plugins/physical-model-charts/
  ├─ main.js
  ├─ manifest.json
  └─ styles.css
```

Then: **Settings → Community plugins → Reload**, and enable
**Physical Model Charts (ISA-88)**. (If Restricted Mode is on, turn it off first.)

## Syntax

Indentation is the structure: a line indented deeper than the line above is contained
in it. `//` and `#` start comments.

| Statement | Meaning |
|-----------|---------|
| `physical <title>` | Optional title. |
| `enterprise` / `site` / `area` / `cell` / `unit` / `machine` / `em` / `cm` `[ID] ["Label"] [flags]` | An equipment entity. `machine` is a unit (TR88: machine = unit). |
| `note "text"` | Annotation inside the box of the entity directly above. |
| `uses ID [ID...]` | The entity above acquires these common resources. |
| `train "Label" U1 U2 ...` | A train: units within one process cell. |
| `direction TB` / `direction LR` | Top-down (default) or left-to-right tree. |
| `wide` | Don't stack leaf children (TB). |
| `use-colors` | Color each level: process cell purple, unit blue, EM green, CM orange. |
| `uniform-width` | Draw every box at the width of the widest one, for a uniform look. Alias: `uniform`. |
| `strict` | Also enforce the ISA-88 completeness rules. |

Flags: `shared`, `exclusive`, `portable` (unit, EM, CM); `recipe-aware`, `generic` (EM).

The parser enforces the Part 1 containment rules: levels may be omitted but never
rearranged, compound EMs and CMs are allowed, and the site and process cell may not be
skipped. See [DOCUMENTATION.md](DOCUMENTATION.md) for the full reference, rules and
error messages.

## Styling

All colors come from Obsidian theme variables (`--interactive-accent`, `--text-normal`,
`--background-primary`, …), so models follow light and dark themes automatically. Each
entity is a `.pm-entity.pm-lvl-<level>` group, so you can restyle a single level in
`styles.css`. `use-colors` takes its hues from `--color-purple`, `--color-blue`,
`--color-green` and `--color-orange`.

## Releasing a new version

1. Bump `version` in `manifest.json` (and `minAppVersion` if it changed).
2. Add a `"<version>": "<minAppVersion>"` entry to `versions.json`.
3. Run `npm run build:obsidian` from the repo root, then publish the three files from
   `output/obsidian/` (`main.js`, `manifest.json`, `styles.css`). Either attach them to a
   GitHub release tagged with the exact version, or copy them into
   `<vault>/.obsidian/plugins/physical-model-charts/`.

## License

MIT
