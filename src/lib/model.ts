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
  "published",
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
  published: "Published",
  proved: "Proved",
  verified: "Verified",
  computational: "Computational",
  conjectural: "Conjectural",
  open: "Open problem",
  "in-progress": "In progress",
  abandoned: "Abandoned",
};
export const statusSymbols: Record<(typeof statuses)[number], string> = {
  published: "▣",
  proved: "■",
  verified: "✓",
  computational: "⌘",
  conjectural: "◇",
  open: "?",
  "in-progress": "◌",
  abandoned: "×",
};
export const projects = {
  X10: {
    title: "Log del Pezzo surfaces",
    short: "X₁₀ / Geometry",
    description:
      "From a singular surface to the structure of its derived category.",
    anchor: "X10-001",
  },
  CATGEN: {
    title: "Categorical genus",
    short: "Categorical genus",
    description:
      "From the Euler pairing to a program of categorical invariants.",
    anchor: "CATGEN-001",
  },
  HMS: {
    title: "Mirror symmetry & periods",
    short: "Mirrors / Periods",
    description:
      "From categorical structure to periods and arithmetic questions.",
    anchor: "HMS-001",
  },
} as const;
export type Project = keyof typeof projects;
