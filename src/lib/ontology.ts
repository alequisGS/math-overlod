import { claimLikeTypes } from "./model.ts";

/** Publication, claim standing, and editorial state are independent axes. */
export function migrateLegacyNode(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const data = { ...input };
  const type = typeof data.type === "string" ? data.type : undefined;
  const isClaimLike = type !== undefined && claimLikeTypes.includes(type as never);
  const legacyStatus =
    typeof data.claimStatus === "string"
      ? data.claimStatus
      : typeof data.status === "string"
        ? data.status
        : undefined;
  if (!data.projects && typeof data.project === "string")
    data.projects = [data.project];
  if (!data.claimStanding && isClaimLike && legacyStatus) {
    data.claimStanding =
      legacyStatus === "published"
        ? "source-claimed"
        : legacyStatus === "in-progress"
          ? "conjectural"
          : legacyStatus;
  }
  if (!data.editorialState) {
    data.editorialState =
      legacyStatus === "in-progress" || legacyStatus === "open"
        ? "draft"
        : data.provenance === "background"
          ? "reviewed"
          : data.provenance === "research-direction"
            ? "draft"
            : "curated";
  }
  if (!data.publicationStatus)
    data.publicationStatus =
      data.status === "published"
        ? "published"
        : data.arxiv
          ? "preprint"
          : "unpublished";
  delete data.claimStatus;
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
