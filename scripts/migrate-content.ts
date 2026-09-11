import { readCurated, serializeRecord } from "./ingest/curated.ts";
import { atomicWrite } from "./ingest/files.ts";
const write = process.argv.includes("--write");
for (const record of await readCurated(process.cwd())) {
  if (!record.document.has("status") && !record.document.has("project"))
    continue;
  record.document.set("claimStatus", record.data.claimStatus);
  record.document.set("publicationStatus", record.data.publicationStatus);
  record.document.set("projects", record.data.projects);
  record.document.delete("status");
  record.document.delete("project");
  if (write) await atomicWrite(record.file, serializeRecord(record));
  console.log(`${write ? "Migrated" : "Would migrate"} ${record.data.id}`);
}
