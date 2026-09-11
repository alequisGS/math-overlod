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
] as const;
export const statuses = [
  "source-claimed",
  "proved",
  "verified",
  "computational",
  "conjectural",
  "open",
  "in-progress",
  "abandoned",
] as const;
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
export const statusLabels: Record<(typeof statuses)[number], string> = {
  "source-claimed": "Source-claimed",
  proved: "Proved",
  verified: "Verified",
  computational: "Computational",
  conjectural: "Conjectural",
  open: "Open problem",
  "in-progress": "In progress",
  abandoned: "Abandoned",
};
export const statusSymbols: Record<(typeof statuses)[number], string> = {
  "source-claimed": "◇",
  proved: "■",
  verified: "✓",
  computational: "⌘",
  conjectural: "◇",
  open: "?",
  "in-progress": "◌",
  abandoned: "×",
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
