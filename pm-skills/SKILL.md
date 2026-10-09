---
name: isa88-physical-model
description: Write ISA-88 (S88) physical model diagrams as `physical` code blocks for the Physical Model Charts renderers (Obsidian plugin, VS Code Markdown preview, Fumadocs component). Use this whenever the user wants to draw, write or edit an equipment hierarchy, a plant/line/machine breakdown, a physical model, or an equipment entity model, or asks how to structure enterprise / site / area / process cell / unit / machine / equipment module / control module, common resources, or trains — even if they don't say "physical model" explicitly. Also use it whenever a fenced ```physical code block appears or should be produced.
---

# ISA-88 Physical Model Charts

This skill produces **ISA-88 physical models** (ANSI/ISA-88.00.01-2010 §4.4) as text.
You write a fenced code block tagged `physical`, and the renderer draws a tree. Your job
is to emit **valid `physical` DSL that is correct under ISA-88**. You do not render
anything yourself.

Always wrap output in a `physical` fence:

    ```physical
    physical My Line
    cell PC1 "Line 1"
      unit U1 "Filler"
    ```

## Mental model (ISA-88)

Seven levels, top to bottom (Part 1 §4.4.2):

| Level | Keyword | Put here |
|-------|---------|----------|
| Enterprise | `enterprise` | The company. |
| Site | `site` | A plant / location. |
| Area | `area` | A department or building of the site. |
| Process cell | `cell` | Everything needed to make batches of one or more products, e.g. a production line. |
| Unit | `unit` or `machine` | A major processing activity, usually built around one major vessel or machine: reactor, filler, case packer. Per TR88, **machine = unit**. |
| Equipment module | `em` | A minor processing activity: dosing, heating, agitation, infeed, capping head. |
| Control module | `cm` | A basic control function: one valve, motor, sensor, PID loop or valve header. **All sensors and actuators live here.** |

Enterprise, site and area are drawn dashed because they sit outside batch control
(defined in ISA-95).

How to decompose a machine:

- The machine itself is the **unit**.
- Each functional section that performs a process action is an **EM**.
- Each individual device or loop is a **CM**.
- A device grouping without its own procedure, such as a valve header, can be a
  compound CM (CM inside CM).
- A section with sub-sections can be a compound EM (EM inside EM).

## Syntax reference

One statement per line. **Indentation defines containment.** Comments: `#` at line
start, or `//` anywhere outside quotes.

```
<level> [ID] ["Label"] [flags...]
```

- `ID`: an optional bare word (`U1`, `XV101`). Shown in the header and used by `uses`
  and `train`. Must be unique.
- `"Label"`: the display name. **Always quote labels**, because `unit Big Filler` is an
  error.
- Flags go **after** the id or label: `shared`, `exclusive`, `portable` (unit, EM, CM);
  `recipe-aware`, `generic` (EM only).
- `note "text"` on the line(s) after an entity adds an annotation inside its box.
- `uses ID [ID...]` after an entity records that it acquires those common resources.
- `train "Label" U1 U2 ...` declares a train (units within one process cell).
- `physical <title>` gives an optional title. `direction LR` switches to a left-to-right
  tree, and `wide` disables leaf stacking in TB. `strict` enables the completeness checks.

## Rules you must follow (the parser rejects violations)

1. **Never rearrange levels** (§4.4.2.5, §4.4.3.7). A child is always a lower level than
   its parent. Levels **may be skipped**: a unit may contain CMs directly.
2. **EM in EM and CM in CM are allowed** (compound modules). Nothing else may contain
   its own level.
3. **The site cannot be skipped** (§4.4.2.5). An `enterprise` contains only `site`s.
4. **The process cell cannot be skipped** (§4.4.3.7). A unit, EM or CM under a site or
   area must be inside a `cell`. Site → cell (skipping the area) is fine.
5. **Trains** contain only units, all from the same process cell (§4.4.3.2).
6. Ids are unique, and `uses` and `train` targets must exist.

With `strict` the parser also requires the following. Use it when the user asks for a
complete or standard-compliant model:

- an enterprise contains at least one site
- an area contains at least one cell (§4.4.2.4)
- a cell contains at least one unit (§4.4.3.2)
- a cell contains at least one CM somewhere below it (§4.4.3.7)

## Choosing constructs

- **Shared utility** (CIP skid, heating/cooling supply, raw-material header) used by
  several units: put it **directly under the process cell** as an `em` or `cm`, flag it
  `shared` (several users at once) or `exclusive` (one at a time). Then add
  `uses <id>` under each unit that acquires it (§4.4.3.6).
- **Recipe-aware vs generic EM**: `recipe-aware` if recipe phases start its equipment
  phase directly, and `generic` otherwise (§5.3.4.4). Omit both if unknown.
- **Packaging line of machines**: one `cell` for the line, one `machine` per machine.
- **Only one machine**: start the model at `machine`. A partial model doesn't need the
  levels above it.
- **Deep or wide model**: use `direction LR` for 6–7 levels or very long labels. TB
  stacks CMs automatically, so it stays narrow for typical machines.

## Output checklist

- [ ] Wrapped in a ```` ```physical ```` fence
- [ ] Indentation consistent and every child deeper than its parent
- [ ] All labels quoted; ids unique; flags after the label
- [ ] Sensors and actuators only at CM level
- [ ] No level placed under a lower level; site and process cell never skipped

See [references/examples.md](references/examples.md) for complete worked examples.
