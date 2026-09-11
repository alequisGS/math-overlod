/** Publication is a separate dimension and never implies proof. */
export function migrateLegacyNode(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const data = { ...input };
  if (!data.projects && typeof data.project === "string")
    data.projects = [data.project];
  if (!data.claimStatus && typeof data.status === "string")
    data.claimStatus =
      data.status === "published" ? "source-claimed" : data.status;
  if (!data.publicationStatus)
    data.publicationStatus =
      data.status === "published"
        ? "published"
        : data.arxiv
          ? "preprint"
          : "unpublished";
  delete data.project;
  delete data.status;
  return data;
}
export function validateProjectMembership(
  nodes: { id: string; projects: string[] }[],
  registry: Record<string, unknown>,
) {
  for (const node of nodes) {
    if (!node.projects.length)
      throw new Error(`${node.id}: at least one project is required`);
    if (new Set(node.projects).size !== node.projects.length)
      throw new Error(`${node.id}: duplicate project membership`);
    for (const project of node.projects)
      if (!Object.hasOwn(registry, project))
        throw new Error(`${node.id}: unknown project ${project}`);
  }
}
