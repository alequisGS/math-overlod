import importedPaperJson from "../../imports/2606.18238/paper.json" with {
  type: "json",
};
import {
  rawSourceAttestations,
  rawSourceFragments,
} from "../content/provenance.ts";
import {
  buildImportedEnvironmentSnapshot,
  sourceAttestationSchema,
  sourceFragmentSchema,
  type ImportedPaperLike,
  type ImportedEnvironmentSnapshot,
  type SourceAttestation,
  type SourceFragment,
} from "./provenance.ts";

const importedPaper = importedPaperJson as ImportedPaperLike;

export const sourceFragments: SourceFragment[] = rawSourceFragments.map((fragment) =>
  sourceFragmentSchema.parse(fragment),
);
export const sourceAttestations: SourceAttestation[] = rawSourceAttestations.map(
  (attestation) => sourceAttestationSchema.parse(attestation),
);

const snapshots = new Map<string, ImportedEnvironmentSnapshot | null>(
  sourceFragments.map((fragment) => [
    fragment.id,
    buildImportedEnvironmentSnapshot(
      importedPaper,
      fragment.context.sourceKey,
      fragment,
    ),
  ]),
);

export const sourceSnapshotFor = (fragment: SourceFragment) =>
  snapshots.get(fragment.id) ?? null;
