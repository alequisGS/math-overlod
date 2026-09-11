import { z } from "astro/zod";
import {
  nodeTypes,
  statuses,
  publicationStatuses,
  relationTypes,
} from "./model.ts";
import { migrateLegacyNode } from "./ontology.ts";
export const identifier = z.string().regex(/^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/);
export const githubLatexSourceSchema = z.object({
  kind: z.literal("github-latex"),
  repository: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
  branch: z.string().min(1),
  commit: z.string().regex(/^[a-f0-9]{40}$/),
  path: z.string().min(1),
  paperDirectory: z.string(),
  sourceKey: z.string(),
  label: z.string().optional(),
  environment: z.string(),
  section: z.string().optional(),
  printedNumber: z.string().optional(),
  startLine: z.number().int().positive().optional(),
  endLine: z.number().int().positive().optional(),
  contentHash: z.string(),
  retrievedAt: z.string(),
  acceptedAt: z.string(),
  statementLatex: z.string(),
  proofLatex: z.string().optional(),
  macros: z.record(z.string(), z.string()).default({}),
  spans: z
    .array(
      z.object({
        file: z.string(),
        startLine: z.number().int().positive(),
        endLine: z.number().int().positive(),
      }),
    )
    .default([]),
  proofSpans: z
    .array(
      z.object({
        file: z.string(),
        startLine: z.number().int().positive(),
        endLine: z.number().int().positive(),
      }),
    )
    .default([]),
  files: z
    .array(
      z.object({
        path: z.string(),
        sha256: z.string(),
        bytes: z.number().int().nonnegative(),
      }),
    )
    .default([]),
  citations: z
    .array(
      z.object({
        key: z.string(),
        title: z.string().optional(),
        authors: z.array(z.string()).default([]),
        year: z.string().optional(),
        journal: z.string().optional(),
        doi: z.string().optional(),
        eprint: z.string().optional(),
        url: z.string().optional(),
      }),
    )
    .default([]),
  paperMetadata: z
    .object({
      title: z.string().optional(),
      authors: z.array(z.string()),
      abstract: z.string().optional(),
    })
    .optional(),
});
export const nodeSchema = z.preprocess(
  (value) =>
    value && typeof value === "object"
      ? migrateLegacyNode(value as Record<string, unknown>)
      : value,
  z.object({
    id: identifier,
    title: z.string().min(1),
    shortTitle: z.string().min(1),
    type: z.enum(nodeTypes),
    claimStatus: z.enum(statuses),
    publicationStatus: z.enum(publicationStatuses),
    summary: z.string().min(1),
    date: z.iso.date().optional(),
    dateNote: z.string().optional(),
    authors: z.array(z.string()).default([]),
    projects: z.array(z.string().regex(/^[A-Z][A-Z0-9-]*$/)).min(1),
    about: z.array(identifier).default([]),
    tags: z.array(z.string()).default([]),
    references: z
      .array(
        z.object({
          title: z.string(),
          url: z.url().optional(),
          note: z.string().optional(),
        }),
      )
      .default([]),
    arxiv: z
      .string()
      .regex(/^\d{4}\.\d{4,5}(v\d+)?$/)
      .optional(),
    dependsOn: z.array(identifier).default([]),
    relations: z
      .array(
        z.object({
          target: identifier,
          type: z.enum(relationTypes),
          note: z.string().optional(),
        }),
      )
      .default([]),
    verification: z.object({
      method: z.enum([
        "human",
        "human-source",
        "computational",
        "formal",
        "mixed",
      ]),
      note: z.string().min(1),
    }),
    provenance: z.enum(["source-backed", "background", "research-direction"]),
    timeline: z
      .object({ stage: z.number().int().min(0).max(4), note: z.string() })
      .optional(),
    sources: z.array(githubLatexSourceSchema).default([]),
  }),
);
export type CuratedNode = z.infer<typeof nodeSchema>;
