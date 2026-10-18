# Change Log

## Unreleased

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
