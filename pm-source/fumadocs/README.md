# Physical Model Charts — Fumadocs adapter (`@pm/fumadocs`)

Renders ISA-88 **physical models** in a [Fumadocs](https://fumadocs.dev) (Next.js + MDX)
site, reusing the shared engine in [`../core`](../core) (`@pm/core`).

`PhysicalModel` is a **React Server Component**. It runs the parser, layout and renderer
at build or request time and emits inline SVG, so there is **no client-side JavaScript**
and output is fully static (SSG and SEO friendly). Theming maps onto Fumadocs'
`--color-fd-*` tokens.

## Install

The build emits a self-contained, compiled package in `output/fumadocs/`. `@pm/core` is
bundled in and React stays a peer dependency, so it installs and resolves like any
normal package (no `transpilePackages`, no separate `@pm/core`).

From this repo, build and pack in one step:

```bash
npm run pack:fumadocs        # -> output/pm-fumadocs-<version>.tgz
```

Then in your docs app:

```bash
npm install /absolute/path/to/output/pm-fumadocs-<version>.tgz
```

Import the stylesheet once (e.g. in your root layout or global CSS):

```ts
import "@pm/fumadocs/styles.css";
```

## Usage

### Option A — fenced `physical` blocks (recommended)

Add the remark plugin to your MDX pipeline and register the `PhysicalModel` component in
the MDX scope. Then write models as normal fenced code blocks.

```ts
// source.config.ts (Fumadocs MDX) — or your MDX loader options
import { remarkPhysicalModel } from "@pm/fumadocs/remark";

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkPhysicalModel()],
  },
});
```

```tsx
// mdx-components.tsx
import { PhysicalModel } from "@pm/fumadocs";

export function getMDXComponents(components) {
  return { PhysicalModel, ...components };
}
```

````mdx
```physical
cell PC1 "Line 1"
  unit U1 "Filler"
    em DOS "Dosing"
      cm XV101 "Inlet Valve"
```
````

The plugin rewrites each ` ```physical ` fence into `<PhysicalModel source="..."/>`.

### Option B — use the component directly

```mdx
import { PhysicalModel } from "@pm/fumadocs";

<PhysicalModel source={`cell PC1 "Line 1"
  unit U1 "Filler"
    em DOS "Dosing"`} />
```

Keep the indentation inside the template literal: it defines the hierarchy.

### Alongside PFC Charts

`@pm/fumadocs` and `@pfc/fumadocs` can be used together. Their fences (`physical`, `pfc`),
components and CSS class prefixes (`pm-`, `pfc-`) don't collide, so you can add both
remark plugins and register both components.

## API

- `PhysicalModel`: server component. Props: `source?: string`, `children?: string`
  (template literal), `className?: string`. Parse errors render as a `.pm-error` block.
- `remarkPhysicalModel(options?)`: remark plugin. Options: `component` (default
  `"PhysicalModel"`), `lang` (default `"physical"`). Also the default export.
- `@pm/fumadocs/styles.css`: theme stylesheet (Fumadocs tokens).

The language is identical across all targets. See
[../obsidian/DOCUMENTATION.md](../obsidian/DOCUMENTATION.md) and the authoring skill in
[../../pm-skills](../../pm-skills).

## Build & release

`node build.mjs fumadocs` bundles this adapter to compiled ESM in `output/fumadocs/`
(`@pm/core` inlined, React external), with type declarations and an installable
`package.json`. `npm run build:fumadocs` type-checks (its own `tsconfig.json`) first.

To cut a new version, bump `version` in this folder's `package.json` (the build reads it
into the packaged manifest). Then run `npm run pack:fumadocs` from the repo root to
produce `output/pm-fumadocs-<version>.tgz`, and reinstall it in your docs app.
