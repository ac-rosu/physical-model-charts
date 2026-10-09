// Physical Model Charts — Fumadocs (Next.js + MDX) React component.
//
// A React *Server* Component: it runs the shared @pm/core engine at
// build/request time and emits inline SVG, so there is no client-side
// JavaScript and models are fully static (great for SSG/SEO). Theming comes
// from ./styles.css, which maps the model classes onto Fumadocs' --color-fd-*
// tokens.
import { parsePhysical, ParseError, renderModelToString } from "@pm/core";

export interface PhysicalModelProps {
  /** Model source. Preferred (the remark plugin passes this). */
  source?: string;
  /** Alternatively, a template-literal child: <PhysicalModel>{`unit ...`}</PhysicalModel>. */
  children?: string;
  /** Extra class(es) merged onto the model container. */
  className?: string;
}

export function PhysicalModel({ source, children, className }: PhysicalModelProps) {
  const code = String(source ?? children ?? "");
  const container = className ? `pm-container ${className}` : "pm-container";

  let svg: string;
  try {
    // core escapes all user-supplied text, so the markup is safe to inject.
    svg = renderModelToString(parsePhysical(code));
  } catch (e) {
    const msg =
      e instanceof ParseError && e.line > 0
        ? `Physical model error (line ${e.line}): ${e.message}`
        : `Physical model error: ${(e as Error).message}`;
    return <pre className="pm-error">{msg}</pre>;
  }

  return <div className={container} dangerouslySetInnerHTML={{ __html: svg }} />;
}
