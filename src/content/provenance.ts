export const rawSourceFragments = [
  {
    id: "FRAG-X10-MAIN-RES",
    kind: "source-fragment",
    source: {
      repository: "alequisGS/alequisGS.github.io",
      branch: "main",
      commit: "d59be5e034c4b1aba5a3cd6eb9f736a4262ae534",
      file: "ArXiv/2606.18238/main.tex",
      paperDirectory: "2606.18238",
    },
    container: {
      latexLabel: "thm:X10-main",
      environment: "theorem",
      printedNumber: "1.3",
    },
    assertionSelections: [
      {
        file: "ArXiv/2606.18238/main.tex",
        startLine: 292,
        endLine: 294,
        selectedText: String.raw`$\widetilde X_{10}$ is the blow-up
$\sigma\colon\widetilde X_{10}\to\mathbb F_3$ at eight distinct points off
$C_0$, with pairwise disjoint exceptional curves $D_1,\dots,D_8$.
`.trimEnd(),
        contentHash:
          "cf255b3858f6f9f342589e958be9f6cebe899d3369d35168710d28f190c83bb2",
      },
    ],
    contextSelections: [
      {
        file: "ArXiv/2606.18238/main.tex",
        startLine: 289,
        endLine: 291,
        selectedText: String.raw`Let $X_{10}\subset\mathbb P(1,2,3,5)$ be a quasismooth hypersurface of
degree $10$, with canonical stack $\mathcal X_{10}$ and minimal resolution
$\nu\colon\widetilde X_{10}\to X_{10}$.
`,
        contentHash:
          "2449aa72de532439963377363bee7cbf3888a4446902137c0cdaf72350bcf8b3",
        role: "shared-hypotheses",
      },
    ].map(selection => ({ ...selection, selectedText: selection.selectedText.trimEnd() })),
    context: {
      sourceKey: "label:thm:X10-main",
      title: "The hypersurface \\(X_{10}\\)",
      paperTitle:
        "Derived categories and Brauer groups of log del Pezzo surfaces with \\texorpdfstring{$\\frac13(1,1)$}{1/3(1,1)} singularities",
      section: "Introduction",
      statementScope:
        "The context selection records quasismoothness, degree, ambient weighted projective space, and the minimal-resolution morphism. The theorem's singularity sentence and later categorical clauses are outside this fragment.",
    },
  },
] as const;

export const rawSourceAttestations = [
  {
    id: "ATT-X10-MAIN-RES-001",
    kind: "source-attestation",
    fragment: "FRAG-X10-MAIN-RES",
    target: "X10-RES-CLAIM-001",
    relation: "asserts",
    coverage: "complete-statement-with-recorded-context",
    review: {
      state: "accepted",
      method: "human",
      sourceCommit: "d59be5e034c4b1aba5a3cd6eb9f736a4262ae534",
      note: "Manually curated mapping for the ontology pilot.",
    },
  },
] as const;
