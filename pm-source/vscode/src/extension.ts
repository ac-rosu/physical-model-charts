// VS Code Markdown-preview integration.
//
// VS Code loads this module for the built-in Markdown preview and calls
// `extendMarkdownIt`. We add a fence rule that turns ```physical code blocks into
// inline SVG using the shared @pm/core engine. All theming comes from
// media/pm-preview.css (contributed via markdown.previewStyles).

import { parsePhysical, ParseError, renderModelToString } from "@pm/core";

// Minimal structural types for the bits of markdown-it we touch (avoids a
// runtime dependency; VS Code passes its own markdown-it instance).
type Token = { info: string; content: string };
type FenceRule = (
  tokens: Token[],
  idx: number,
  options: unknown,
  env: unknown,
  self: { renderToken(tokens: Token[], idx: number, options: unknown): string }
) => string;
interface MarkdownItLike {
  renderer: { rules: { fence?: FenceRule } };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function extendMarkdownIt(md: MarkdownItLike): MarkdownItLike {
  const prev: FenceRule =
    md.renderer.rules.fence ??
    ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const lang = (tokens[idx].info || "").trim().split(/\s+/)[0];
    if (lang === "physical") {
      try {
        const svg = renderModelToString(parsePhysical(tokens[idx].content));
        return `<div class="pm-container">${svg}</div>`;
      } catch (e) {
        const msg =
          e instanceof ParseError && e.line > 0
            ? `Physical model error (line ${e.line}): ${e.message}`
            : `Physical model error: ${(e as Error).message}`;
        return `<pre class="pm-error">${escapeHtml(msg)}</pre>`;
      }
    }
    return prev(tokens, idx, options, env, self);
  };

  return md;
}

// VS Code calls the object returned from activate() to extend its Markdown
// preview renderer; the whole integration lives in extendMarkdownIt.
export function activate(): { extendMarkdownIt(md: MarkdownItLike): MarkdownItLike } {
  return { extendMarkdownIt };
}

export function deactivate(): void {}
