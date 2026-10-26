# Change Log

## 1.3.1

- Fix: double-clicking the zoom buttons or a scrollbar no longer switches from the
  preview to the editor.

## 1.3.0

- Large models stay readable: a model shrinks to fit the preview, but never below 80%
  of its natural size. Past that it scrolls sideways, and models taller than 80% of
  the preview height scroll vertically. Scrollbars only appear when needed.
- Zoom each model: hover it for − / Fit / + controls, or hold `Ctrl`/`Cmd` and scroll
  (or pinch on a trackpad) to zoom around the pointer, from 25% to 300%. A model keeps
  its zoom while you edit the document.

## 1.2.0

- New `uniform-width` chart directive (alias `uniform`): draws every entity box at the
  width of the widest one, for a uniform look. Off by default.

## 1.1.0

- New `use-colors` directive: colors each equipment level, with process cells purple,
  units blue, equipment modules green and control modules orange. The hues come from
  the active theme's chart palette, so they follow light, dark and high-contrast
  themes. Enterprise, site and area stay muted. Off by default.

## 1.0.0

- Initial release.
- Render ISA-88 physical models (Enterprise → Site → Area → Process Cell → Unit →
  Equipment Module → Control Module) from ` ```physical ` fenced code blocks in the
  built-in Markdown preview, as themed inline SVG.
- Indentation-based DSL with ids, labels, notes, common-resource flags
  (`shared`, `exclusive`, `portable`), equipment module types (`recipe-aware`,
  `generic`), `uses` references, and trains.
- Enforces the ISA-88 containment rules (levels may be omitted but never
  rearranged; site and process cell may not be omitted), plus an opt-in `strict`
  mode for the completeness rules.
- Top-down (with compact leaf stacking) or left-to-right layouts.
- Models follow the active VS Code color theme.
- Works in Restricted Mode (untrusted workspaces): the extension only renders model
  text and runs no workspace code.
