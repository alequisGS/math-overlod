export interface SourceLink {
  repository: string;
  branch: string;
  commit: string;
  path: string;
  startLine?: number;
  endLine?: number;
}
const encodePath = (value: string) =>
  value.split("/").map(encodeURIComponent).join("/");
export function sourceLinks(source: SourceLink) {
  const root = `https://github.com/${encodePath(source.repository)}`;
  const lines = source.startLine
    ? `#L${source.startLine}${source.endLine ? `-L${source.endLine}` : ""}`
    : "";
  return {
    pinned: `${root}/blob/${encodeURIComponent(source.commit)}/${encodePath(source.path)}${lines}`,
    current: `${root}/blob/${encodeURIComponent(source.branch)}/${encodePath(source.path)}`,
    history: `${root}/commits/${encodeURIComponent(source.branch)}/${encodePath(source.path)}`,
  };
}
