import { test } from "node:test";
import assert from "node:assert/strict";
import {
  attestationReviewState,
  inspectSourceFragment,
  pilotSourceSnapshot,
  sourceAttestations,
  sourceFragments,
  validateProvenance,
  type SourceAttestation,
  type SourceFragment,
} from "../src/lib/provenance.ts";

const fragment = sourceFragments[0];
const attestation = sourceAttestations[0];
const claimNodes = [
  { id: "X10-RES-CLAIM-001", type: "claim" },
  { id: "X10-SING-CLAIM-001", type: "claim" },
];

type FragmentOverrides = {
  id?: string;
  source?: Partial<SourceFragment["source"]>;
  container?: Partial<SourceFragment["container"]>;
  selection?: Partial<SourceFragment["selection"]>;
  context?: Partial<SourceFragment["context"]>;
};
const copyFragment = (overrides: FragmentOverrides): SourceFragment => ({
  ...fragment,
  ...overrides,
  source: { ...fragment.source, ...overrides.source },
  container: { ...fragment.container, ...overrides.container },
  selection: { ...fragment.selection, ...overrides.selection },
  context: { ...fragment.context, ...overrides.context },
});

type AttestationOverrides = {
  id?: string;
  fragment?: string;
  target?: string;
  review?: Partial<SourceAttestation["review"]>;
};
const copyAttestation = (
  overrides: AttestationOverrides,
): SourceAttestation => ({
  ...attestation,
  ...overrides,
  review: { ...attestation.review, ...overrides.review },
});

test("one imported theorem environment can support multiple fragments", () => {
  const second = copyFragment({
    id: "FRAG-X10-MAIN-SING",
    selection: { startLine: 288, endLine: 294 },
    context: { statementScope: "A later claim from the same theorem environment." },
  });
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
  assert.equal(attestationReviewState(attestation, fragment), "accepted");
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

test("printed theorem renumbering leaves fragment, attestation, and claim IDs stable", () => {
  const renumbered = copyFragment({ container: { printedNumber: "2.1" } });
  assert.equal(renumbered.id, fragment.id);
  assert.equal(attestation.id, "ATT-X10-MAIN-RES-001");
  assert.equal(attestation.target, "X10-RES-CLAIM-001");
});

test("source commit, selected text, and recorded context changes require review", () => {
  const changedCommit = structuredClone(pilotSourceSnapshot);
  changedCommit.source.commit = "a".repeat(40);
  assert.deepEqual(inspectSourceFragment(fragment, changedCommit).state, "needs-review");

  const changedText = structuredClone(pilotSourceSnapshot);
  changedText.selection.selectedText += "\n% changed";
  assert.deepEqual(inspectSourceFragment(fragment, changedText).state, "needs-review");

  const changedContext = structuredClone(pilotSourceSnapshot);
  changedContext.context.title = "A changed theorem title";
  assert.deepEqual(inspectSourceFragment(fragment, changedContext).state, "needs-review");
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
  assert.equal(attestationReviewState(rejected, fragment), "rejected");
  assert.equal(attestationReviewState(attestation, fragment), "accepted");
});

test("the stable minimal-resolution object remains the claim's about target", async () => {
  const record = await import("node:fs/promises").then(fs =>
    fs.readFile("src/content/nodes/x10-res-001.md", "utf8"),
  );
  assert.match(record, /id: "X10-RES-001"/);
  assert.match(record, /title: "The minimal resolution of X₁₀"/);
});
