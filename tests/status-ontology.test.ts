import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { parse } from "yaml";
import { nodeSchema } from "../src/lib/node-schema.ts";
import { migrateLegacyNode } from "../src/lib/ontology.ts";
import { aboutGraphEdges } from "../src/lib/graph-data.ts";

const baseRecord = {
  id: "TEST-001",
  title: "Test record",
  shortTitle: "Test record",
  type: "example" as const,
  editorialState: "curated" as const,
  publicationStatus: "preprint" as const,
  summary: "A test record.",
  authors: [],
  projects: ["X10"],
  tags: [],
  references: [],
  dependsOn: [],
  relations: [],
  verification: { method: "human" as const, note: "Test metadata." },
  provenance: "source-backed" as const,
  sources: [],
};

test("non-claim records do not require or accept claim standing", () => {
  const example = nodeSchema.parse(baseRecord);
  assert.equal(example.claimStanding, undefined);
  assert.throws(
    () =>
      nodeSchema.parse({
        ...baseRecord,
        claimStanding: "source-claimed",
      }),
    /Non-claim records must omit claimStanding/,
  );
});

test("claim-like records require claim standing", () => {
  assert.throws(
    () =>
      nodeSchema.parse({
        ...baseRecord,
        id: "TEST-CLAIM-001",
        type: "claim",
      }),
    /Claim-like records require claimStanding/,
  );
  const claim = nodeSchema.parse({
    ...baseRecord,
    id: "TEST-CLAIM-001",
    type: "claim",
    claimStanding: "source-claimed",
  });
  assert.equal(claim.claimStanding, "source-claimed");
});

test("legacy claim status migrates to the correct axis", () => {
  const objectRecord = migrateLegacyNode({
    ...baseRecord,
    editorialState: undefined,
    claimStatus: "in-progress",
  });
  assert.equal(objectRecord.claimStanding, undefined);
  assert.equal(objectRecord.editorialState, "draft");
  assert.equal(objectRecord.claimStatus, undefined);

  const claimRecord = migrateLegacyNode({
    ...baseRecord,
    id: "TEST-CLAIM-001",
    type: "claim",
    claimStatus: "source-claimed",
  });
  assert.equal(claimRecord.claimStanding, "source-claimed");
  assert.equal(claimRecord.editorialState, "curated");
  assert.equal(claimRecord.claimStatus, undefined);
});

test("all curated records have editorial state and type-appropriate standing", async () => {
  const claimLike = new Set([
    "claim",
    "theorem",
    "lemma",
    "proposition",
    "corollary",
    "conjecture",
    "open-problem",
    "computation",
  ]);
  const files = (await readdir("src/content/nodes")).filter(file =>
    file.endsWith(".md"),
  );
  const records = await Promise.all(
    files.map(async file =>
      parse((await readFile("src/content/nodes/" + file, "utf8")).split("---")[1]),
    ),
  );
  assert.equal(records.length, 36);
  for (const record of records) {
    assert.ok(record.editorialState);
    if (claimLike.has(record.type)) assert.ok(record.claimStanding);
    else assert.equal(record.claimStanding, undefined);
    assert.equal(record.claimStatus, undefined);
    assert.ok(record.publicationStatus);
  }
});

test("X10 object and claim records expose separate status axes", async () => {
  const object = parse((await readFile("src/content/nodes/x10-001.md", "utf8")).split("---")[1]);
  const resolution = parse((await readFile("src/content/nodes/x10-res-001.md", "utf8")).split("---")[1]);
  const claim = parse((await readFile("src/content/nodes/x10-res-claim-001.md", "utf8")).split("---")[1]);
  assert.equal(object.claimStanding, undefined);
  assert.equal(object.editorialState, "curated");
  assert.equal(object.publicationStatus, "preprint");
  assert.equal(resolution.claimStanding, undefined);
  assert.equal(resolution.editorialState, "curated");
  assert.equal(claim.claimStanding, "source-claimed");
  assert.equal(claim.editorialState, "curated");
  assert.equal(claim.publicationStatus, "preprint");
});

test("mixed graph records remain valid without claim standing", async () => {
  const source = await readFile("src/lib/graph.ts", "utf8");
  assert.doesNotMatch(source, /claimStatus/);
  const edges = aboutGraphEdges([
    { id: "TEST-001" },
    { id: "TEST-CLAIM-001", about: ["TEST-001"] },
  ]);
  assert.equal(edges[0]?.type, "about");
  assert.equal(edges[0]?.kind, "structural");
});

test("index and graph expose independent claim, record, and publication filters", async () => {
  const index = await readFile("src/pages/index/index.astro", "utf8");
  const controls = await readFile("src/components/GraphControls.astro", "utf8");
  assert.match(index, /index-claim-standing/);
  assert.match(index, /index-editorial-state/);
  assert.match(index, /index-publication/);
  assert.match(controls, /data-claim-standing/);
  assert.match(controls, /data-editorial-state/);
  assert.match(controls, /data-publication/);
});
