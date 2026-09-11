import { createHash } from "node:crypto";
import { z } from "astro/zod";
import { identifier } from "./node-schema.ts";

const commit = z.string().regex(/^[a-f0-9]{40}$/);
const selectionSchema = z.object({
  file: z.string().min(1),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  selectedText: z.string().min(1),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
});

export const sourceFragmentSchema = z.object({
  id: z.string().regex(/^FRAG-[A-Z0-9-]+$/),
  kind: z.literal("source-fragment"),
  source: z.object({
    repository: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
    branch: z.string().min(1),
    commit,
    file: z.string().min(1),
    paperDirectory: z.string().min(1),
  }),
  container: z.object({
    latexLabel: z.string().min(1),
    environment: z.string().min(1),
    printedNumber: z.string().optional(),
  }),
  assertionSelections: z.array(selectionSchema).min(1),
  contextSelections: z
    .array(selectionSchema.extend({ role: z.string().min(1) }))
    .default([]),
  context: z.object({
    sourceKey: z.string().min(1),
    title: z.string().min(1),
    paperTitle: z.string().min(1).optional(),
    section: z.string().optional(),
    statementScope: z.string().min(1),
  }),
});

export const sourceAttestationSchema = z.object({
  id: z.string().regex(/^ATT-[A-Z0-9-]+$/),
  kind: z.literal("source-attestation"),
  fragment: z.string().regex(/^FRAG-[A-Z0-9-]+$/),
  target: identifier,
  relation: z.literal("asserts"),
  coverage: z.string().min(1),
  review: z.object({
    state: z.enum(["accepted", "needs-review", "rejected"]),
    method: z.literal("human"),
    sourceCommit: commit,
    note: z.string().min(1),
  }),
});

export type SourceFragment = z.infer<typeof sourceFragmentSchema>;
export type SourceAttestation = z.infer<typeof sourceAttestationSchema>;
export type SourceSelection = z.infer<typeof selectionSchema>;
export type SemanticReviewState = "accepted" | "needs-review" | "rejected";
export type ProvenanceChange =
  | "current"
  | "locator-changed"
  | "assertion-changed"
  | "context-changed"
  | "source-missing";

export interface ImportedEnvironmentObject {
  sourceKey: string;
  environment: string;
  latexLabel?: string;
  printedNumber?: string;
  title?: string;
  sourceFile: string;
  startLine: number;
  statement: string;
  section?: string;
}

export interface ImportedPaperLike {
  metadata?: { title?: string };
  source: {
    repository: string;
    branch: string;
    commit: string;
    paperDirectory: string;
  };
  objects: readonly ImportedEnvironmentObject[];
}

interface ResolvedSelection {
  file?: string;
  startLine?: number;
  endLine?: number;
  selectedText?: string;
  contentHash?: string;
  matched: boolean;
}

export interface ImportedEnvironmentSnapshot {
  source: SourceFragment["source"];
  container: SourceFragment["container"];
  assertionSelections: ResolvedSelection[];
  contextSelections: ResolvedSelection[];
  context: Pick<SourceFragment["context"], "sourceKey" | "title" | "paperTitle" | "section">;
}

const hashText = (text: string) =>
  createHash("sha256").update(text, "utf8").digest("hex");

function selectionLines(statement: string, start: number, text: string) {
  const before = statement.slice(0, start);
  const startLineOffset = before ? before.split("\n").length - 1 : 0;
  const lineCount = text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
  return { startLineOffset, lineCount: Math.max(lineCount, 1) };
}

function resolveSelection(
  object: ImportedEnvironmentObject,
  selection: SourceSelection,
): ResolvedSelection {
  const start = object.statement.indexOf(selection.selectedText);
  if (start < 0) return { matched: false };
  const { startLineOffset, lineCount } = selectionLines(
    object.statement,
    start,
    selection.selectedText,
  );
  return {
    file: object.sourceFile,
    startLine: object.startLine + startLineOffset,
    endLine: object.startLine + startLineOffset + lineCount - 1,
    selectedText: selection.selectedText,
    contentHash: hashText(selection.selectedText),
    matched: true,
  };
}

export function buildImportedEnvironmentSnapshot(
  importedPaper: ImportedPaperLike,
  sourceKey: string,
  selectionConfig: Pick<SourceFragment, "assertionSelections" | "contextSelections">,
): ImportedEnvironmentSnapshot | null {
  const object = importedPaper.objects.find(
    (candidate) => candidate.sourceKey === sourceKey || candidate.latexLabel === sourceKey,
  );
  if (!object) return null;
  return {
    source: {
      repository: importedPaper.source.repository,
      branch: importedPaper.source.branch,
      commit: importedPaper.source.commit,
      file: object.sourceFile,
      paperDirectory: importedPaper.source.paperDirectory,
    },
    container: {
      latexLabel: object.latexLabel ?? sourceKey,
      environment: object.environment,
      printedNumber: object.printedNumber,
    },
    assertionSelections: selectionConfig.assertionSelections.map((selection) =>
      resolveSelection(object, selection),
    ),
    contextSelections: selectionConfig.contextSelections.map((selection) =>
      resolveSelection(object, selection),
    ),
    context: {
      sourceKey: object.sourceKey,
      title: object.title ?? object.latexLabel ?? sourceKey,
      paperTitle: importedPaper.metadata?.title,
      section: object.section,
    },
  };
}

export interface SourceFreshness {
  state: ProvenanceChange;
  locatorState: "current" | "changed";
  assertionState: "current" | "changed";
  contextState: "current" | "changed";
  reasons: string[];
}

function selectionChanged(
  pinned: SourceSelection,
  current: ResolvedSelection | undefined,
) {
  return (
    !current?.matched ||
    current.selectedText !== pinned.selectedText ||
    current.contentHash !== pinned.contentHash
  );
}

function selectionLocatorChanged(
  pinned: SourceSelection,
  current: ResolvedSelection | undefined,
) {
  return (
    current?.matched === true &&
    (current.file !== pinned.file ||
      current.startLine !== pinned.startLine ||
      current.endLine !== pinned.endLine)
  );
}

export function inspectSourceFragment(
  fragment: SourceFragment,
  snapshot: ImportedEnvironmentSnapshot | null,
): SourceFreshness {
  if (!snapshot) {
    return {
      state: "source-missing",
      locatorState: "changed",
      assertionState: "changed",
      contextState: fragment.contextSelections.length ? "changed" : "current",
      reasons: ["source environment is missing from the imported paper"],
    };
  }
  const reasons: string[] = [];
  const locatorChanged =
    fragment.source.repository !== snapshot.source.repository ||
    fragment.source.branch !== snapshot.source.branch ||
    fragment.source.commit !== snapshot.source.commit ||
    fragment.source.file !== snapshot.source.file ||
    fragment.source.paperDirectory !== snapshot.source.paperDirectory ||
    fragment.container.latexLabel !== snapshot.container.latexLabel ||
    fragment.container.environment !== snapshot.container.environment ||
    fragment.container.printedNumber !== snapshot.container.printedNumber ||
    fragment.context.sourceKey !== snapshot.context.sourceKey ||
    fragment.context.title !== snapshot.context.title ||
    fragment.context.paperTitle !== snapshot.context.paperTitle ||
    fragment.context.section !== snapshot.context.section ||
    fragment.assertionSelections.some((selection, index) =>
      selectionLocatorChanged(selection, snapshot.assertionSelections[index]),
    ) ||
    fragment.contextSelections.some((selection, index) =>
      selectionLocatorChanged(selection, snapshot.contextSelections[index]),
    );
  const assertionChanged = fragment.assertionSelections.some((selection, index) =>
    selectionChanged(selection, snapshot.assertionSelections[index]),
  );
  const contextChanged = fragment.contextSelections.some((selection, index) =>
    selectionChanged(selection, snapshot.contextSelections[index]),
  );
  if (locatorChanged) reasons.push("source locator or presentation metadata changed");
  if (assertionChanged) reasons.push("assertion selection changed");
  if (contextChanged) reasons.push("context selection changed");
  return {
    state: assertionChanged
      ? "assertion-changed"
      : contextChanged
        ? "context-changed"
        : locatorChanged
          ? "locator-changed"
          : "current",
    locatorState: locatorChanged ? "changed" : "current",
    assertionState: assertionChanged ? "changed" : "current",
    contextState: contextChanged ? "changed" : "current",
    reasons,
  };
}

export interface AttestationStatus {
  semanticReview: SemanticReviewState;
  freshness: SourceFreshness;
}

export function evaluateAttestation(
  attestation: SourceAttestation,
  fragment: SourceFragment,
  snapshot: ImportedEnvironmentSnapshot | null,
): AttestationStatus {
  const freshness = inspectSourceFragment(fragment, snapshot);
  const semanticReview =
    attestation.review.state === "rejected"
      ? "rejected"
      : attestation.review.state === "accepted" &&
          freshness.assertionState === "current" &&
          freshness.contextState === "current"
        ? "accepted"
        : "needs-review";
  return { semanticReview, freshness };
}

export function validateProvenance(
  nodes: readonly { id: string; type: string }[],
  fragments: readonly SourceFragment[],
  attestations: readonly SourceAttestation[],
) {
  const unique = (items: readonly { id: string }[], kind: string) => {
    const ids = new Set<string>();
    for (const item of items) {
      if (ids.has(item.id)) throw new Error(`Duplicate ${kind} ID: ${item.id}`);
      ids.add(item.id);
    }
  };
  unique(fragments, "source fragment");
  unique(attestations, "source attestation");
  for (const fragment of fragments) {
    sourceFragmentSchema.parse(fragment);
    if (!fragment.assertionSelections.length)
      throw new Error(`${fragment.id}: assertion selection is empty`);
  }
  const fragmentIds = new Set(fragments.map((fragment) => fragment.id));
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  for (const attestation of attestations) {
    sourceAttestationSchema.parse(attestation);
    if (!fragmentIds.has(attestation.fragment))
      throw new Error(
        `${attestation.id}: unknown source fragment ${attestation.fragment}`,
      );
    const target = nodesById.get(attestation.target);
    if (!target) throw new Error(`${attestation.id}: unknown target ${attestation.target}`);
    if (target.type !== "claim")
      throw new Error(`${attestation.id}: target ${attestation.target} is not a claim`);
  }
}
