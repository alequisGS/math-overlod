import { plainLatex } from "./latex.ts";
import type { CuratedRecord } from "./curated.ts";
import type {
  ImportedPaper,
  ImportedMathObject,
  CandidateMatch,
} from "./types.ts";
const stop = new Set(
  "the a an of for in on and to with is are admits full source result let then this that from category categories".split(
    " ",
  ),
);
export function words(text: string, macros: Record<string, string> = {}) {
  return new Set(
    plainLatex(text, macros)
      .normalize("NFKD")
      .toLowerCase()
      .replace(/x\s*_?\s*\{?10\}?/g, "x10")
      .match(/[a-z0-9]+/g)
      ?.filter((w) => w.length > 2 && !stop.has(w)) ?? [],
  );
}
function overlap(a: Set<string>, b: Set<string>) {
  return (
    [...a].filter((w) => b.has(w)).length /
    Math.max(1, Math.min(a.size, b.size))
  );
}
export function candidatesFor(
  object: ImportedMathObject,
  paper: ImportedPaper,
  curated: CuratedRecord[],
): CandidateMatch[] {
  return curated
    .flatMap((record) => {
      const n = record.data;
      const same = n.sources.filter(
        (s) =>
          s.repository === paper.source.repository &&
          s.paperDirectory === paper.source.paperDirectory,
      );
      if (
        same.some(
          (s) =>
            s.sourceKey === object.sourceKey ||
            (!!object.latexLabel && s.label === object.latexLabel),
        )
      )
        return [
          {
            nodeId: n.id,
            confidence: 1,
            reasons: [
              "Exact accepted source key or LaTeX label in this repository and paper directory.",
            ],
            exact: true,
          },
        ];
      if ((object.environment === "paper") !== (n.type === "paper")) return [];
      const reasons: string[] = [];
      let score = 0;
      const arxiv =
        !!paper.metadata.arxivId &&
        n.arxiv?.replace(/v\d+$/, "") === paper.metadata.arxivId;
      if (arxiv) {
        score += object.environment === "paper" ? 0.8 : 0.16;
        reasons.push("Same arXiv identifier (paper context only).");
      }
      const sourceWords = words(
        `${object.title ?? ""} ${object.statement}`,
        paper.macros,
      );
      const titleScore = overlap(
        words(`${n.title} ${n.shortTitle}`),
        sourceWords,
      );
      const bodyScore = overlap(
        words(`${n.summary} ${record.body}`),
        sourceWords,
      );
      const tags = overlap(words(n.tags.join(" ")), sourceWords);
      score += titleScore * 0.45 + bodyScore * 0.22 + tags * 0.08;
      if (titleScore >= 0.4)
        reasons.push(
          `Title/statement token overlap ${Math.round(titleScore * 100)}%.`,
        );
      if (bodyScore >= 0.35)
        reasons.push(
          `Curated exposition/source token overlap ${Math.round(bodyScore * 100)}%.`,
        );
      if (tags >= 0.5) reasons.push("Shared subject tags.");
      if (n.type === object.proposedNodeType) {
        score += 0.05;
        reasons.push("Same proposed object type.");
      }
      if (score < 0.46 || (!arxiv && titleScore < 0.4)) return [];
      return [
        {
          nodeId: n.id,
          confidence: Math.min(0.94, Math.round(score * 100) / 100),
          reasons,
          exact: false,
        },
      ];
    })
    .sort(
      (a, b) => b.confidence - a.confidence || a.nodeId.localeCompare(b.nodeId),
    )
    .slice(0, 5);
}
