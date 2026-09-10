import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import { nodeTypes, statuses, relationTypes } from "./lib/model";

const identifier = z.string().regex(/^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/);
const nodes = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/nodes" }),
  schema: z.object({
    id: identifier,
    title: z.string().min(1),
    shortTitle: z.string().min(1),
    type: z.enum(nodeTypes),
    status: z.enum(statuses),
    summary: z.string().min(1),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    dateNote: z.string().optional(),
    authors: z.array(z.string()).default([]),
    project: z.enum(["X10", "CATGEN", "HMS"]),
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
      method: z.enum(["human", "computational", "formal", "mixed"]),
      note: z.string().min(1),
    }),
    provenance: z.enum(["source-backed", "background", "research-direction"]),
    timeline: z
      .object({ stage: z.number().int().min(0).max(4), note: z.string() })
      .optional(),
  }),
});
export const collections = { nodes };
