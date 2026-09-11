import katex from "katex";
import { maskIgnored, commands, groupAt } from "../../scripts/ingest/latex.ts";
export const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
/** A conservative display aid. Raw TeX remains authoritative; no HTML or TeX execution. */
export function latexPreview(
  text: string,
  macros: Record<string, string> = {},
) {
  let input = maskIgnored(text);
  // Handle only known presentation wrappers. Unknown commands stay visible.
  const replacements: { start: number; end: number; value: string }[] = [];
  for (const command of commands(input)) {
    if (
      !["label", "texorpdfstring", "emph", "textbf", "textit"].includes(
        command.name,
      )
    )
      continue;
    const first = groupAt(input, command.end);
    if (!first) continue;
    const second =
      command.name === "texorpdfstring" ? groupAt(input, first.end) : undefined;
    if (command.name === "texorpdfstring" && !second) continue;
    if (replacements.some((r) => command.start < r.end)) continue;
    replacements.push({
      start: command.start,
      end: second?.end ?? first.end,
      value: command.name === "label" ? "" : first.value,
    });
  }
  for (const r of replacements.reverse())
    input = input.slice(0, r.start) + r.value + input.slice(r.end);
  const pattern =
    /\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)|(?<!\\)\$([^$\n]+?)(?<!\\)\$/g;
  let output = "",
    cursor = 0;
  for (const match of input.matchAll(pattern)) {
    output += escapeHtml(input.slice(cursor, match.index));
    const expression = match[1] ?? match[2] ?? match[3] ?? match[4];
    try {
      output += katex.renderToString(expression, {
        displayMode: match[1] !== undefined || match[2] !== undefined,
        throwOnError: true,
        trust: false,
        strict: "ignore",
        maxExpand: 1000,
        macros: { ...macros },
        output: "htmlAndMathml",
      });
    } catch {
      output += `<code class="latex-fallback">${escapeHtml(match[0])}</code>`;
    }
    cursor = match.index! + match[0].length;
  }
  return output + escapeHtml(input.slice(cursor));
}
export const safeExternalUrl = (url?: string) =>
  url && /^https?:\/\//i.test(url) ? url : undefined;
