import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  buildImportedEnvironmentSnapshot,
  evaluateAttestation,
  inspectSourceFragment,
  sourceFragmentSchema,
  validateProvenance,
  type ImportedPaperLike,
  type ImportedEnvironmentSnapshot,
  type SourceAttestation,
  type SourceFragment,
} from "../src/lib/provenance.ts";
import {
  sourceAttestations,
  sourceFragments,
  sourceSnapshotFor,
} from "../src/lib/provenance-pilot.ts";
import { aboutGraphEdges } from "../src/lib/graph-data.ts";

const fragment = sourceFragments[0];
const attestation = sourceAttestations[0];
const snapshot = sourceSnapshotFor(fragment)!;
const claimNodes = [
  { id: "X10-RES-CLAIM-001", type: "claim" },
  { id: "X10-SING-CLAIM-001", type: "claim" },
];

type FragmentOverrides = {
  id?: string;
  container?: Partial<SourceFragment["container"]>;
  assertionSelections?: SourceFragment["assertionSelections"];
  contextSelections?: SourceFragment["contextSelections"];
};
const copyFragment = (overrides: FragmentOverrides): SourceFragment =>
  sourceFragmentSchema.parse({
    ...fragment,
    ...overrides,
    container: { ...fragment.container, ...overrides.container },
    assertionSelections: overrides.assertionSelections ?? fragment.assertionSelections,
    contextSelections: overrides.contextSelections ?? fragment.contextSelections,
  });

type AttestationOverrides = {
  id?: string;
  fragment?: string;
  target?: string;
  review?: Partial<SourceAttestation["review"]>;
};
const copyAttestation = (overrides: AttestationOverrides): SourceAttestation => ({
  ...attestation,
  ...overrides,
  review: { ...attestation.review, ...overrides.review },
});

const changedSnapshot = (
  change: (next: ImportedEnvironmentSnapshot) => void,
) => {
  const next = structuredClone(snapshot);
  change(next);
  return next;
};

test("one imported theorem environment can support multiple fragments", () => {
  const second = copyFragment({ id: "FRAG-X10-MAIN-SING" });
  const secondAttestation = copyAttestation({
    id: "ATT-X10-MAIN-SING-001",
    fragment: second.id,
    target: "X10-SING-CLAIM-001",
  });
  assert.equal(second.container.latexLabel, fragment.container.latexLabel);
  assert.doesNotThrow(() =>
    validateProvenance(claimNodes, [fragment, second], [attestation, secondAttestation]),
  );
});

test("the pilot fragment attests the resolution claim", () => {
  assert.equal(attestation.fragment, "FRAG-X10-MAIN-RES");
  assert.equal(attestation.target, "X10-RES-CLAIM-001");
  assert.doesNotThrow(() => validateProvenance(claimNodes, [fragment], [attestation]));
  assert.equal(evaluateAttestation(attestation, fragment, snapshot).semanticReview, "accepted");
});

test("a claim can receive another attestation without changing its ID", () => {
  const second = copyFragment({ id: "FRAG-X10-MAIN-RES-CONTEXT" });
  const secondAttestation = copyAttestation({
    id: "ATT-X10-MAIN-RES-002",
    fragment: second.id,
  });
  assert.doesNotThrow(() =>
    validateProvenance(claimNodes, [fragment, second], [attestation, secondAttestation]),
  );
  assert.equal(secondAttestation.target, attestation.target);
});

test("printed theorem renumbering keeps IDs and semantic review stable", () => {
  const renumbered = changedSnapshot(next => {
    next.container.printedNumber = "2.1";
  });
  const freshness = inspectSourceFragment(fragment, renumbered);
  assert.equal(freshness.state, "locator-changed");
  assert.equal(evaluateAttestation(attestation, fragment, renumbered).semanticReview, "accepted");
  assert.equal(fragment.id, "FRAG-X10-MAIN-RES");
  assert.equal(attestation.id, "ATT-X10-MAIN-RES-001");
  assert.equal(attestation.target, "X10-RES-CLAIM-001");
});

test("section and line movement are locator changes when text is unchanged", () => {
  const sectionChanged = changedSnapshot(next => {
    next.context.section = "Section 4";
  });
  assert.equal(inspectSourceFragment(fragment, sectionChanged).state, "locator-changed");

  const linesMoved = changedSnapshot(next => {
    next.assertionSelections[0]!.startLine = next.assertionSelections[0]!.startLine! + 100;
    next.assertionSelections[0]!.endLine = next.assertionSelections[0]!.endLine! + 100;
    next.contextSelections[0]!.startLine = next.contextSelections[0]!.startLine! + 100;
    next.contextSelections[0]!.endLine = next.contextSelections[0]!.endLine! + 100;
  });
  assert.equal(inspectSourceFragment(fragment, linesMoved).state, "locator-changed");
  assert.equal(evaluateAttestation(attestation, fragment, linesMoved).semanticReview, "accepted");
});

test("a source commit change preserves semantic acceptance when selections are identical", () => {
  const changedCommit = changedSnapshot(next => {
    next.source.commit = "a".repeat(40);
  });
  const freshness = inspectSourceFragment(fragment, changedCommit);
  assert.equal(freshness.state, "locator-changed");
  assert.equal(evaluateAttestation(attestation, fragment, changedCommit).semanticReview, "accepted");
});

test("assertion and context changes require semantic review", () => {
  const assertionChanged = changedSnapshot(next => {
    next.assertionSelections[0]!.selectedText += " changed";
    next.assertionSelections[0]!.contentHash = "a".repeat(64);
  });
  assert.equal(inspectSourceFragment(fragment, assertionChanged).state, "assertion-changed");
  assert.equal(evaluateAttestation(attestation, fragment, assertionChanged).semanticReview, "needs-review");

  const contextChanged = changedSnapshot(next => {
    next.contextSelections[0]!.selectedText += " changed";
    next.contextSelections[0]!.contentHash = "b".repeat(64);
  });
  assert.equal(inspectSourceFragment(fragment, contextChanged).state, "context-changed");
  assert.equal(evaluateAttestation(attestation, fragment, contextChanged).semanticReview, "needs-review");
});

test("duplicate and invalid provenance references are rejected without sibling effects", () => {
  assert.throws(
    () => validateProvenance(claimNodes, [fragment, fragment], [attestation]),
    /Duplicate source fragment ID/,
  );
  const rejected = copyAttestation({
    id: "ATT-X10-MAIN-RES-REJECTED",
    review: { state: "rejected" },
  });
  assert.doesNotThrow(() =>
    validateProvenance(claimNodes, [fragment], [attestation, rejected]),
  );
  assert.equal(evaluateAttestation(rejected, fragment, snapshot).semanticReview, "rejected");
  assert.equal(evaluateAttestation(attestation, fragment, snapshot).semanticReview, "accepted");
});

test("about edges are structural and remain separate from semantic relations", () => {
  const nodes = [
    { ...claimNodes[0], id: "X10-RES-CLAIM-001", shortTitle: "claim", projects: ["X10"], about: ["X10-RES-001"], relations: [], dependsOn: [], sources: [], tags: [], title: "claim", claimStatus: "source-claimed", publicationStatus: "preprint", summary: "claim", verification: { method: "human", note: "test" }, provenance: "source-backed" },
    { ...claimNodes[1], id: "X10-RES-001", shortTitle: "resolution", projects: ["X10"], about: [], relations: [{ target: "X10-RES-CLAIM-001", type: "related-to" }], dependsOn: [], sources: [], tags: [], title: "resolution", claimStatus: "in-progress", publicationStatus: "preprint", summary: "resolution", verification: { method: "human", note: "test" }, provenance: "source-backed" },
  ] as never[];
  const data = aboutGraphEdges(nodes);
  assert.deepEqual(data.find(edge => edge.type === "about"), {
    id: "X10-RES-CLAIM-001:about:X10-RES-001",
    source: "X10-RES-CLAIM-001",
    target: "X10-RES-001",
    type: "about",
    kind: "structural",
    note: undefined,
  });
  assert.equal(data.every(edge => edge.kind === "structural"), true);
});

test("the generic provenance engine contains no pilot-specific identifiers", async () => {
  const source = await readFile("src/lib/provenance.ts", "utf8");
  assert.doesNotMatch(source, /2606\.18238|thm:X10-main|X10-/);
});

test("generic snapshot resolution uses source keys and configured selections", () => {
  const paper: ImportedPaperLike = {
    source: {
      repository: "example/research",
      branch: "main",
      commit: "a".repeat(40),
      paperDirectory: "paper",
    },
    objects: [
      {
        sourceKey: "label:thm:generic",
        latexLabel: "thm:generic",
        environment: "theorem",
        printedNumber: "4.2",
        title: "Generic theorem",
        sourceFile: "paper/main.tex",
        startLine: 10,
        section: "Results",
        statement: "Context text.\nAssertion text.\n",
      },
    ],
  };
  const config = {
    assertionSelections: [{ file: "paper/main.tex", startLine: 11, endLine: 11, selectedText: "Assertion text.\n", contentHash: "a".repeat(64) }],
    contextSelections: [{ file: "paper/main.tex", startLine: 10, endLine: 10, selectedText: "Context text.\n", contentHash: "b".repeat(64), role: "shared-hypotheses" }],
  };
  const resolved = buildImportedEnvironmentSnapshot(paper, "label:thm:generic", config)!;
  assert.equal(resolved.container.latexLabel, "thm:generic");
  assert.equal(resolved.assertionSelections[0].startLine, 11);
  assert.equal(resolved.contextSelections[0].startLine, 10);
});

test("the stable minimal-resolution object remains the claim's about target", async () => {
  const record = await readFile("src/content/nodes/x10-res-001.md", "utf8");
  assert.match(record, /id: "X10-RES-001"/);
  assert.match(record, /title: "The minimal resolution of X₁₀"/);
});
