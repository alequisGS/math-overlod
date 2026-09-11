import {
  commands,
  commandGroups,
  groupAt,
  macroAt,
  maskIgnored,
  normalizeLatex,
  plainLatex,
} from "./latex.ts";
import { sourceSpans, type ExpandedSource } from "./source.ts";
import { hash } from "./files.ts";
import { parseBibtex } from "./bibtex.ts";
import type {
  ImportedMathObject,
  ImportedPaper,
  PaperSource,
  SourceReference,
} from "./types.ts";

const vocabulary: Record<string, string> = {
  theorem: "theorem",
  thm: "theorem",
  proposition: "proposition",
  prop: "proposition",
  lemma: "lemma",
  lem: "lemma",
  corollary: "corollary",
  cor: "corollary",
  definition: "definition",
  defn: "definition",
  example: "example",
  ex: "example",
  remark: "remark",
  rem: "remark",
  conjecture: "conjecture",
  question: "open-problem",
  problem: "open-problem",
  openproblem: "open-problem",
};
const proposedType = (environment: string) =>
  environment === "remark"
    ? "concept"
    : environment === "open-problem"
      ? "open-problem"
      : (vocabulary[environment] ?? "concept");
interface Declaration {
  kind: string;
  counter: string;
  within?: string;
  numbered: boolean;
}
interface Frame {
  name: string;
  start: number;
  bodyStart: number;
  title?: string;
  labels: string[];
  section?: string;
  subsection?: string;
  printedNumber?: string;
  end?: number;
  bodyEnd?: number;
  object?: ImportedMathObject;
}
export function extractReferences(
  text: string,
  context: "statement" | "proof",
) {
  const references: SourceReference[] = [],
    citations: string[] = [];
  const clean = maskIgnored(text);
  for (const command of commands(text)) {
    const name = command.name.replace(/\*$/, "");
    const { argument } = commandGroups(clean, command);
    if (!argument) continue;
    if (/^(ref|eqref|cref|Cref|autoref|crefrange|Crefrange)$/.test(name)) {
      const args = [argument];
      if (name.toLowerCase() === "crefrange") {
        const next = groupAt(clean, argument.end);
        if (next) args.push(next);
      }
      for (const arg of args)
        for (const label of arg.value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean))
          references.push({ label, command: name, context });
    }
    if (
      /^(cite|citep|citet|parencite|textcite|autocite|footcite|nocite)$/.test(
        name,
      )
    )
      citations.push(
        ...argument.value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      );
  }
  return { references, citations: [...new Set(citations)] };
}
export function relevantMacros(text: string, macros: Record<string, string>) {
  const used: Record<string, string> = {};
  const pending = [...text.matchAll(/\\[A-Za-z@]+/g)].map((m) => m[0]);
  while (pending.length) {
    const key = pending.pop()!;
    if (Object.hasOwn(used, key) || !Object.hasOwn(macros, key)) continue;
    used[key] = macros[key];
    pending.push(
      ...[...macros[key].matchAll(/\\[A-Za-z@]+/g)].map((m) => m[0]),
    );
  }
  return Object.fromEntries(
    Object.entries(used).sort(([a], [b]) => a.localeCompare(b)),
  );
}
export function fingerprint(
  object: Pick<ImportedMathObject, "statement" | "proof" | "environment">,
  macros: Record<string, string>,
) {
  return hash(
    JSON.stringify([
      object.environment,
      normalizeLatex(object.statement),
      normalizeLatex(object.proof ?? ""),
      relevantMacros(object.statement + (object.proof ?? ""), macros),
    ]),
  );
}
export function suggestedId(paper: string, key: string) {
  const slug = key
    .replace(/^label:/, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase()
    .slice(0, 55);
  return `P${paper.replace(/[^A-Za-z0-9]+/g, "-")}-${slug}-${hash(key).slice(0, 6).toUpperCase()}`;
}
export function parsePaper(
  source: PaperSource,
  expanded: ExpandedSource,
): ImportedPaper {
  const text = expanded.text,
    clean = maskIgnored(text),
    tokens = commands(text),
    diagnostics = [...expanded.diagnostics];
  let braceDepth = 0;
  for (let i = 0; i < clean.length; i++) {
    let slashes = 0;
    for (let j = i - 1; j >= 0 && clean[j] === "\\"; j--) slashes++;
    if (slashes % 2) continue;
    if (clean[i] === "{") braceDepth++;
    if (clean[i] === "}") braceDepth--;
    if (braceDepth < 0) break;
  }
  if (braceDepth !== 0)
    diagnostics.push({
      severity: "error",
      message:
        "Unbalanced LaTeX braces; review the source before accepting any proposal.",
    });
  const prefix = `${source.root}/${source.paperDirectory}/`;
  const spans = (start: number, end: number) =>
    sourceSpans(expanded, start, end).map((s) => ({
      ...s,
      file: prefix + s.file,
    }));
  const location = (offset: number) =>
    spans(offset, offset + 1)[0] ?? {
      file: prefix + source.entrypoint,
      startLine: 1,
      endLine: 1,
    };
  const definitions = new Map<string, Declaration>();
  const aliases: Record<string, string> = {};
  const macros: Record<string, string> = {};
  const root = (name: string): string => {
    const visited = new Set<string>();
    while (aliases[name] && !visited.has(name)) {
      visited.add(name);
      name = aliases[name];
    }
    return name;
  };
  for (const command of tokens) {
    if (
      command.name.startsWith("newcommand") ||
      ["renewcommand", "providecommand", "DeclareRobustCommand"].includes(
        command.name,
      )
    ) {
      const macro = macroAt(clean, command.end);
      if (macro?.count === "0") macros[macro.name] = macro.body;
    }
    if (command.name === "newaliascnt") {
      const name = groupAt(clean, command.end),
        counter = name && groupAt(clean, name.end);
      if (name && counter) aliases[name.value] = counter.value;
    }
    if (command.name === "newtheorem" || command.name === "newtheorem*") {
      const name = groupAt(clean, command.end);
      if (!name) continue;
      const shared = groupAt(clean, name.end, "[", "]");
      const title = groupAt(clean, shared?.end ?? name.end);
      if (!title) continue;
      const within = groupAt(clean, title.end, "[", "]");
      const kind =
        vocabulary[name.value] ??
        Object.entries(vocabulary).find(([key]) =>
          new RegExp(`\\b${key}\\b`, "i").test(title.value),
        )?.[1] ??
        "other";
      if (shared && shared.value !== name.value)
        aliases[name.value] = shared.value;
      definitions.set(name.value, {
        kind,
        counter: name.value,
        within: within?.value,
        numbered: !command.name.endsWith("*"),
      });
    }
  }
  const sections: ImportedPaper["sections"] = [],
    objects: ImportedMathObject[] = [],
    frames: Frame[] = [],
    completed: Frame[] = [];
  const labelRecords: {
    label: string;
    position: number;
    frame?: Frame;
    section?: number;
  }[] = [];
  const metadata: ImportedPaper["metadata"] = {
    authors: [],
    authorLatex: [],
    ...(/^\d{4}\.\d{4,5}$/.test(source.paperDirectory)
      ? { arxivId: source.paperDirectory }
      : {}),
  };
  let section = 0,
    subsection = 0,
    sectionTitle: string | undefined,
    subsectionTitle: string | undefined,
    appendix = false;
  const counters: Record<string, number> = {};
  let unreliableNumbers = false;
  const makeObject = (frame: Frame): ImportedMathObject => {
    const ranges = spans(frame.start, frame.end!);
    const first = ranges[0] ?? location(frame.start);
    const statement = text.slice(frame.bodyStart, frame.bodyEnd!).trim();
    const refs = extractReferences(statement, "statement");
    const declaration = definitions.get(frame.name);
    const environment = declaration?.kind ?? frame.name.replace(/\*$/, "");
    return {
      sourceKey: "",
      environment,
      labels: frame.labels,
      latexLabel: frame.labels[0],
      printedNumber: unreliableNumbers ? undefined : frame.printedNumber,
      numberingNote: frame.printedNumber
        ? "Structural estimate from declared counters; no TeX compilation."
        : undefined,
      title: frame.title,
      statement,
      section: frame.section,
      subsection: frame.subsection,
      sourceFile: first.file,
      startLine: first.startLine,
      endLine:
        ranges.filter((s) => s.file === first.file).at(-1)?.endLine ??
        first.endLine,
      spans: ranges,
      references: refs.references,
      citations: refs.citations,
      equations: [
        ...statement.matchAll(
          /\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$|\\begin\{(?:equation\*?|align\*?|gather\*?)\}([\s\S]*?)\\end\{(?:equation\*?|align\*?|gather\*?)\}/g,
        ),
      ].map((m) => m[0]),
      proposedNodeType: proposedType(environment),
      suggestedId: "",
      contentHash: "",
      claimStanding: "source-claimed",
      verification: {
        method: "human-source",
        note: `Extracted from a ${frame.name} environment in the author's source; not independently verified by Math Overlord.`,
      },
      candidates: [],
      reviewState: "NEW",
      warnings: frame.labels.length
        ? []
        : [
            "No stable LaTeX label: identity falls back to normalized source text.",
          ],
      blocked: false,
    };
  };
  for (const command of tokens) {
    const arg = groupAt(clean, command.end);
    if (["title", "author"].includes(command.name) && arg) {
      const raw = text.slice(arg.start + 1, arg.end - 1);
      if (command.name === "title") metadata.title = raw;
      else {
        metadata.authorLatex.push(raw);
        metadata.authors.push(
          ...raw
            .split(/\\and\b/)
            .map((a) => plainLatex(a.split(/\\\\/)[0], macros))
            .filter(Boolean),
        );
      }
    }
    if (command.name === "appendix") {
      appendix = true;
      section = 0;
      subsection = 0;
    }
    if (command.name === "setcounter" && arg) {
      const val = groupAt(clean, arg.end);
      if (val && /^\d+$/.test(val.value)) {
        if (arg.value === "section") section = Number(val.value);
        else if (arg.value === "subsection") subsection = Number(val.value);
        else counters[root(arg.value)] = Number(val.value);
      } else unreliableNumbers = true;
    }
    if (command.name === "renewcommand") {
      const macro = macroAt(clean, command.end);
      if (macro?.name.startsWith("\\the") && macro.name !== "\\thepage")
        unreliableNumbers = true;
    }
    if (/^(section|subsection)\*?$/.test(command.name)) {
      const option = groupAt(clean, command.end, "[", "]"),
        title = groupAt(clean, option?.end ?? command.end);
      if (!title) continue;
      const level = command.name.startsWith("sub") ? "subsection" : "section",
        numbered = !command.name.endsWith("*");
      if (level === "section") {
        if (numbered) section++;
        subsection = 0;
        sectionTitle = text.slice(title.start + 1, title.end - 1);
        subsectionTitle = undefined;
      } else {
        if (numbered) subsection++;
        subsectionTitle = text.slice(title.start + 1, title.end - 1);
      }
      if (numbered)
        for (const [name, definition] of definitions)
          if (definition.within === level) counters[root(name)] = 0;
      const number = appendix
        ? String.fromCharCode(64 + section)
        : String(section);
      const loc = location(command.start);
      sections.push({
        level,
        title: level === "section" ? sectionTitle! : subsectionTitle!,
        number: numbered
          ? `${number}${level === "subsection" ? `.${subsection}` : ""}`
          : undefined,
        labels: [],
        sourceFile: loc.file,
        startLine: loc.startLine,
      });
    }
    if (command.name === "begin" && arg) {
      const optional = groupAt(clean, arg.end, "[", "]");
      const name = arg.value;
      const declaration = definitions.get(name);
      let printedNumber: string | undefined;
      if (declaration?.numbered) {
        const counter = root(declaration.counter);
        counters[counter] = (counters[counter] ?? 0) + 1;
        const parent = definitions.get(counter)?.within ?? declaration.within;
        const sec = appendix
          ? String.fromCharCode(64 + section)
          : String(section);
        if (!parent) printedNumber = String(counters[counter]);
        else if (parent === "section")
          printedNumber = `${sec}.${counters[counter]}`;
        else if (parent === "subsection")
          printedNumber = `${sec}.${subsection}.${counters[counter]}`;
      }
      frames.push({
        name,
        start: command.start,
        bodyStart: optional?.end ?? arg.end,
        title: optional
          ? text.slice(optional.start + 1, optional.end - 1)
          : undefined,
        labels: [],
        section: sectionTitle,
        subsection: subsectionTitle,
        printedNumber,
      });
    }
    if (command.name === "label" && arg) {
      const frame = frames.at(-1);
      if (frame) frame.labels.push(arg.value);
      if (!frame || frame.name === "document")
        sections.at(-1)?.labels.push(arg.value);
      labelRecords.push({
        label: arg.value,
        position: command.start,
        frame,
        section: sections.length - 1,
      });
    }
    if (command.name === "end" && arg) {
      const frame = frames.at(-1);
      if (!frame || frame.name !== arg.value) {
        const loc = location(command.start);
        diagnostics.push({
          severity: "error",
          file: loc.file,
          line: loc.startLine,
          message: `Unmatched \\end{${arg.value}}`,
        });
        continue;
      }
      frames.pop();
      frame.bodyEnd = command.start;
      frame.end = arg.end;
      if (frame.name === "abstract")
        metadata.abstract = text.slice(frame.bodyStart, frame.bodyEnd).trim();
      if (
        definitions.has(frame.name) ||
        Object.hasOwn(vocabulary, frame.name.replace(/\*$/, ""))
      ) {
        frame.object = makeObject(frame);
        objects.push(frame.object);
      }
      if (frame.name === "proof") {
        const previous = completed.findLast(
          (f) => f.object && f.end! <= frame.start,
        );
        if (
          previous?.object &&
          /^\s*$/.test(clean.slice(previous.end!, frame.start))
        ) {
          previous.object.proof = text
            .slice(frame.bodyStart, frame.bodyEnd)
            .trim();
          previous.object.proofSpans = spans(frame.start, frame.end);
          const refs = extractReferences(previous.object.proof, "proof");
          previous.object.references.push(...refs.references);
          previous.object.citations = [
            ...new Set([...previous.object.citations, ...refs.citations]),
          ];
        }
      }
      completed.push(frame);
    }
  }
  for (const frame of frames) {
    const loc = location(frame.start);
    diagnostics.push({
      severity: "error",
      file: loc.file,
      line: loc.startLine,
      message: `Unclosed \\begin{${frame.name}}; incomplete object was not extracted`,
    });
  }
  const frequencies = new Map<string, number>();
  for (const record of labelRecords)
    frequencies.set(record.label, (frequencies.get(record.label) ?? 0) + 1);
  const keys = new Map<string, ImportedMathObject>();
  for (const object of objects) {
    object.contentHash = fingerprint(object, macros);
    let key = object.latexLabel
      ? `label:${object.latexLabel}`
      : `unlabeled:${object.environment}:${hash(normalizeLatex(object.statement)).slice(0, 16)}`;
    if (object.labels.some((label) => (frequencies.get(label) ?? 0) > 1)) {
      object.blocked = true;
      object.warnings.push(
        "Duplicate LaTeX label: source identity is ambiguous.",
      );
    }
    if (keys.has(key)) {
      object.blocked = true;
      keys.get(key)!.blocked = true;
      keys
        .get(key)!
        .warnings.push(
          "Repeated unlabeled identity requires a unique source label.",
        );
      key += `:duplicate:${object.sourceFile}:${object.startLine}`;
    }
    keys.set(key, object);
    object.sourceKey = key;
    object.suggestedId = suggestedId(source.paperDirectory, key);
  }
  const labels: ImportedPaper["labels"] = Object.create(null);
  for (const record of labelRecords) {
    const loc = location(record.position);
    const frame = record.frame;
    const entries = (labels[record.label] ??= []);
    entries.push({
      kind: frame?.object
        ? frame.object.environment
        : frame?.name === "document"
          ? "section"
          : (frame?.name ?? "section"),
      sourceKey: frame?.object?.sourceKey,
      file: loc.file,
      line: loc.startLine,
    });
    labels[record.label] = entries;
  }
  for (const [label, count] of frequencies)
    if (count > 1)
      diagnostics.push({
        severity: "error",
        message: `Duplicate label ${label} (${count} occurrences)`,
      });
  for (const object of objects)
    for (const reference of object.references) {
      const targets = labels[reference.label];
      if (targets?.length === 1) {
        reference.targetSourceKey = targets[0].sourceKey;
        reference.targetKind = targets[0].kind;
      } else
        object.warnings.push(
          `${targets ? "Ambiguous" : "Unresolved"} source reference: ${reference.label}`,
        );
    }
  const citations: ImportedPaper["citations"] = [];
  for (const file of expanded.bibliographies) {
    const parsed = parseBibtex(expanded.files[file] ?? "", prefix + file);
    citations.push(...parsed.entries);
    diagnostics.push(...parsed.diagnostics);
  }
  const citationKeys = extractReferences(text, "statement").citations;
  const seenBib = new Set<string>();
  for (const citation of citations) {
    if (seenBib.has(citation.key))
      diagnostics.push({
        severity: "error",
        message: `Duplicate bibliography key across files: ${citation.key}`,
      });
    seenBib.add(citation.key);
    citation.used =
      citationKeys.includes(citation.key) || citationKeys.includes("*");
  }
  for (const key of citationKeys)
    if (key !== "*" && !seenBib.has(key))
      diagnostics.push({
        severity: "warning",
        message: `Citation key has no bibliography entry: ${key}`,
      });
  for (const object of objects) {
    const cited = citations
      .filter(
        (c) =>
          object.citations.includes(c.key) || object.citations.includes("*"),
      )
      .map((c) => [c.key, c.fields]);
    object.contentHash = hash(JSON.stringify([object.contentHash, cited]));
  }
  if (!metadata.title)
    diagnostics.push({
      severity: "warning",
      message: "No \\title metadata found",
    });
  if (unreliableNumbers) {
    diagnostics.push({
      severity: "warning",
      message:
        "Custom counter representation detected; printed numbers omitted rather than guessed.",
    });
    objects.forEach((o) => {
      delete o.printedNumber;
    });
  }
  objects.sort(
    (a, b) =>
      a.sourceFile.localeCompare(b.sourceFile) || a.startLine - b.startLine,
  );
  const paperProposal: ImportedMathObject = {
    sourceKey: "paper",
    environment: "paper",
    labels: [],
    title: metadata.title,
    statement: metadata.abstract ?? "",
    sourceFile: prefix + source.entrypoint,
    startLine: 1,
    endLine: expanded.files[source.entrypoint]?.split("\n").length ?? 1,
    spans: [],
    references: [],
    citations: citationKeys,
    equations: [],
    proposedNodeType: "paper",
    suggestedId: `P${source.paperDirectory.replace(/\W/g, "-")}-PAPER`,
    contentHash: hash(
      JSON.stringify([
        metadata,
        relevantMacros(JSON.stringify(metadata), macros),
        citations.map((c) => [c.key, c.fields]),
      ]),
    ),
    claimStanding: "source-claimed",
    verification: {
      method: "human-source",
      note: "Paper metadata extracted from the working TeX; publication and proof status were not independently verified.",
    },
    candidates: [],
    reviewState: "NEW",
    warnings: [],
    blocked: false,
  };
  return {
    formatVersion: 1,
    extractorVersion: "0.2.0",
    source,
    metadata,
    sections,
    objects,
    paperProposal,
    citations,
    citationKeys,
    macros,
    labels,
    diagnostics,
  };
}
