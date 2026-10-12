# Physical Model Charts — VS Code extension

Renders ISA-88 **physical models** from ```` ```physical ```` fenced code blocks in the
built-in **Markdown preview**, using the shared engine in [`../core`](../core)
(imported as `@pm/core`).

````markdown
```physical
cell PC1 "Line 1"
  machine U1 "Case Packer"
    em EM1 "Infeed"
      cm M1 "Conveyor Drive"
      cm B1 "Photo Eye"
```
````

Open any Markdown file and run **Markdown: Open Preview** (`Ctrl/Cmd+Shift+V`).
`physical` blocks render as themed inline SVG that follows the active VS Code color
theme.

## How it works

- The extension contributes a Markdown-It plugin (`markdown.markdownItPlugins`). Its
  `extendMarkdownIt` hook adds a fence rule for `physical` that calls
  `renderModelToString(parsePhysical(source))` from `@pm/core` and emits inline SVG.
  Other fences pass through to the previous rule, so it coexists with PFC Charts and
  Mermaid extensions.
- Theming is contributed via `markdown.previewStyles`
  ([media/pm-preview.css](media/pm-preview.css)), which maps the model classes onto
  `--vscode-*` theme variables.
- No runtime dependencies: `@pm/core` is bundled into `dist/extension.js`.

## Build & package

```bash
# from the repository root
npm install
npm run build            # every target
# or just this target:
npm run build:vscode     # -> output/vscode/
```

`output/vscode/` is a self-contained extension folder. Open it in VS Code and press
**F5** to launch an Extension Development Host, or package it:

```bash
cd output/vscode
npx @vscode/vsce package --no-dependencies   # -> physical-model-charts-<v>.vsix
code --install-extension physical-model-charts-1.0.0.vsix
```

## Releasing a new version

1. Bump `version` in [package.json](package.json) by hand and add a matching entry to
   [CHANGELOG.md](CHANGELOG.md).
2. Run `npm run build:vscode` from the repository root.
3. Package from `output/vscode/`:
   ```bash
   cd output/vscode
   npx @vscode/vsce package --no-dependencies
   ```
4. Upload the `.vsix` at <https://marketplace.visualstudio.com/manage> (publisher `acro`).

See [Releasing a new version](../../README.md#vs-code) in the root README for the
command-line alternative and the December 2026 PAT retirement.

To regenerate the icon after editing [media/icon.svg](media/icon.svg), run `npm run icon`.

## DSL reference

The language is identical across targets. See
[../obsidian/DOCUMENTATION.md](../obsidian/DOCUMENTATION.md) and the authoring skill in
[../../pm-skills](../../pm-skills).
