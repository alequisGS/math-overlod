export interface Diagnostic {
  severity: "warning" | "error";
  message: string;
  file?: string;
  line?: number;
}
export interface SourceFile {
  path: string;
  sha256: string;
  bytes: number;
}
export interface PaperSource {
  provider: "github";
  repository: string;
  branch: string;
  commit: string;
  root: string;
  paperDirectory: string;
  retrievedAt: string;
  files: SourceFile[];
  entrypoint: string;
}
export interface SourceSpan {
  file: string;
  startLine: number;
  endLine: number;
}
export interface ImportedSection {
  level: "section" | "subsection";
  title: string;
  number?: string;
  labels: string[];
  sourceFile: string;
  startLine: number;
}
export interface ImportedCitation {
  key: string;
  entryType: string;
  authors: string[];
  title?: string;
  year?: string;
  journal?: string;
  doi?: string;
  eprint?: string;
  url?: string;
  fields: Record<string, string>;
  raw: string;
  sourceFile: string;
  used: boolean;
}
export interface SourceReference {
  label: string;
  command: string;
  context: "statement" | "proof";
  targetSourceKey?: string;
  targetKind?: string;
}
export interface CandidateMatch {
  nodeId: string;
  confidence: number;
  reasons: string[];
  exact: boolean;
}
export type ReviewState =
  | "NEW"
  | "MATCHED"
  | "CHANGED"
  | "POSSIBLE DUPLICATE"
  | "NEEDS REVIEW"
  | "ACCEPTED"
  | "REJECTED";
export interface ImportedMathObject {
  sourceKey: string;
  environment: string;
  latexLabel?: string;
  labels: string[];
  printedNumber?: string;
  numberingNote?: string;
  title?: string;
  statement: string;
  proof?: string;
  section?: string;
  subsection?: string;
  sourceFile: string;
  startLine: number;
  endLine: number;
  spans: SourceSpan[];
  proofSpans?: SourceSpan[];
  references: SourceReference[];
  citations: string[];
  equations: string[];
  proposedNodeType: string;
  suggestedId: string;
  contentHash: string;
  claimStatus: "source-claimed";
  verification: { method: "human-source"; note: string };
  candidates: CandidateMatch[];
  reviewState: ReviewState;
  warnings: string[];
  blocked: boolean;
}
export interface ImportedPaper {
  formatVersion: 1;
  extractorVersion: string;
  source: PaperSource;
  metadata: {
    arxivId?: string;
    title?: string;
    authors: string[];
    authorLatex: string[];
    abstract?: string;
  };
  sections: ImportedSection[];
  objects: ImportedMathObject[];
  paperProposal: ImportedMathObject;
  citations: ImportedCitation[];
  citationKeys: string[];
  macros: Record<string, string>;
  labels: Record<
    string,
    { kind: string; sourceKey?: string; file: string; line: number }[]
  >;
  diagnostics: Diagnostic[];
}
export interface ImportDiff {
  new: string[];
  changed: string[];
  removed: string[];
  unchanged: string[];
  presentationChanged: string[];
}
export interface ImportReport {
  sourceChanged: boolean;
  previousCommit?: string;
  commit: string;
  diff: ImportDiff;
  counts: {
    objects: number;
    sections: number;
    bibliography: number;
    citedKeys: number;
    files: number;
    byEnvironment: Record<string, number>;
    objectsWithCandidates: number;
    candidatePairs: number;
  };
  diagnostics: Diagnostic[];
}
export interface ReviewDecision {
  state: "ACCEPTED" | "REJECTED";
  contentHash: string;
  nodeId?: string;
  commit: string;
  reviewedAt: string;
  note: string;
}
export interface ReviewLedger {
  formatVersion: 1;
  decisions: Record<string, ReviewDecision>;
}
/** Future interpretation layers return proposals and cannot write curated records. */
export interface SemanticProposal {
  matches: CandidateMatch[];
  relationships: {
    target: string;
    proposedType: string;
    reason: string;
    needsHumanReview: true;
  }[];
}
export interface SemanticExtractor {
  analyze(object: ImportedMathObject): Promise<SemanticProposal>;
}
