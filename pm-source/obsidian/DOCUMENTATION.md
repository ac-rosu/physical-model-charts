# Physical Model Charts — Full Documentation

Render **ISA-88 physical models** (ANSI/ISA-88.00.01-2010, "Part 1", §4.4) from plain
text, the way Mermaid renders flowcharts. Write the equipment hierarchy of a plant,
line or machine as an indented outline in a ` ```physical ` code block and get a themed
SVG tree.

The same language works in every target: the Obsidian plugin, the VS Code Markdown
preview extension and the Fumadocs (Next.js + MDX) component.

## Contents

- [Installation](#installation)
- [Quick start](#quick-start)
- [Concepts (ISA-88)](#concepts-isa-88)
- [Syntax reference](#syntax-reference)
- [ISA-88 rules the parser enforces](#isa-88-rules-the-parser-enforces)
- [Layout](#layout)
- [Validation & error messages](#validation--error-messages)
- [Styling & theming](#styling--theming)
- [Building from source](#building-from-source)
- [Architecture](#architecture)
- [Known limitations](#known-limitations)

---

## Installation

Build with `npm run build:obsidian` (from the repository root), then copy the generated
files from `output/obsidian/` into your vault:

```
<your vault>/.obsidian/plugins/physical-model-charts/
  ├─ main.js
  ├─ manifest.json
  └─ styles.css
```

Then: **Settings → Community plugins → Reload**, and enable
**Physical Model Charts (ISA-88)**. (If Restricted Mode is on, turn it off first.)

---

## Quick start

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
      cm FT101 "Flow Meter"
    em CAP "Capper"
      cm M201 "Capper Drive"
      cm ZS201 "Cap Present"
  unit U2 "Labeler"
    em LAB "Label Applicator"
      cm M301 "Web Drive"
      cm TT301 "Glue Temperature"
```
````

Each line declares one equipment entity. **Indentation is the structure**: a line
indented deeper than the line above is contained in it.

---

## Concepts (ISA-88)

The physical model (Part 1 §4.4.2) has seven levels:

| Level | Keyword | Meaning (paraphrased from Part 1) |
|-------|---------|-----------------------------------|
| Enterprise | `enterprise` | One or more sites. Defined in ISA-95; drawn dashed. |
| Site | `site` | An organizational/business subdivision of the enterprise. Drawn dashed. |
| Area | `area` | A subdivision of a site. Drawn dashed. |
| Process cell | `cell` | Everything needed to make batches of one or more products; contains one or more units (§4.4.3.2). |
| Unit | `unit` / `machine` | Performs one or more major processing activities, usually around one major vessel (§4.4.3.3). In ISA-TR88.00.02 (PackML), a **machine is a unit**. |
| Equipment module | `em` | Performs minor processing activities (dosing, heating, agitation). May contain other EMs (§4.4.3.4). |
| Control module | `cm` | A basic control function: a sensor, actuator, control loop or valve header. May contain other CMs (§4.4.3.5). Sensors and actuators live only at this level. |

Enterprise, site and area are drawn **dashed**, as in Part 1 Figure 3. Their boundaries
are set by business criteria outside batch control. The four solid levels form the
**equipment entity model** (§4.4.3).

---

## Syntax reference

One statement per line. Comments: a line starting with `#`, or `//` anywhere outside a
quoted string.

### Entities

```
<level> [ID] ["Label"] [flags...]
```

- `ID` is an optional bare word (`U1`, `XV101`, `CIP_SKID`). It is shown in the box
  header, and `uses` and `train` refer to it. Ids must be unique.
- `"Label"` is the display name. Quote it. Without a label, the id is the label.
- The first bare word is always the id. Flags come **after** the id or label.

Level keywords and aliases:

| Level | Keywords |
|-------|----------|
| Enterprise | `enterprise`, `ent` |
| Site | `site` |
| Area | `area` |
| Process cell | `cell`, `processcell`, `process-cell`, `pc` |
| Unit | `unit`, `machine` (header reads *Machine (Unit)*) |
| Equipment module | `em`, `equipment`, `equipmentmodule`, `equipment-module` |
| Control module | `cm`, `control`, `controlmodule`, `control-module` |

### Containment by indentation

```
unit U1 "Filler"
  em DOS "Dosing"        // inside U1
    cm XV101 "Valve"     // inside DOS
  em CAP "Capper"        // back to inside U1
```

- Any amount of indentation works. A tab counts as 4 spaces.
- Several top-level entities are allowed. They are drawn side by side, which is useful
  for a partial model such as a few machines without their cell.

### Flags

| Flag | Allowed on | Meaning |
|------|-----------|---------|
| `shared` (`shared-use`) | unit, EM, CM | A **shared-use** common resource: several requesters can use it at once (§4.4.3.6). |
| `exclusive` (`exclusive-use`) | unit, EM, CM | An **exclusive-use** common resource: one requester at a time (§4.4.3.6). |
| `portable` | unit, EM, CM | Portable equipment that can move between process cells (§4.4.3.1). |
| `recipe-aware` (`aware`) | EM | A recipe-aware EM: it contains equipment phases that recipe phases can start directly (§5.3.4.4). |
| `generic` | EM | A generic EM: any EM that is not recipe-aware (§5.3.4.4). |

`shared` and `exclusive` cannot both be set, and neither can `recipe-aware` and `generic`.

### Notes

```
unit U1 "Filler"
  note "Rotary, 24 heads"
```

`note "text"` adds a wrapped, italic annotation inside the box of the entity **on the
line directly above** (or above an earlier `note` / `uses` of that entity). Its
indentation does not matter. Several `note` lines stack.

### Common-resource use

```
cell PC1
  em CIP "CIP Skid" shared
  unit U1 "Filler"
    uses CIP
```

`uses ID [ID...]` records that the entity above acquires or uses other entities. Units
and EMs may temporarily acquire common-use EMs and CMs (§4.4.3.3, §4.4.3.4). The box
shows `uses: CIP Skid`. Every target id must exist.

### Trains

```
cell PC1
  unit R1 "Reactor 1"
  unit R2 "Reactor 2"
  unit D1 "Dryer"
train "Train A" R1 D1
train "Train B" R2 D1
```

A **train** is a set of units (and their lower-level equipment) that can make a batch.
It is not a hierarchy level (§4.4.3.2). Trains may overlap, so a unit can belong to
several, but a train never extends beyond one process cell. Members must be units. Each
member unit shows `train: Train A` (or `trains: …`).

### Directives

| Directive | Effect |
|-----------|--------|
| `physical <title>` | Optional title, drawn above the model. Only one per block. |
| `direction TB` | Top-to-bottom tree (default; `TD` is accepted). |
| `direction LR` | Left-to-right tree. Good for deep hierarchies. |
| `wide` | In TB, lay leaf children side by side instead of stacking them. |
| `strict` | Also enforce the ISA-88 completeness rules (see below). |
| `use-colors` | Color each equipment level: process cells purple, units blue, equipment modules green, control modules orange. Enterprise, site and area stay muted. |
| `uniform-width` | Draw every entity box at the width of the widest box, for a uniform look. Aliases: `uniform`, `uniform width`. |

Directives may appear on any line.

---

## ISA-88 rules the parser enforces

**Always enforced** (Part 1 normative clauses):

1. **Levels may be omitted but never rearranged** (§4.4.2.5, §4.4.3.7). A child must sit
   at a lower level than its parent. A unit may contain a CM directly, but a CM can
   never contain an EM.
2. **Compound modules are allowed** (§4.4.3). An EM may contain EMs, and a CM may contain
   CMs.
3. **The site may not be omitted** (§4.4.2.5). An enterprise contains sites.
4. **The process cell may not be omitted** (§4.4.3.7). A unit, EM or CM under a site or
   area must sit inside a process cell. Skipping the *area* (site → cell) is allowed.
5. **A train stays within one process cell** (§4.4.3.2).

**With `strict`** (completeness rules; off by default so partial models render):

| Rule | Source |
|------|--------|
| An enterprise contains at least one site | Part 1 §4.4.2 |
| An area contains at least one process cell | Part 1 §4.4.2.4 |
| A process cell contains at least one unit | Part 1 §4.4.3.2 |
| A process cell contains at least one control module (directly or indirectly) | Part 1 §4.4.3.7 |

**Not modelled:** user-defined levels between process cell and unit, which Part 1
§4.4.3.7 allows as an expansion.

---

## Layout

- **TB (default)**: the root sits at the top and each containment level is one row, with
  every parent centred over its children. When all children of an entity are leaves,
  they are **stacked vertically** under a side rail and share one width, like an org
  chart. This keeps machine models with many control modules narrow. Use `wide` to
  turn stacking off.
- **LR**: the root sits on the left and each level is one column. Siblings stack
  vertically.

Boxes size to their text, clamped to a maximum width; longer labels and notes wrap. The
header shows the level name on the left and the id on the right. The id is hidden when
it equals the label.

A model shrinks to fit the note width, but never below 80% of its natural size, so text
stays readable. Past that it scrolls horizontally, and a model taller than 80% of the
window scrolls vertically. Scrollbars only appear when needed. PDF export can't scroll,
so there models shrink to fit the page instead.

To zoom a model, hover it and use the − / Fit / + controls in its bottom-right corner,
or hold `Ctrl`/`Cmd` and scroll (or pinch on a trackpad) to zoom around the pointer.
Zoom runs from 25% to 300% of the natural size; **Fit** returns to the default.

---

## Validation & error messages

Invalid source renders a red error box instead of a diagram, with a line number when
known.

| Message | Cause |
|---------|-------|
| `unknown statement: "…"` | The line doesn't start with a known keyword. |
| `unknown flag 'X' (…) — quote multi-word labels` | A bare word after the id that is not a flag, usually an unquoted label such as `unit Big Filler`. |
| `a Unit cannot contain a Process Cell — levels may be omitted but never rearranged` | Indentation puts a higher level inside a lower one. |
| `an Enterprise must contain Sites — the site level may not be omitted` | Something other than a site directly under an enterprise. |
| `a Unit must sit inside a Process Cell — the process cell may not be omitted` | A unit, EM or CM directly under an enterprise, site or area. |
| `'X' cannot be used on …` | A flag on a level that doesn't allow it. |
| `duplicate id 'X' (first used on line N)` | Two entities share an id. |
| `'note' must come right after an entity` | `note` / `uses` with no entity above it. |
| `'uses' target 'X' is not an entity id` | Unknown id in `uses`. |
| `train member 'X' is not a unit — a train groups units` | Train member isn't a unit. |
| `train 'T' spans more than one process cell` | Train members in different cells. |
| `strict: …` | A completeness rule failed (only with `strict`). |
| `missing closing quote` | Unbalanced `"`. |
| `model is empty` | No entities in the block. |

---

## Styling & theming

All colors come from Obsidian theme variables, so models follow light and dark themes
automatically. Override any of these classes in `styles.css`:

| Class | Element |
|-------|---------|
| `.pm-entity` | Group wrapping one entity box |
| `.pm-lvl-enterprise` … `.pm-lvl-cm` | Per-level group class (`enterprise`, `site`, `area`, `cell`, `unit`, `em`, `cm`) |
| `.pm-outer` | Added to enterprise, site and area (dashed by default) |
| `.pm-colored` | Added to the `<svg>` with `use-colors`; each level sets its hue in `--pm-level` |
| `.pm-box` | Box fill |
| `.pm-border` | Box outline |
| `.pm-header` / `.pm-header-rule` | Header band and its divider |
| `.pm-kind` / `.pm-id` | Level name and id in the header |
| `.pm-label` | Entity label |
| `.pm-meta` | Flags, `uses` and train lines |
| `.pm-note` | Note text |
| `.pm-line` | Containment connectors |
| `.pm-title` | Model title |
| `.pm-frame` | The code block element; holds the scroll box and the zoom toolbar |
| `.pm-container` | Scrollable block around the `<svg>` (`max-height: 80vh`) |
| `.pm-zoom-bar` | Zoom toolbar (− / Fit / +), shown while hovering the model |

For example, to highlight units:

```css
.pm-lvl-unit .pm-border { stroke-width: 2.5; }
```

Geometry constants (fonts, padding, gaps, min/max width, stacking indent) live at the
top of `pm-source/core/src/layout.ts`.

---

## Building from source

Requires Node 18+. All commands run from the **repository root**.

```bash
npm install
npm run build:obsidian   # type-checks (tsc) then bundles -> output/obsidian/
npm run dev              # watch-rebuild the Obsidian target
npm test                 # bundles and runs the parser/layout unit tests (node --test)
npm run lint             # eslint
npm run format           # prettier --write
```

Source layout (shared core + Obsidian adapter):

- `pm-source/core/src/parser.ts`: text DSL → model tree, with the ISA-88 rules
- `pm-source/core/src/layout.ts`: deterministic tree layout (no external layout library)
- `pm-source/core/src/render.ts`: layout → themed SVG
- `pm-source/core/src/renderString.ts`: the same renderer, emitting an SVG string without a DOM
- `pm-source/core/src/zoom.ts`: zoom toolbar and `Ctrl`/`Cmd` + wheel zoom for a rendered model
- `pm-source/obsidian/src/main.ts`: `registerMarkdownCodeBlockProcessor("physical", …)`

---

## Architecture

Three stages, like Mermaid:

1. **Parse**: `parsePhysical(source)` turns the DSL into a tree of entities, enforcing
   the ISA-88 containment rules and resolving `uses` and trains.
2. **Layout**: `layoutModel(model)` measures every box (canvas text measurement in the
   browser, a deterministic estimate on the server) and assigns absolute coordinates.
   Each subtree reserves a band along the breadth axis. TB and LR share one algorithm
   with swapped axes.
3. **Render**: `renderModel(model)` builds an SVG DOM element. `renderModelToString(model)`
   produces the same markup as a string (used by VS Code and Fumadocs). All theming
   comes from CSS classes.

Only `main.ts` depends on Obsidian. The parser, layout and renderer live in the shared
`@pm/core` package.

---

## Known limitations

- `uses` relationships are shown as text in the box, not as drawn connectors. Arrows
  across a tree would cross unrelated boxes.
- Trains are shown as a label on each member unit, not as an outline around the units,
  because trains may overlap.
- Subtrees are packed in bands (no contour interleaving), so a very deep, narrow subtree
  next to a wide one can leave empty space.
- User-defined levels (expansion between process cell and unit) are not supported.
