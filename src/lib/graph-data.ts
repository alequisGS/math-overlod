export interface AboutNode {
  id: string;
  about?: string[];
}

export interface StructuralGraphEdge {
  id: string;
  source: string;
  target: string;
  type: "about";
  kind: "structural";
}

export function aboutGraphEdges(
  nodes: readonly AboutNode[],
  ids: Set<string> = new Set(nodes.map(node => node.id)),
) {
  return nodes.flatMap(node =>
    (node.about ?? [])
      .filter(target => ids.has(target))
      .map(target => ({
        id: `${node.id}:about:${target}`,
        source: node.id,
        target,
        type: "about" as const,
        kind: "structural" as const,
        note: undefined,
      })),
  );
}
