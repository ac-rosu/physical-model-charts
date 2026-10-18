// Parser for the ISA-88 physical model text DSL.
// Structure comes from INDENTATION: a line indented deeper than the entity
// above it is contained in that entity (like a Mermaid mindmap).
//
//   physical <optional title...>
//   enterprise [ID] ["Label"]
//     site [ID] ["Label"]
//       area [ID] ["Label"]
//         cell [ID] ["Label"]
//           unit [ID] ["Label"] [flags]        (alias: machine)
//             em [ID] ["Label"] [flags]       (equipment module)
//               cm [ID] ["Label"] [flags]     (control module)
//
//   note "text"          annotation for the entity on the line above
//   uses ID [ID...]      the entity above acquires/uses these common resources
//   train "Label" U1 U2  a train: a set of units within one process cell
//
// Flags: shared | exclusive | portable | recipe-aware | generic
// Directives: direction TB|LR, wide, strict, use-colors
//
// Rules (ANSI/ISA-88.00.01-2010 Part 1):
//   - levels may be omitted but never rearranged (§4.4.2.5, §4.4.3.7);
//     an equipment module may contain equipment modules, and a control module
//     control modules (compound modules, §4.4.3)
//   - the site and the process cell may not be omitted (§4.4.2.5, §4.4.3.7)
//   - `strict` adds the completeness rules (§4.4.2, §4.4.2.4, §4.4.3.2, §4.4.3.7)

export type Level = "enterprise" | "site" | "area" | "cell" | "unit" | "em" | "cm";

export type Flag = "shared" | "exclusive" | "portable" | "recipe-aware" | "generic";

export interface PmNode {
  level: Level;
  kind: string; // display name of the level, e.g. "Process Cell" or "Machine (Unit)"
  id: string;
  label: string;
  flags: Flag[];
  uses: string[]; // ids of common resources this entity acquires
  usesLabels: string[]; // resolved labels of `uses`
  trains: string[]; // labels of the trains this unit belongs to
  notes: string[];
  children: PmNode[];
  line: number;
}

export interface PmTrain {
  label: string;
  members: string[]; // unit ids
  line: number;
}

export interface PmModel {
  title: string;
  direction: "TB" | "LR";
  compact: boolean; // stack leaf-only children vertically (TB only)
  strict: boolean;
  colors: boolean; // one hue per equipment level (cell, unit, em, cm)
  roots: PmNode[];
  trains: PmTrain[];
}

export class ParseError extends Error {
  line: number;
  constructor(message: string, line: number) {
    super(message);
    this.name = "ParseError";
    this.line = line;
  }
}

export const LEVEL_RANK: Record<Level, number> = {
  enterprise: 0,
  site: 1,
  area: 2,
  cell: 3,
  unit: 4,
  em: 5,
  cm: 6,
};

export const LEVEL_NAMES: Record<Level, string> = {
  enterprise: "Enterprise",
  site: "Site",
  area: "Area",
  cell: "Process Cell",
  unit: "Unit",
  em: "Equipment Module",
  cm: "Control Module",
};

const KEYWORDS: Record<string, { level: Level; kind?: string }> = {
  enterprise: { level: "enterprise" },
  ent: { level: "enterprise" },
  site: { level: "site" },
  area: { level: "area" },
  cell: { level: "cell" },
  processcell: { level: "cell" },
  "process-cell": { level: "cell" },
  pc: { level: "cell" },
  unit: { level: "unit" },
  machine: { level: "unit", kind: "Machine (Unit)" }, // TR88: machine = unit
  em: { level: "em" },
  equipmentmodule: { level: "em" },
  "equipment-module": { level: "em" },
  equipment: { level: "em" },
  cm: { level: "cm" },
  controlmodule: { level: "cm" },
  "control-module": { level: "cm" },
  control: { level: "cm" },
};

const FLAGS: Record<string, Flag> = {
  shared: "shared",
  "shared-use": "shared",
  exclusive: "exclusive",
  "exclusive-use": "exclusive",
  portable: "portable",
  "recipe-aware": "recipe-aware",
  recipeaware: "recipe-aware",
  aware: "recipe-aware",
  generic: "generic",
};

// which levels each flag may be used on
const FLAG_LEVELS: Record<Flag, Level[]> = {
  shared: ["unit", "em", "cm"],
  exclusive: ["unit", "em", "cm"],
  portable: ["unit", "em", "cm"],
  "recipe-aware": ["em"],
  generic: ["em"],
};

const FLAG_LIST = "shared, exclusive, portable, recipe-aware, generic";

// Remove a // comment that is not inside a double-quoted string.
function stripComment(raw: string): string {
  let inQuote = false;
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === '"') inQuote = !inQuote;
    else if (!inQuote && c === "/" && raw[i + 1] === "/") return raw.slice(0, i);
  }
  return raw;
}

function firstWord(s: string): string {
  const m = s.match(/^(\S+)/);
  return m ? m[1].toLowerCase() : "";
}

// leading whitespace width; a tab counts as 4 columns
function indentOf(raw: string): number {
  let w = 0;
  for (const c of raw) {
    if (c === " ") w += 1;
    else if (c === "\t") w += 4;
    else break;
  }
  return w;
}

interface Tok {
  text: string;
  quoted: boolean;
}

// split on whitespace, keeping "double quoted" runs as single tokens
function tokenize(s: string, line: number): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    if (/\s/.test(s[i])) {
      i++;
      continue;
    }
    if (s[i] === '"') {
      const end = s.indexOf('"', i + 1);
      if (end < 0) throw new ParseError("missing closing quote", line);
      toks.push({ text: s.slice(i + 1, end), quoted: true });
      i = end + 1;
    } else {
      let j = i;
      while (j < s.length && !/\s/.test(s[j]) && s[j] !== '"') j++;
      toks.push({ text: s.slice(i, j), quoted: false });
      i = j;
    }
  }
  return toks;
}

// the text of a `note` / `physical` style line: a quoted string or the bare rest
function restText(rest: string, line: number): string {
  const r = rest.trim();
  if (r.startsWith('"')) {
    const end = r.indexOf('"', 1);
    if (end < 0) throw new ParseError("missing closing quote", line);
    return r.slice(1, end);
  }
  return r;
}

// level names starting with a vowel sound: Enterprise, Area, Equipment Module (not Unit)
const article = (name: string) => (/^[AEIO]/.test(name) ? "an" : "a");

// Why `child` may not sit directly inside `parent`, or "" if it may.
function containmentError(parent: PmNode, child: PmNode): string {
  const p = parent.level;
  const c = child.level;
  const pn = LEVEL_NAMES[p];
  const cn = LEVEL_NAMES[c];
  const compound = (p === "em" && c === "em") || (p === "cm" && c === "cm");
  if (!compound && LEVEL_RANK[c] <= LEVEL_RANK[p])
    return `${article(pn)} ${pn} cannot contain ${article(cn)} ${cn} — levels may be omitted but never rearranged (ISA-88 Part 1 §4.4.2.5)`;
  if (p === "enterprise" && c !== "site")
    return `an Enterprise must contain Sites — the site level may not be omitted (ISA-88 Part 1 §4.4.2.5)`;
  if (LEVEL_RANK[p] < LEVEL_RANK.cell && LEVEL_RANK[c] > LEVEL_RANK.cell)
    return `${article(cn)} ${cn} must sit inside a Process Cell — the process cell may not be omitted (ISA-88 Part 1 §4.4.3.7)`;
  return "";
}

export function parsePhysical(source: string): PmModel {
  const model: PmModel = {
    title: "",
    direction: "TB",
    compact: true,
    strict: false,
    colors: false,
    roots: [],
    trains: [],
  };
  let titleSeen = false;
  const stack: Array<{ indent: number; node: PmNode }> = [];
  const byId = new Map<string, PmNode>();
  const usesLines = new Map<PmNode, number>();
  // the entity a following `note` / `uses` line attaches to
  let attach: PmNode | null = null;

  const rawLines = source.split(/\r?\n/);
  for (let idx = 0; idx < rawLines.length; idx++) {
    const n = idx + 1;
    const raw = stripComment(rawLines[idx]);
    const text = raw.trim();
    if (text === "" || text.startsWith("#")) continue;
    const kw = firstWord(text);
    const rest = text.slice(kw.length).trim();

    if (kw === "physical") {
      if (titleSeen) throw new ParseError("duplicate 'physical' title line", n);
      titleSeen = true;
      model.title = restText(rest, n);
      attach = null;
      continue;
    }
    if (kw === "direction") {
      const d = rest.toUpperCase();
      if (d === "TB" || d === "TD") model.direction = "TB";
      else if (d === "LR") model.direction = "LR";
      else throw new ParseError("direction must be TB or LR", n);
      attach = null;
      continue;
    }
    if (kw === "wide" || kw === "strict" || kw === "use-colors") {
      if (rest) throw new ParseError(`'${kw}' takes no arguments`, n);
      if (kw === "wide") model.compact = false;
      else if (kw === "strict") model.strict = true;
      else model.colors = true;
      attach = null;
      continue;
    }

    if (kw === "note") {
      if (!attach) throw new ParseError("'note' must come right after an entity", n);
      const note = restText(rest, n);
      if (!note.trim()) throw new ParseError("note needs text", n);
      attach.notes.push(note);
      continue;
    }
    if (kw === "uses") {
      if (!attach) throw new ParseError("'uses' must come right after an entity", n);
      const ids = rest.split(/[\s,]+/).filter(Boolean);
      if (!ids.length) throw new ParseError("'uses' needs at least one entity id", n);
      for (const id of ids) if (!attach.uses.includes(id)) attach.uses.push(id);
      if (!usesLines.has(attach)) usesLines.set(attach, n);
      continue;
    }
    if (kw === "train") {
      const toks = tokenize(rest, n);
      if (toks.length < 2)
        throw new ParseError("'train' needs a label and at least one unit id", n);
      const label = toks[0].text;
      if (!label.trim()) throw new ParseError("train needs a label", n);
      if (model.trains.some((t) => t.label === label))
        throw new ParseError(`duplicate train '${label}'`, n);
      model.trains.push({ label, members: toks.slice(1).map((t) => t.text), line: n });
      attach = null;
      continue;
    }

    const kwDef = KEYWORDS[kw];
    if (!kwDef) throw new ParseError(`unknown statement: "${text}"`, n);

    // <level> [ID] ["Label"] [flags...]
    const toks = tokenize(rest, n);
    let id = "";
    let label = "";
    let labelSeen = false;
    const flags: Flag[] = [];
    for (const t of toks) {
      if (t.quoted) {
        if (labelSeen) throw new ParseError("an entity takes only one quoted label", n);
        label = t.text;
        labelSeen = true;
        continue;
      }
      // the first bare token before the label is always the id (so an id such as
      // "Shared" is never mistaken for a flag); flags follow the id / label
      const flag = FLAGS[t.text.toLowerCase()];
      if (!id && !labelSeen && flags.length === 0) {
        id = t.text;
      } else if (flag) {
        if (!flags.includes(flag)) flags.push(flag);
      } else {
        throw new ParseError(
          `unknown flag '${t.text}' (expected ${FLAG_LIST}) — quote multi-word labels`,
          n
        );
      }
    }
    if (!labelSeen) label = id;
    if (!label.trim()) throw new ParseError(`${kw} needs an id or a "label"`, n);

    for (const f of flags) {
      if (!FLAG_LEVELS[f].includes(kwDef.level))
        throw new ParseError(
          `'${f}' cannot be used on ${article(LEVEL_NAMES[kwDef.level])} ${LEVEL_NAMES[kwDef.level]}`,
          n
        );
    }
    if (flags.includes("shared") && flags.includes("exclusive"))
      throw new ParseError("a common resource is either 'shared' or 'exclusive', not both", n);
    if (flags.includes("recipe-aware") && flags.includes("generic"))
      throw new ParseError(
        "an equipment module is either 'recipe-aware' or 'generic', not both",
        n
      );

    const node: PmNode = {
      level: kwDef.level,
      kind: kwDef.kind ?? LEVEL_NAMES[kwDef.level],
      id,
      label,
      flags,
      uses: [],
      usesLabels: [],
      trains: [],
      notes: [],
      children: [],
      line: n,
    };
    if (id) {
      if (byId.has(id))
        throw new ParseError(`duplicate id '${id}' (first used on line ${byId.get(id)!.line})`, n);
      byId.set(id, node);
    }

    const indent = indentOf(raw);
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    const parent = stack.length ? stack[stack.length - 1].node : null;
    if (parent) {
      const err = containmentError(parent, node);
      if (err) throw new ParseError(err, n);
      parent.children.push(node);
    } else {
      model.roots.push(node);
    }
    stack.push({ indent, node });
    attach = node;
  }

  if (model.roots.length === 0) throw new ParseError("model is empty", 0);

  // resolve `uses` references
  const all: PmNode[] = [];
  const walk = (nd: PmNode) => {
    all.push(nd);
    nd.children.forEach(walk);
  };
  model.roots.forEach(walk);
  for (const nd of all) {
    for (const ref of nd.uses) {
      const target = byId.get(ref);
      const line = usesLines.get(nd) ?? nd.line;
      if (!target) throw new ParseError(`'uses' target '${ref}' is not an entity id`, line);
      if (target === nd) throw new ParseError(`'${ref}' cannot use itself`, line);
      nd.usesLabels.push(target.label);
    }
  }

  // trains: units only, all within one process cell (ISA-88 Part 1 §4.4.3.2)
  const cellOf = new Map<PmNode, PmNode | null>();
  const mapCells = (nd: PmNode, cell: PmNode | null) => {
    const c = nd.level === "cell" ? nd : cell;
    cellOf.set(nd, c);
    nd.children.forEach((k) => mapCells(k, c));
  };
  model.roots.forEach((r) => mapCells(r, null));
  for (const tr of model.trains) {
    let cell: PmNode | null | undefined;
    for (const m of tr.members) {
      const unit = byId.get(m);
      if (!unit) throw new ParseError(`train member '${m}' is not an entity id`, tr.line);
      if (unit.level !== "unit")
        throw new ParseError(`train member '${m}' is not a unit — a train groups units`, tr.line);
      const c = cellOf.get(unit) ?? null;
      if (cell === undefined) cell = c;
      else if (c !== cell)
        throw new ParseError(
          `train '${tr.label}' spans more than one process cell (ISA-88 Part 1 §4.4.3.2)`,
          tr.line
        );
      if (!unit.trains.includes(tr.label)) unit.trains.push(tr.label);
    }
  }

  if (model.strict) checkStrict(all);
  return model;
}

function hasControlModule(nd: PmNode): boolean {
  return nd.children.some((k) => k.level === "cm" || hasControlModule(k));
}

// completeness rules of the physical and equipment entity models
function checkStrict(all: PmNode[]): void {
  for (const nd of all) {
    const name = `${nd.kind} '${nd.label}'`;
    if (nd.level === "enterprise" && !nd.children.some((k) => k.level === "site"))
      throw new ParseError(
        `strict: ${name} must contain at least one site (ISA-88 Part 1 §4.4.2)`,
        nd.line
      );
    if (nd.level === "area" && !nd.children.some((k) => k.level === "cell"))
      throw new ParseError(
        `strict: ${name} must contain at least one process cell (ISA-88 Part 1 §4.4.2.4)`,
        nd.line
      );
    if (nd.level === "cell") {
      if (!nd.children.some((k) => k.level === "unit"))
        throw new ParseError(
          `strict: ${name} must contain at least one unit (ISA-88 Part 1 §4.4.3.2)`,
          nd.line
        );
      if (!hasControlModule(nd))
        throw new ParseError(
          `strict: ${name} must contain at least one control module (ISA-88 Part 1 §4.4.3.7)`,
          nd.line
        );
    }
  }
}
