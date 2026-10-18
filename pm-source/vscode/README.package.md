# Physical Model Charts (ISA-88)

Render **ISA-88 physical models** (Enterprise → Site → Area → Process Cell → Unit →
Equipment Module → Control Module) from ` ```physical ` fenced code blocks directly in
the VS Code **Markdown preview**. Output is themed inline SVG, with no external
services, Mermaid-style.

````markdown
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

Open any Markdown file and run **Markdown: Open Preview** (`Ctrl+Shift+V`, or
`Ctrl+K V` for side-by-side). Every ` ```physical ` block renders as a tree that follows
your active color theme.

## Features

- **All seven ISA-88 levels.** Enterprise, site and area are drawn dashed, as in Part 1
  Figure 3. `machine` is accepted as a unit, following ISA-TR88.00.02 (PackML).
- **Indentation is structure.** Write the hierarchy as an outline.
- **Standard-aware validation.** Levels may be omitted but never rearranged, compound
  equipment and control modules are allowed, and the site and process cell may not be
  skipped. An opt-in `strict` mode adds the completeness rules.
- **Common resources.** Flag entities `shared`, `exclusive` or `portable`, mark EMs
  `recipe-aware` or `generic`, and record `uses` relationships.
- **Trains, ids and notes** are shown on each box.
- **Two layouts.** Top-down, with leaf modules stacked so large machines stay narrow,
  or left-to-right (`direction LR`).
- **Level colors.** Add `use-colors` to draw process cells purple, units blue,
  equipment modules green and control modules orange, from the theme's chart palette.
- **Theme-aware.** Colors map onto VS Code theme variables (light, dark and
  high-contrast).

## Syntax at a glance

| Construct | Example |
| --- | --- |
| Title | `physical Filling Line 1` |
| Entity | `unit U1 "Filler"`, `em DOS "Dosing" recipe-aware`, `cm XV101 "Valve"` |
| Level keywords | `enterprise` `site` `area` `cell` `unit`/`machine` `em` `cm` |
| Containment | indent a line deeper than its parent |
| Flags | `shared` `exclusive` `portable` `recipe-aware` `generic` |
| Note | `note "Rotary, 24 heads"` (attaches to the entity above) |
| Resource use | `uses CIP` |
| Train | `train "Train A" R1 D1` |
| Layout | `direction LR`, `wide` |
| Level colors | `use-colors` |
| Completeness checks | `strict` |

## Example — left-to-right

````markdown
```physical
direction LR
site S1 "Rotterdam"
  area A1 "Packaging"
    cell PC1 "Line 1"
      machine U1 "Case Packer"
        em EM1 "Infeed"
          cm M1 "Conveyor Drive"
      machine U2 "Palletizer"
```
````

## Notes

- Invalid source shows a red error box with the line number and the ISA-88 rule
  involved, instead of a diagram.
- Works alongside other Markdown preview extensions. Only `physical` fences are handled.

## License

MIT
