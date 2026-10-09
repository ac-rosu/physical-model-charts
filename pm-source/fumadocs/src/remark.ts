// Remark plugin: rewrite ```physical fenced code blocks into <PhysicalModel source="..."/>
// MDX elements, so authors get the familiar fenced-block experience instead of
// importing and calling the component by hand.
//
// The named component (default "PhysicalModel") must be in the MDX scope — register it in
// your Fumadocs `mdx-components.tsx` / `getMDXComponents()`.
//
// Typed structurally to avoid a hard dependency on unified/mdast typings.

interface MdastNode {
  type: string;
  [key: string]: unknown;
}
interface Parent extends MdastNode {
  children: MdastNode[];
}
interface Code extends MdastNode {
  type: "code";
  lang?: string | null;
  value: string;
}

export interface RemarkPhysicalModelOptions {
  /** Name of the component to emit (must be in MDX scope). Default "PhysicalModel". */
  component?: string;
  /** Fence language to match. Default "physical". */
  lang?: string;
}

function isParent(node: MdastNode): node is Parent {
  return Array.isArray((node as Parent).children);
}

function jsxElement(name: string, source: string): MdastNode {
  return {
    type: "mdxJsxFlowElement",
    name,
    attributes: [{ type: "mdxJsxAttribute", name: "source", value: source }],
    children: [],
  };
}

function transform(parent: Parent, lang: string, component: string): void {
  for (let i = 0; i < parent.children.length; i++) {
    const node = parent.children[i];
    if (node.type === "code" && (node as Code).lang === lang) {
      parent.children[i] = jsxElement(component, (node as Code).value);
    } else if (isParent(node)) {
      transform(node, lang, component);
    }
  }
}

export function remarkPhysicalModel(options: RemarkPhysicalModelOptions = {}) {
  const component = options.component ?? "PhysicalModel";
  const lang = options.lang ?? "physical";
  return (tree: Parent): void => {
    transform(tree, lang, component);
  };
}

export default remarkPhysicalModel;
