import path from "node:path";
import { readFile } from "node:fs/promises";
import { Document } from "yaml";
import { readCurated, serializeRecord } from "./curated.ts";
import { atomicWrite, readJson, writeJson } from "./files.ts";
import { ledgerFor, proposals, stagingPath } from "./staging.ts";
import { relevantMacros } from "./parser.ts";
import { plainLatex } from "./latex.ts";
import { nodeSchema } from "../../src/lib/node-schema.ts";
import {
  projects,
  relationTypes,
  type RelationType,
} from "../../src/lib/model.ts";
import { validateNetwork } from "../../src/lib/relations.ts";
import { validateProjectMembership } from "../../src/lib/ontology.ts";
import type { ImportedPaper } from "./types.ts";
export interface AcceptOptions {
  match?: string;
  id?: string;
  projects?: string[];
  write?: boolean;
  publication?: string;
}
export async function loadProposal(root: string, id: string, key: string) {
  const paper = await readJson<ImportedPaper>(
    path.join(stagingPath(root, id), "paper.json"),
  );
  if (!paper) throw new Error(`Import ${id} first.`);
  const matches = proposals(paper).filter(
    (o) => o.sourceKey === key || o.labels.includes(key),
  );
  if (matches.length !== 1)
    throw new Error(
      `Expected one proposal for ${key}; found ${matches.length}. Use its full source key.`,
    );
  return { paper, object: matches[0] };
}
export async function acceptProposal(
  root: string,
  id: string,
  key: string,
  options: AcceptOptions = {},
) {
  const { paper, object } = await loadProposal(root, id, key);
  if (object.blocked || paper.diagnostics.some((d) => d.severity === "error"))
    throw new Error(
      "Resolve source errors/ambiguous labels and re-import before acceptance.",
    );
  const records = await readCurated(root),
    ledger = await ledgerFor(root, id),
    previous = ledger.decisions[object.sourceKey];
  const exact = records.filter((r) =>
    r.data.sources.some(
      (s) =>
        s.repository === paper.source.repository &&
        s.paperDirectory === id &&
        s.sourceKey === object.sourceKey,
    ),
  );
  if (exact.length > 1)
    throw new Error(
      "Source identity is attached to multiple curated nodes; resolve manually.",
    );
  const chosen =
    options.match ??
    (previous?.state === "ACCEPTED" ? previous.nodeId : undefined) ??
    exact[0]?.data.id;
  if (exact.length && chosen !== exact[0].data.id)
    throw new Error("This source already belongs to another stable node ID.");
  const existing = chosen
    ? records.find((r) => r.data.id === chosen)
    : undefined;
  if (chosen && !existing) throw new Error(`Unknown curated ID ${chosen}`);
  if (existing && options.id && options.id !== existing.data.id)
    throw new Error("Acceptance cannot change an existing stable ID.");
  if (!existing && (!options.id || !options.projects?.length))
    throw new Error(
      "Choose --match EXISTING-ID, or explicitly supply --id NEW-ID --projects PROJECT[,PROJECT]. Candidates are suggestions only.",
    );
  const now = new Date().toISOString();
  const source = {
    kind: "github-latex" as const,
    repository: paper.source.repository,
    branch: paper.source.branch,
    commit: paper.source.commit,
    path: object.sourceFile,
    paperDirectory: id,
    sourceKey: object.sourceKey,
    label: object.latexLabel,
    environment: object.environment,
    section: object.section,
    printedNumber: object.printedNumber,
    startLine: object.startLine,
    endLine: object.endLine,
    contentHash: object.contentHash,
    retrievedAt: paper.source.retrievedAt,
    acceptedAt: now,
    statementLatex: object.statement,
    proofLatex: object.proof,
    macros: relevantMacros(
      object.statement + (object.proof ?? ""),
      paper.macros,
    ),
    citations: paper.citations
      .filter(
        (c) =>
          object.citations.includes(c.key) || object.citations.includes("*"),
      )
      .map(({ key, title, authors, year, journal, doi, eprint, url }) => ({
        key,
        title,
        authors,
        year,
        journal,
        doi,
        eprint,
        url,
      })),
    paperMetadata:
      object.environment === "paper"
        ? {
            title: paper.metadata.title,
            authors: paper.metadata.authors,
            abstract: paper.metadata.abstract,
          }
        : undefined,
  };
  let file: string, before: string, after: string, data;
  Object.assign(source, {
    spans: object.spans,
    proofSpans: object.proofSpans ?? [],
    files: paper.source.files,
  });
  if (existing) {
    const sources = [...existing.data.sources];
    const index = sources.findIndex(
      (s) =>
        s.repository === source.repository &&
        s.paperDirectory === id &&
        s.sourceKey === source.sourceKey,
    );
    const validatedSource = nodeSchema.parse({
      ...existing.data,
      sources: [source],
    }).sources[0];
    if (index >= 0) sources[index] = validatedSource;
    else sources.push(validatedSource);
    existing.document.set("sources", JSON.parse(JSON.stringify(sources)));
    data = nodeSchema.parse(existing.document.toJS());
    file = existing.file;
    before = existing.raw;
    after = serializeRecord(existing);
  } else {
    const title = plainLatex(
      object.title ??
        `${object.environment} ${object.latexLabel ?? object.printedNumber ?? id}`,
      paper.macros,
    );
    data = nodeSchema.parse({
      id: options.id,
      title,
      shortTitle: title.slice(0, 90),
      type: object.proposedNodeType,
      claimStatus: "source-claimed",
      publicationStatus: options.publication ?? "draft",
      summary: `Statement attributed to the author's ${object.environment} source; accepted for provenance, not independently verified.`,
      authors: paper.metadata.authors,
      projects: options.projects,
      tags: [],
      references: [],
      dependsOn: [],
      relations: [],
      verification: object.verification,
      provenance: "source-backed",
      arxiv:
        object.environment === "paper" ? paper.metadata.arxivId : undefined,
      sources: [source],
    });
    file = path.join(root, "src/content/nodes", `${data.id.toLowerCase()}.md`);
    before = "";
    try {
      await readFile(file);
      throw new Error(`Refusing to overwrite ${file}`);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
    after = `---\n${new Document(data).toString()}---\n\nThe accepted source statement and provenance are recorded below.\n`;
  }
  const network = [
    ...records.filter((r) => r.file !== file).map((r) => r.data),
    data,
  ];
  validateNetwork(network);
  validateProjectMembership(network, projects);
  if (options.write) {
    // Detect another editor changing the selected file between planning and writing.
    if (existing && (await readFile(file, "utf8")) !== before)
      throw new Error(
        "Curated file changed while acceptance was prepared; retry.",
      );
    await atomicWrite(file, after);
    ledger.decisions[object.sourceKey] = {
      state: "ACCEPTED",
      contentHash: object.contentHash,
      nodeId: data.id,
      commit: paper.source.commit,
      reviewedAt: now,
      note: "Explicit CLI acceptance of source metadata; manual prose, claim status, and semantic relations retained.",
    };
    await writeJson(path.join(stagingPath(root, id), "review.json"), ledger);
  }
  return { file, nodeId: data.id, before, after, written: !!options.write };
}
export async function rejectProposal(
  root: string,
  id: string,
  key: string,
  note: string,
  write = false,
) {
  if (!note.trim()) throw new Error("--note is required for a rejection.");
  const { paper, object } = await loadProposal(root, id, key);
  const ledger = await ledgerFor(root, id);
  ledger.decisions[object.sourceKey] = {
    state: "REJECTED",
    contentHash: object.contentHash,
    commit: paper.source.commit,
    reviewedAt: new Date().toISOString(),
    note,
  };
  if (write)
    await writeJson(path.join(stagingPath(root, id), "review.json"), ledger);
  return ledger.decisions[object.sourceKey];
}
export async function relateNodes(
  root: string,
  from: string,
  target: string,
  type: string,
  note: string,
  write = false,
) {
  if (!relationTypes.includes(type as RelationType) || !note.trim())
    throw new Error(
      "Choose a supported --type and supply --note explaining your mathematical judgment.",
    );
  const records = await readCurated(root);
  const record = records.find((r) => r.data.id === from);
  if (!record) throw new Error(`Unknown node ${from}`);
  const relations = [...record.data.relations];
  if (relations.some((r) => r.target === target && r.type === type))
    throw new Error("Relation already exists.");
  relations.push({ target, type: type as RelationType, note });
  record.document.set("relations", relations);
  const data = nodeSchema.parse(record.document.toJS());
  validateNetwork(records.map((r) => (r === record ? data : r.data)));
  const after = serializeRecord(record);
  if (write) {
    if ((await readFile(record.file, "utf8")) !== record.raw)
      throw new Error("Concurrent edit; retry.");
    await atomicWrite(record.file, after);
  }
  return { file: record.file, before: record.raw, after, written: write };
}
