import { groupAt, escaped } from "./latex.ts";
import type { Diagnostic, ImportedCitation } from "./types.ts";

export function parseBibtex(
  text: string,
  sourceFile: string,
): { entries: ImportedCitation[]; diagnostics: Diagnostic[] } {
  const entries: ImportedCitation[] = [],
    diagnostics: Diagnostic[] = [];
  const strings: Record<string, string> = {};
  const entryPattern = /@([A-Za-z]+)\s*([({])/g;
  let match: RegExpExecArray | null;
  while ((match = entryPattern.exec(text))) {
    const entryType = match[1].toLowerCase(),
      open = match[2];
    const body = groupAt(
      text,
      entryPattern.lastIndex - 1,
      open,
      open === "(" ? ")" : "}",
    );
    if (!body) {
      diagnostics.push({
        severity: "error",
        file: sourceFile,
        message: `Unclosed BibTeX ${entryType} entry`,
      });
      break;
    }
    entryPattern.lastIndex = body.end;
    if (["comment", "preamble"].includes(entryType)) continue;
    const comma = body.value.indexOf(",");
    const key = entryType === "string" ? "" : body.value.slice(0, comma).trim();
    if (entryType !== "string" && (comma < 0 || !key)) {
      diagnostics.push({
        severity: "warning",
        file: sourceFile,
        message: "BibTeX entry has no key",
      });
      continue;
    }
    const fields: Record<string, string> = {};
    const content =
      entryType === "string" ? body.value : body.value.slice(comma + 1);
    let i = 0;
    while (i < content.length) {
      while (i < content.length && /[\s,]/.test(content[i])) i++;
      const field = /^([\w-]+)\s*=\s*/.exec(content.slice(i));
      if (!field) {
        if (content.slice(i).trim())
          diagnostics.push({
            severity: "warning",
            file: sourceFile,
            message: `Unparsed BibTeX field in ${key || "@string"}`,
          });
        break;
      }
      i += field[0].length;
      const parts: string[] = [];
      while (i < content.length) {
        while (/\s/.test(content[i] ?? "") && i < content.length) i++;
        if (content[i] === "{") {
          const group = groupAt(content, i);
          if (!group) {
            diagnostics.push({
              severity: "error",
              file: sourceFile,
              message: `Unclosed field in ${key}`,
            });
            i = content.length;
            break;
          }
          parts.push(group.value);
          i = group.end;
        } else if (content[i] === '"') {
          let end = i + 1,
            depth = 0;
          for (; end < content.length; end++) {
            if (escaped(content, end)) continue;
            if (content[end] === "{") depth++;
            if (content[end] === "}") depth--;
            if (content[end] === '"' && depth === 0) break;
          }
          parts.push(content.slice(i + 1, end));
          i = end + 1;
        } else {
          const word = /^[^,\s#]+/.exec(content.slice(i));
          if (!word) break;
          parts.push(strings[word[0].toLowerCase()] ?? word[0]);
          i += word[0].length;
        }
        while (i < content.length && /\s/.test(content[i])) i++;
        if (content[i] !== "#") break;
        i++;
      }
      fields[field[1].toLowerCase()] = parts.join("");
    }
    if (entryType === "string") {
      Object.assign(strings, fields);
      continue;
    }
    if (entries.some((e) => e.key === key))
      diagnostics.push({
        severity: "error",
        file: sourceFile,
        message: `Duplicate bibliography key: ${key}`,
      });
    entries.push({
      key,
      entryType,
      authors: (fields.author ?? fields.editor ?? "")
        .split(/\s+and\s+/i)
        .filter(Boolean),
      title: fields.title,
      year: fields.year,
      journal: fields.journal ?? fields.booktitle,
      doi: fields.doi,
      eprint: fields.eprint ?? fields.arxiv,
      url: fields.url,
      fields,
      raw: text.slice(match.index, body.end),
      sourceFile,
      used: false,
    });
  }
  return { entries, diagnostics };
}
