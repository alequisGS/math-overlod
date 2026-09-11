import { z } from "astro/zod";
import { createHash } from "node:crypto";
import importedPaper from "../../imports/2606.18238/paper.json" with {
  type: "json",
};
import {
  rawSourceAttestations,
  rawSourceFragments,
} from "../content/provenance.ts";
import { identifier } from "./node-schema.ts";

const commit = z.string().regex(/^[a-f0-9]{40}$/);

const sourceReferenceSchema = z.object({
  repository: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
  branch: z.string().min(1),
  commit,
  file: z.string().min(1),
  paperDirectory: z.string().min(1),
});

export const sourceFragmentSchema = z.object({
  id: z.string().regex(/^FRAG-[A-Z0-9-]+$/),
  kind: z.literal("source-fragment"),
  source: sourceReferenceSchema,
  container: z.object({
    latexLabel: z.string().min(1),
    environment: z.string().min(1),
    printedNumber: z.string().optional(),
  }),
  selection: z.object({
    startLine: z.number().int().positive(),
    endLine: z.number().int().positive(),
    selectedText: z.string().min(1),
    contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  }),
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
export type ProvenanceReviewState = "current" | "needs-review";

export const sourceFragments = rawSourceFragments.map((fragment) =>
  sourceFragmentSchema.parse(fragment),
);
export const sourceAttestations = rawSourceAttestations.map((attestation) =>
  sourceAttestationSchema.parse(attestation),
);

type ImportedObject = {
  sourceKey: string;
  environment: string;
  latexLabel?: string;
  printedNumber?: string;
  title?: string;
  sourceFile: string;
  startLine: number;
  endLine: number;
  statement: string;
  contentHash: string;
  section?: string;
};
type ImportedPaper = {
  metadata?: { title?: string };
  source: {
    repository: string;
    branch: string;
    commit: string;
    paperDirectory: string;
  };
  objects: ImportedObject[];
};

export interface ImportedEnvironmentSnapshot {
  source: SourceFragment["source"];
  container: SourceFragment["container"];
  selection: Pick<SourceFragment["selection"], "startLine" | "endLine" | "selectedText" | "contentHash">;
  context: Pick<SourceFragment["context"], "sourceKey" | "title" | "paperTitle" | "section">;
}

const paper = importedPaper as ImportedPaper;
const pilotObject = paper.objects.find(
  (object) => object.latexLabel === "thm:X10-main",
);
if (!pilotObject) throw new Error("Imported theorem thm:X10-main is missing.");

const pilotSelection = pilotObject.statement.split("\\begin{enumerate}")[0];
const hashText = (text: string) =>
  createHash("sha256").update(text, "utf8").digest("hex");
export const pilotSourceSnapshot: ImportedEnvironmentSnapshot = {
  source: {
    repository: paper.source.repository,
    branch: paper.source.branch,
    commit: paper.source.commit,
    file: pilotObject.sourceFile,
    paperDirectory: paper.source.paperDirectory,
  },
  container: {
    latexLabel: pilotObject.latexLabel!,
    environment: pilotObject.environment,
    printedNumber: pilotObject.printedNumber,
  },
  selection: {
    startLine: pilotObject.startLine,
    endLine:
      pilotSelection.split("\n").length +
      pilotObject.startLine -
      (pilotSelection.endsWith("\n") ? 2 : 1),
    selectedText: pilotSelection,
    contentHash: hashText(pilotSelection),
  },
  context: {
    sourceKey: pilotObject.sourceKey,
    title: pilotObject.title ?? pilotObject.latexLabel!,
    paperTitle: paper.metadata?.title,
    section: pilotObject.section,
  },
};

export function inspectSourceFragment(
  fragment: SourceFragment,
  snapshot: ImportedEnvironmentSnapshot = pilotSourceSnapshot,
) {
  const reasons: string[] = [];
  if (fragment.source.commit !== snapshot.source.commit)
    reasons.push("source commit changed");
  if (
    fragment.source.repository !== snapshot.source.repository ||
    fragment.source.branch !== snapshot.source.branch ||
    fragment.source.file !== snapshot.source.file ||
    fragment.source.paperDirectory !== snapshot.source.paperDirectory
  )
    reasons.push("source location changed");
  if (
    fragment.container.latexLabel !== snapshot.container.latexLabel ||
    fragment.container.environment !== snapshot.container.environment ||
    fragment.container.printedNumber !== snapshot.container.printedNumber
  )
    reasons.push("source environment metadata changed");
  if (
    fragment.selection.startLine !== snapshot.selection.startLine ||
    fragment.selection.endLine !== snapshot.selection.endLine ||
    fragment.selection.selectedText !== snapshot.selection.selectedText ||
    fragment.selection.contentHash !== snapshot.selection.contentHash
  )
    reasons.push("selected source text or line range changed");
  if (
    fragment.context.sourceKey !== snapshot.context.sourceKey ||
    fragment.context.title !== snapshot.context.title ||
    fragment.context.paperTitle !== snapshot.context.paperTitle ||
    fragment.context.section !== snapshot.context.section
  )
    reasons.push("recorded source context changed");
  return {
    state: reasons.length ? ("needs-review" as const) : ("current" as const),
    reasons,
  };
}

export function attestationReviewState(
  attestation: SourceAttestation,
  fragment: SourceFragment,
  snapshot: ImportedEnvironmentSnapshot = pilotSourceSnapshot,
) {
  if (attestation.review.state !== "accepted") return attestation.review.state;
  if (attestation.review.sourceCommit !== fragment.source.commit)
    return "needs-review" as const;
  return inspectSourceFragment(fragment, snapshot).state === "needs-review"
    ? ("needs-review" as const)
    : ("accepted" as const);
}

export function validateProvenance(
  nodes: readonly { id: string; type: string }[],
  fragments: readonly SourceFragment[] = sourceFragments,
  attestations: readonly SourceAttestation[] = sourceAttestations,
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
  const fragmentIds = new Set(fragments.map((fragment) => fragment.id));
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  for (const attestation of attestations) {
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
