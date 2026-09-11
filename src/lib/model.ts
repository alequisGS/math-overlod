import projectData from "../content/projects.json" with { type: "json" };
export const nodeTypes = [
  "concept",
  "definition",
  "theorem",
  "lemma",
  "proposition",
  "corollary",
  "example",
  "construction",
  "computation",
  "conjecture",
  "open-problem",
  "project",
  "paper",
  "claim",
] as const;
export const claimLikeTypes = [
  "claim",
  "theorem",
  "lemma",
  "proposition",
  "corollary",
  "conjecture",
  "open-problem",
  "computation",
] as const;
export const claimStandings = [
  "source-claimed",
  "proved",
  "verified",
  "computational",
  "conjectural",
  "open",
  "abandoned",
] as const;
export type ClaimStanding = (typeof claimStandings)[number];
export const relationTypes = [
  "uses",
  "implies",
  "generalizes",
  "specializes",
  "example-of",
  "motivates",
  "depends-on",
  "obstructs",
  "related-to",
  "appears-in",
] as const;
export type RelationType = (typeof relationTypes)[number];
export type Relation = { target: string; type: RelationType; note?: string };
export const claimStandingLabels: Record<ClaimStanding, string> = {
  "source-claimed": "Source-claimed",
  proved: "Proved",
  verified: "Verified",
  computational: "Computational",
  conjectural: "Conjectural",
  open: "Open problem",
  abandoned: "Abandoned",
};
export const claimStandingSymbols: Record<ClaimStanding, string> = {
  "source-claimed": "◇",
  proved: "■",
  verified: "✓",
  computational: "⌘",
  conjectural: "◇",
  open: "?",
  abandoned: "×",
};
export const editorialStates = [
  "draft",
  "reviewed",
  "curated",
  "needs-review",
] as const;
export type EditorialState = (typeof editorialStates)[number];
export const editorialStateLabels: Record<EditorialState, string> = {
  draft: "Draft",
  reviewed: "Reviewed",
  curated: "Curated",
  "needs-review": "Needs review",
};
export const publicationStatuses = [
  "draft",
  "unpublished",
  "preprint",
  "published",
] as const;
export const publicationLabels = {
  draft: "Draft",
  unpublished: "Unpublished",
  preprint: "Preprint",
  published: "Published",
};
export interface ProjectDefinition {
  title: string;
  short: string;
  description: string;
  anchor: string;
  direction: string;
}
export const projects: Record<string, ProjectDefinition> = projectData;
export type Project = string;
