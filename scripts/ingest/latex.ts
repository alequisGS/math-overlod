/** Balanced structural scanning, not a TeX interpreter. Offsets stay aligned with original source. */
export function escaped(text: string, index: number) {
  let n = 0;
  for (let i = index - 1; i >= 0 && text[i] === "\\"; i--) n++;
  return n % 2 === 1;
}
export function maskIgnored(text: string): string {
  const out = text.split("");
  for (let i = 0; i < text.length; i++)
    if (text[i] === "%" && !escaped(text, i)) {
      while (i < text.length && text[i] !== "\n") out[i++] = " ";
    }
  return out
    .join("")
    .replace(
      /\\begin\{(verbatim\*?|lstlisting|minted|comment)\}[\s\S]*?\\end\{\1\}/g,
      (m) => m.replace(/[^\n]/g, " "),
    )
    .replace(/\\verb\*?([^\w\s])[\s\S]*?\1/g, (m) => m.replace(/[^\n]/g, " "));
}
export interface Group {
  value: string;
  start: number;
  end: number;
}
export function groupAt(
  text: string,
  position: number,
  open = "{",
  close = "}",
): Group | undefined {
  let i = position;
  while (i < text.length && /\s/.test(text[i])) i++;
  if (text[i] !== open) return;
  const start = i;
  let depth = 1,
    braces = 0;
  for (i++; i < text.length; i++) {
    if (escaped(text, i)) continue;
    if (open === "[") {
      if (text[i] === "{") braces++;
      if (text[i] === "}") braces--;
      if (braces) continue;
    }
    if (text[i] === open) depth++;
    if (text[i] === close) {
      depth--;
      if (depth === 0)
        return { value: text.slice(start + 1, i), start, end: i + 1 };
    }
  }
}
export interface Command {
  name: string;
  start: number;
  end: number;
  fullEnd?: number;
}
export function macroAt(text: string, end: number) {
  let name = groupAt(text, end);
  let cursor = name?.end ?? end;
  if (!name) {
    const m = /^\s*(\\[A-Za-z@]+)/.exec(text.slice(end));
    if (!m) return;
    name = { value: m[1], start: end, end: end + m[0].length };
    cursor = name.end;
  }
  const count = groupAt(text, cursor, "[", "]");
  if (count) cursor = count.end;
  const initial = groupAt(text, cursor, "[", "]");
  if (initial) cursor = initial.end;
  const body = groupAt(text, cursor);
  if (!body) return;
  return {
    name: name.value,
    count: count?.value ?? "0",
    body: body.value,
    end: body.end,
  };
}
export function commands(text: string): Command[] {
  const clean = maskIgnored(text),
    result: Command[] = [];
  for (let i = 0; i < clean.length; i++) {
    if (clean[i] !== "\\" || escaped(clean, i)) continue;
    const match = /^\\([A-Za-z@]+\*?|[^\s])/.exec(clean.slice(i));
    if (!match) continue;
    const token: Command = {
      name: match[1],
      start: i,
      end: i + match[0].length,
    };
    if (
      [
        "newcommand",
        "renewcommand",
        "providecommand",
        "newcommand*",
        "renewcommand*",
        "DeclareRobustCommand",
      ].includes(token.name)
    ) {
      const macro = macroAt(clean, token.end);
      if (macro) token.fullEnd = macro.end;
    } else if (["def", "gdef", "edef"].includes(token.name)) {
      const brace = clean.indexOf("{", token.end);
      const body = brace >= 0 ? groupAt(clean, brace) : undefined;
      if (body) token.fullEnd = body.end;
    }
    result.push(token);
    i = (token.fullEnd ?? token.end) - 1;
  }
  return result;
}
export function commandGroups(text: string, command: Command) {
  let cursor = command.end;
  const optional: string[] = [];
  let opt = groupAt(text, cursor, "[", "]");
  while (opt) {
    optional.push(opt.value);
    cursor = opt.end;
    opt = groupAt(text, cursor, "[", "]");
  }
  return { optional, argument: groupAt(text, cursor) };
}
export function normalizeLatex(text: string) {
  return maskIgnored(text)
    .replace(/\\label\s*\{[^}]*\}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
export function expandSimpleMacros(
  text: string,
  macros: Record<string, string>,
) {
  let value = text;
  for (let i = 0; i < 5; i++) {
    const next = value.replace(/\\[A-Za-z@]+/g, (key) => macros[key] ?? key);
    if (next === value) break;
    value = next;
  }
  return value;
}
export function plainLatex(text: string, macros: Record<string, string> = {}) {
  return expandSimpleMacros(text, macros)
    .replace(/\\(?:label|cite\w*|[Cc]?ref|eqref)(?:\[[^\]]*\])*\{[^}]*\}/g, " ")
    .replace(
      /\\(?:textbf|emph|textit|mathrm|mathcal|mathbf|operatorname)\b/g,
      "",
    )
    .replace(/\\[A-Za-z@]+/g, " ")
    .replace(/[$\{\}~_^\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
