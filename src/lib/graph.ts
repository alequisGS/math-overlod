import { getCollection, type CollectionEntry } from "astro:content";
import { normalizedRelations, validateNetwork } from "./relations";
export type MathNode = CollectionEntry<"nodes">["data"];
export const url = (path = "") =>
  `${import.meta.env.BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
export const nodeUrl = (id: string) => url(`node/${id}/`);
export async function getAtlas() {
  const entries = (await getCollection("nodes")).sort((a, b) =>
    a.data.id.localeCompare(b.data.id),
  );
  validateNetwork(entries.map((e) => e.data));
  return entries;
}
export function graphData(nodes: MathNode[]) {
  const ids = new Set(nodes.map((n) => n.id));
  return {
    nodes: nodes.map((n) => ({
      ...n,
      href: nodeUrl(n.id),
      relations: normalizedRelations(n),
    })),
    edges: nodes.flatMap((n) =>
      normalizedRelations(n)
        .filter((r) => ids.has(r.target))
        .map((r) => ({
          id: `${n.id}:${r.type}:${r.target}`,
          source: n.id,
          target: r.target,
          type: r.type,
          note: r.note,
        })),
    ),
  };
}
export type GraphData = ReturnType<typeof graphData>;
