import type { Relation } from "./model";

export interface Relatable {
  id: string;
  dependsOn: string[];
  relations: Relation[];
}
export function normalizedRelations(node: Relatable): Relation[] {
  const edges = [
    ...node.relations,
    ...node.dependsOn.map((target) => ({
      target,
      type: "depends-on" as const,
    })),
  ];
  return edges.filter(
    (edge, i) =>
      edges.findIndex(
        (e) => e.target === edge.target && e.type === edge.type,
      ) === i,
  );
}
export function validateNetwork(nodes: Relatable[]) {
  const ids = new Set<string>();
  for (const node of nodes) {
    if (ids.has(node.id))
      throw new Error(`Duplicate mathematical ID: ${node.id}`);
    ids.add(node.id);
  }
  for (const node of nodes)
    for (const relation of normalizedRelations(node)) {
      if (!ids.has(relation.target))
        throw new Error(
          `${node.id}: unknown ${relation.type} target ${relation.target}`,
        );
      if (node.id === relation.target)
        throw new Error(`${node.id}: self relation is not allowed`);
    }
  const visiting = new Set<string>(),
    done = new Set<string>();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  function visit(id: string) {
    if (visiting.has(id)) throw new Error(`Circular dependency at ${id}`);
    if (done.has(id)) return;
    visiting.add(id);
    for (const edge of normalizedRelations(byId.get(id)!))
      if (edge.type === "depends-on") visit(edge.target);
    visiting.delete(id);
    done.add(id);
  }
  nodes.forEach((n) => visit(n.id));
}
