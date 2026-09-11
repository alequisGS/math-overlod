import path from "node:path";
import { readdir } from "node:fs/promises";
import { readJson, writeJson, safeSegment } from "./files.ts";
import { candidatesFor } from "./matching.ts";
import type { CuratedRecord } from "./curated.ts";
import type {
  ImportedPaper,
  ImportDiff,
  ImportReport,
  ReviewLedger,
} from "./types.ts";
export const proposals = (paper: ImportedPaper) => [
  paper.paperProposal,
  ...paper.objects,
];
export const stagingPath = (root: string, id: string) =>
  path.join(root, "imports", safeSegment(id));
export async function ledgerFor(root: string, id: string) {
  return (
    (await readJson<ReviewLedger>(
      path.join(stagingPath(root, id), "review.json"),
    )) ?? { formatVersion: 1 as const, decisions: {} }
  );
}
export function comparePapers(
  previous: ImportedPaper | undefined,
  paper: ImportedPaper,
): ImportDiff {
  const old = new Map(
    previous ? proposals(previous).map((o) => [o.sourceKey, o]) : [],
  );
  const diff: ImportDiff = {
    new: [],
    changed: [],
    removed: [],
    unchanged: [],
    presentationChanged: [],
  };
  for (const object of proposals(paper)) {
    const before = old.get(object.sourceKey);
    old.delete(object.sourceKey);
    if (!before) diff.new.push(object.sourceKey);
    else if (before.contentHash !== object.contentHash)
      diff.changed.push(object.sourceKey);
    else {
      diff.unchanged.push(object.sourceKey);
      if (
        JSON.stringify([
          before.title,
          before.printedNumber,
          before.section,
          before.subsection,
          before.sourceFile,
          before.startLine,
        ]) !==
        JSON.stringify([
          object.title,
          object.printedNumber,
          object.section,
          object.subsection,
          object.sourceFile,
          object.startLine,
        ])
      )
        diff.presentationChanged.push(object.sourceKey);
    }
  }
  diff.removed = [...old.keys()];
  return diff;
}
export function applyReview(
  paper: ImportedPaper,
  ledger: ReviewLedger,
  diff?: ImportDiff,
) {
  for (const o of proposals(paper)) {
    const decision = ledger.decisions[o.sourceKey];
    if (paper.diagnostics.some((d) => d.severity === "error")) {
      o.reviewState = "NEEDS REVIEW";
      continue;
    }
    o.reviewState = o.blocked
      ? "NEEDS REVIEW"
      : decision?.contentHash === o.contentHash
        ? decision.state
        : decision ||
            diff?.changed.includes(o.sourceKey) ||
            o.reviewState === "CHANGED"
          ? "CHANGED"
          : o.candidates.some((c) => c.exact)
            ? "MATCHED"
            : o.candidates.length
              ? "POSSIBLE DUPLICATE"
              : o.warnings.length
                ? "NEEDS REVIEW"
                : "NEW";
  }
  return paper;
}
export async function stagePaper(
  root: string,
  paper: ImportedPaper,
  curated: CuratedRecord[],
  dryRun = false,
) {
  const dir = stagingPath(root, paper.source.paperDirectory);
  const previous = await readJson<ImportedPaper>(path.join(dir, "paper.json"));
  const diff = comparePapers(previous, paper);
  for (const o of proposals(paper))
    o.candidates = candidatesFor(o, paper, curated);
  for (const o of proposals(paper))
    if (
      previous &&
      proposals(previous).some(
        (p) => p.sourceKey === o.sourceKey && p.reviewState === "CHANGED",
      )
    )
      o.reviewState = "CHANGED";
  applyReview(paper, await ledgerFor(root, paper.source.paperDirectory), diff);
  const report: ImportReport = {
    sourceChanged: previous?.source.commit !== paper.source.commit,
    previousCommit: previous?.source.commit,
    commit: paper.source.commit,
    diff,
    counts: {
      objects: paper.objects.length,
      sections: paper.sections.length,
      bibliography: paper.citations.length,
      citedKeys: paper.citationKeys.length,
      files: paper.source.files.length,
      byEnvironment: {},
      objectsWithCandidates: paper.objects.filter((o) => o.candidates.length)
        .length,
      candidatePairs: paper.objects.reduce(
        (n, o) => n + o.candidates.length,
        0,
      ),
    },
    diagnostics: paper.diagnostics,
  };
  paper.objects.forEach(
    (o) =>
      (report.counts.byEnvironment[o.environment] =
        (report.counts.byEnvironment[o.environment] ?? 0) + 1),
  );
  if (!dryRun) {
    await writeJson(path.join(dir, "paper.json"), paper);
    await writeJson(path.join(dir, "report.json"), report);
  }
  return { paper, report };
}
export async function stagedPapers(root: string) {
  let entries;
  try {
    entries = await readdir(path.join(root, "imports"), {
      withFileTypes: true,
    });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
  const papers: ImportedPaper[] = [];
  for (const entry of entries.filter((e) => e.isDirectory())) {
    const paper = await readJson<ImportedPaper>(
      path.join(stagingPath(root, entry.name), "paper.json"),
    );
    if (paper)
      papers.push(
        applyReview(
          paper,
          await ledgerFor(root, entry.name),
          (
            await readJson<ImportReport>(
              path.join(stagingPath(root, entry.name), "report.json"),
            )
          )?.diff,
        ),
      );
  }
  return papers.sort((a, b) =>
    a.source.paperDirectory.localeCompare(b.source.paperDirectory),
  );
}
