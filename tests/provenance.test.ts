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
const theoremFragmentTargets = {
  "FRAG-X10-MAIN-SING": "X10-SING-CLAIM-001",
  "FRAG-X10-MAIN-RES": "X10-RES-CLAIM-001",
  "FRAG-X10-MAIN-EC": "X10-EC-CLAIM-001",
  "FRAG-X10-MAIN-KKS": "X10-KKS-CLAIM-001",
  "FRAG-X10-MAIN-GEN": "X10-GEN-CLAIM-001",
} as const;
const theoremFragments = sourceFragments.filter(
  candidate => candidate.container.latexLabel === "thm:X10-main",
);
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

test("thm:X10-main unfolds into five independently attested fragments", () => {
  assert.deepEqual(
    theoremFragments.map(candidate => candidate.id).sort(),
    Object.keys(theoremFragmentTargets).sort(),
  );
  assert.equal(new Set(theoremFragments.map(candidate => candidate.id)).size, 5);
  assert.equal(
    new Set(
      sourceAttestations
        .filter(candidate => candidate.fragment in theoremFragmentTargets)
        .map(candidate => candidate.target),
    ).size,
    5,
  );
  for (const [fragmentId, target] of Object.entries(theoremFragmentTargets)) {
    const currentFragment = theoremFragments.find(candidate => candidate.id === fragmentId)!;
    const currentAttestation = sourceAttestations.find(
      candidate => candidate.fragment === fragmentId,
    )!;
    assert.equal(currentAttestation.target, target);
    assert.equal(currentAttestation.relation, "asserts");
    assert.equal(currentAttestation.review.state, "accepted");
    assert.equal(
      evaluateAttestation(
        currentAttestation,
        currentFragment,
        sourceSnapshotFor(currentFragment),
      ).semanticReview,
      "accepted",
    );
  }
  assert.ok(
    theoremFragments.every(
      candidate =>
        candidate.container.environment === "theorem" &&
        candidate.container.printedNumber === "1.3",
    ),
  );
});

test("the reviewed resolution fragment and claim retain their stable pilot identities", () => {
  assert.equal(fragment.id, "FRAG-X10-MAIN-RES");
  assert.equal(attestation.id, "ATT-X10-MAIN-RES-001");
  assert.equal(attestation.target, "X10-RES-CLAIM-001");
  assert.equal(fragment.assertionSelections[0]?.startLine, 292);
  assert.equal(fragment.assertionSelections[0]?.endLine, 294);
  assert.equal(
    fragment.assertionSelections[0]?.contentHash,
    "cf255b3858f6f9f342589e958be9f6cebe899d3369d35168710d28f190c83bb2",
  );
});

test("rejecting one theorem attestation leaves sibling claims accepted", () => {
  const rejectedFragmentId = "FRAG-X10-MAIN-EC";
  for (const currentAttestation of sourceAttestations.filter(
    candidate => candidate.fragment in theoremFragmentTargets,
  )) {
    const currentFragment = theoremFragments.find(
      candidate => candidate.id === currentAttestation.fragment,
    )!;
    const reviewState = currentAttestation.fragment === rejectedFragmentId
      ? "rejected"
      : currentAttestation.review.state;
    const reviewed = {
      ...currentAttestation,
      review: { ...currentAttestation.review, state: reviewState },
    } as SourceAttestation;
    const status = evaluateAttestation(
      reviewed,
      currentFragment,
      sourceSnapshotFor(currentFragment),
    );
    assert.equal(
      status.semanticReview,
      currentAttestation.fragment === rejectedFragmentId ? "rejected" : "accepted",
    );
  }
});

test("changing one assertion requires review only for that fragment", () => {
  const changedFragment = structuredClone(
    theoremFragments.find(candidate => candidate.id === "FRAG-X10-MAIN-KKS")!,
  ) as SourceFragment;
  changedFragment.assertionSelections[0]!.selectedText += " changed";
  changedFragment.assertionSelections[0]!.contentHash = "a".repeat(64);
  const changedAttestation = sourceAttestations.find(
    candidate => candidate.fragment === changedFragment.id,
  )!;
  assert.equal(
    evaluateAttestation(
      changedAttestation,
      changedFragment,
      sourceSnapshotFor(changedFragment),
    ).semanticReview,
    "needs-review",
  );
  for (const sibling of theoremFragments.filter(
    candidate => candidate.id !== changedFragment.id,
  )) {
    const siblingAttestation = sourceAttestations.find(
      candidate => candidate.fragment === sibling.id,
    )!;
    assert.equal(
      evaluateAttestation(
        siblingAttestation,
        sibling,
        sourceSnapshotFor(sibling),
      ).semanticReview,
      "accepted",
    );
  }
});

test("the five theorem claims survive printed renumbering", () => {
  for (const currentFragment of theoremFragments) {
    const renumberedSnapshot = structuredClone(sourceSnapshotFor(currentFragment)!);
    renumberedSnapshot.container.printedNumber = "9.9";
    const currentAttestation = sourceAttestations.find(
      candidate => candidate.fragment === currentFragment.id,
    )!;
    const status = evaluateAttestation(
      currentAttestation,
      currentFragment,
      renumberedSnapshot,
    );
    assert.equal(status.semanticReview, "accepted");
    assert.equal(status.freshness.state, "locator-changed");
    assert.equal(
      currentAttestation.target,
      theoremFragmentTargets[currentFragment.id as keyof typeof theoremFragmentTargets],
    );
  }
});

test("new theorem claims expose structural about edges without owning the source environment", async () => {
  const expectedAbout = {
    "X10-SING-CLAIM-001": ["X10-001", "X10-SING-001"],
    "X10-EC-CLAIM-001": ["X10-STACK-001", "X10-EC-001"],
    "X10-KKS-CLAIM-001": ["X10-001", "X10-KKS-001", "X10-SOD-001"],
    "X10-GEN-CLAIM-001": ["X10-001", "X10-BLOW-001"],
  } as const;
  const records = await Promise.all(
    Object.keys(expectedAbout).map(async claimId => {
      const slug = claimId.toLowerCase();
      const record = await readFile("src/content/nodes/" + slug + ".md", "utf8");
      const about = record.match(/about:\n((?:  - "[^"]+"\n?)+)/)?.[1] ?? "";
      const targets = [...about.matchAll(/- "([^"]+)"/g)].map(match => match[1]);
      return { id: claimId, about: targets };
    }),
  );
  const nodes = records.flatMap(record => [
    record,
    ...record.about.map(id => ({ id, about: [] })),
  ]);
  const edges = aboutGraphEdges(nodes);
  for (const record of records) {
    assert.deepEqual(record.about, expectedAbout[record.id as keyof typeof expectedAbout]);
    for (const target of record.about) {
      const edgeId = record.id + ":about:" + target;
      assert.deepEqual(
        edges.find(edge => edge.id === edgeId),
        {
          id: edgeId,
          source: record.id,
          target,
          type: "about",
          kind: "structural",
          note: undefined,
        },
      );
    }
  }
  assert.equal(
    theoremFragments.some(candidate => candidate.id === "label:thm:X10-main"),
    false,
  );
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
    { ...claimNodes[0], id: "X10-RES-CLAIM-001", shortTitle: "claim", projects: ["X10"], about: ["X10-RES-001"], relations: [], dependsOn: [], sources: [], tags: [], title: "claim", claimStanding: "source-claimed", editorialState: "curated", publicationStatus: "preprint", summary: "claim", verification: { method: "human", note: "test" }, provenance: "source-backed" },
    { ...claimNodes[1], id: "X10-RES-001", shortTitle: "resolution", projects: ["X10"], about: [], relations: [{ target: "X10-RES-CLAIM-001", type: "related-to" }], dependsOn: [], sources: [], tags: [], title: "resolution", editorialState: "curated", publicationStatus: "preprint", summary: "resolution", verification: { method: "human", note: "test" }, provenance: "source-backed" },
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
