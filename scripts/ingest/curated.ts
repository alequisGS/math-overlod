import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { parseDocument } from "yaml";
import { nodeSchema, type CuratedNode } from "../../src/lib/node-schema.ts";
import { projects } from "../../src/lib/model.ts";
import { validateProjectMembership } from "../../src/lib/ontology.ts";
import { validateNetwork } from "../../src/lib/relations.ts";
export interface CuratedRecord {
  file: string;
  raw: string;
  body: string;
  document: ReturnType<typeof parseDocument>;
  data: CuratedNode;
}
export function parseRecord(raw: string, file: string): CuratedRecord {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw);
  if (!match) throw new Error(`Missing frontmatter: ${file}`);
  const document = parseDocument(match[1]);
  if (document.errors.length)
    throw new Error(`${file}: ${document.errors.join("; ")}`);
  return {
    file,
    raw,
    body: raw.slice(match[0].length),
    document,
    data: nodeSchema.parse(document.toJS()),
  };
}
export async function readCurated(root: string): Promise<CuratedRecord[]> {
  const directory = path.join(root, "src/content/nodes");
  const result: CuratedRecord[] = [];
  async function walk(dir: string) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile() && /\.mdx?$/.test(entry.name))
        result.push(parseRecord(await readFile(file, "utf8"), file));
    }
  }
  await walk(directory);
  validateNetwork(result.map((r) => r.data));
  validateProjectMembership(
    result.map((r) => r.data),
    projects,
  );
  return result;
}
export function serializeRecord(record: CuratedRecord) {
  return `---\n${record.document.toString()}---\n${record.body}`;
}
