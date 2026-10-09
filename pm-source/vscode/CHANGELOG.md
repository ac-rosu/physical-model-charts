# Change Log

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
