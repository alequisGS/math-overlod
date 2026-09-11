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
  {
    id: "FRAG-X10-MAIN-SING",
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
        startLine: 291,
        endLine: 292,
        selectedText:
          "Then $X_{10}$ has a unique singular\npoint $p$, of type $\\tfrac13(1,1)$,",
        contentHash:
          "4dc59ca6beed8841d8c59960effa29e6898279679b1875f5112ff279d45939f2",
      },
    ],
    contextSelections: [
      {
        file: "ArXiv/2606.18238/main.tex",
        startLine: 289,
        endLine: 291,
        selectedText:
          "Let $X_{10}\\subset\\mathbb P(1,2,3,5)$ be a quasismooth hypersurface of\ndegree $10$, with canonical stack $\\mathcal X_{10}$ and minimal resolution\n$\\nu\\colon\\widetilde X_{10}\\to X_{10}$.",
        contentHash:
          "2449aa72de532439963377363bee7cbf3888a4446902137c0cdaf72350bcf8b3",
        role: "shared-hypotheses",
      },
    ],
    context: {
      sourceKey: "label:thm:X10-main",
      title: "The hypersurface \\(X_{10}\\)",
      paperTitle:
        "Derived categories and Brauer groups of log del Pezzo surfaces with \\texorpdfstring{$\\frac13(1,1)$}{1/3(1,1)} singularities",
      section: "Introduction",
      statementScope:
        "The context selection records quasismoothness, degree, ambient weighted projective space, and the minimal-resolution morphism. The assertion selection records the theorem's unique-singularity clause.",
    },
  },
  {
    id: "FRAG-X10-MAIN-EC",
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
        startLine: 296,
        endLine: 305,
        selectedText:
          "\\item $D^b(\\operatorname{coh}\\mathcal X_{10})$ admits the full exceptional\ncollection\n\\[\n\\begin{aligned}\n\\bigl\\langle &\\mathcal E_p,\\ \\Phi(\\mathcal O_{D_1}(-1)),\\dots,\\Phi(\\mathcal O_{D_8}(-1)),\\\n\\Phi(\\sigma^*\\mathcal O),\\ \\Phi(\\sigma^*\\mathcal O(f)),\\\\\n&\\Phi(\\sigma^*\\mathcal O(C_0+3f)),\\ \\Phi(\\sigma^*\\mathcal O(C_0+4f))\\bigr\\rangle\n\\end{aligned}\n\\]\nof length $13$,",
        contentHash:
          "85d5ff5a3211c97c8f09c9d45ca6fe296ce427a5d36bf0109b7d6f7bc775ff71",
      },
    ],
    contextSelections: [
      {
        file: "ArXiv/2606.18238/main.tex",
        startLine: 289,
        endLine: 294,
        selectedText:
          "Let $X_{10}\\subset\\mathbb P(1,2,3,5)$ be a quasismooth hypersurface of\ndegree $10$, with canonical stack $\\mathcal X_{10}$ and minimal resolution\n$\\nu\\colon\\widetilde X_{10}\\to X_{10}$. Then $X_{10}$ has a unique singular\npoint $p$, of type $\\tfrac13(1,1)$, and $\\widetilde X_{10}$ is the blow-up\n$\\sigma\\colon\\widetilde X_{10}\\to\\mathbb F_3$ at eight distinct points off\n$C_0$, with pairwise disjoint exceptional curves $D_1,\\dots,D_8$.",
        contentHash:
          "8efeb53d48b7f1ee356ba431b2609e74a0d2db9e32e52ce0dd08c2729188d078",
        role: "shared-hypotheses",
      },
    ],
    context: {
      sourceKey: "label:thm:X10-main",
      title: "The hypersurface \\(X_{10}\\)",
      paperTitle:
        "Derived categories and Brauer groups of log del Pezzo surfaces with \\texorpdfstring{$\\frac13(1,1)$}{1/3(1,1)} singularities",
      section: "Introduction",
      statementScope:
        "The context selection records the theorem's hypotheses and preceding geometric clauses. The assertion selection is item (i), including only the displayed collection and its length, not the later Euler-form clause.",
    },
  },
  {
    id: "FRAG-X10-MAIN-KKS",
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
        startLine: 306,
        endLine: 313,
        selectedText:
          "\\item The coarse surface admits a semiorthogonal decomposition\n\\[\n\\begin{gathered}\nD^b(\\operatorname{coh}X_{10})=\\bigl\\langle D^b(K(3,1)\\text{-mod}),\\,F_1,\\dots,F_{10}\\bigr\\rangle,\\\\\nK(3,1)\\cong\\mathbb C[z_1,z_2]/(z_1,z_2)^2,\n\\end{gathered}\n\\]\nwith exceptional objects $F_i$ made explicit in \\cref{thm:X10-kks-sod}.",
        contentHash:
          "241c62a9956755b0f69509a380c8e92ac8c5bf46b14a6c933c597a8a17a3539a",
      },
    ],
    contextSelections: [
      {
        file: "ArXiv/2606.18238/main.tex",
        startLine: 289,
        endLine: 294,
        selectedText:
          "Let $X_{10}\\subset\\mathbb P(1,2,3,5)$ be a quasismooth hypersurface of\ndegree $10$, with canonical stack $\\mathcal X_{10}$ and minimal resolution\n$\\nu\\colon\\widetilde X_{10}\\to X_{10}$. Then $X_{10}$ has a unique singular\npoint $p$, of type $\\tfrac13(1,1)$, and $\\widetilde X_{10}$ is the blow-up\n$\\sigma\\colon\\widetilde X_{10}\\to\\mathbb F_3$ at eight distinct points off\n$C_0$, with pairwise disjoint exceptional curves $D_1,\\dots,D_8$.",
        contentHash:
          "8efeb53d48b7f1ee356ba431b2609e74a0d2db9e32e52ce0dd08c2729188d078",
        role: "shared-hypotheses",
      },
    ],
    context: {
      sourceKey: "label:thm:X10-main",
      title: "The hypersurface \\(X_{10}\\)",
      paperTitle:
        "Derived categories and Brauer groups of log del Pezzo surfaces with \\texorpdfstring{$\\frac13(1,1)$}{1/3(1,1)} singularities",
      section: "Introduction",
      statementScope:
        "The context selection records the theorem's hypotheses and preceding geometric clauses. The assertion selection is item (ii), including the specific coarse decomposition, algebra K(3,1), and exceptional objects.",
    },
  },
  {
    id: "FRAG-X10-MAIN-GEN",
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
        startLine: 314,
        endLine: 317,
        selectedText:
          "\\item A general such hypersurface is the anticanonical model of the\nblow-up of $\\mathbb P(1,1,3)$ at eight general smooth points, and conversely\ngeneral centers give a general hypersurface\n(\\cref{prop:general-X10,prop:X10-blowup-dominance}).",
        contentHash:
          "a0e30157707f4e6602c7569547653e6c48a539c8ee4707be07db8a3cd0c57e93",
      },
    ],
    contextSelections: [
      {
        file: "ArXiv/2606.18238/main.tex",
        startLine: 289,
        endLine: 294,
        selectedText:
          "Let $X_{10}\\subset\\mathbb P(1,2,3,5)$ be a quasismooth hypersurface of\ndegree $10$, with canonical stack $\\mathcal X_{10}$ and minimal resolution\n$\\nu\\colon\\widetilde X_{10}\\to X_{10}$. Then $X_{10}$ has a unique singular\npoint $p$, of type $\\tfrac13(1,1)$, and $\\widetilde X_{10}$ is the blow-up\n$\\sigma\\colon\\widetilde X_{10}\\to\\mathbb F_3$ at eight distinct points off\n$C_0$, with pairwise disjoint exceptional curves $D_1,\\dots,D_8$.",
        contentHash:
          "8efeb53d48b7f1ee356ba431b2609e74a0d2db9e32e52ce0dd08c2729188d078",
        role: "shared-hypotheses",
      },
    ],
    context: {
      sourceKey: "label:thm:X10-main",
      title: "The hypersurface \\(X_{10}\\)",
      paperTitle:
        "Derived categories and Brauer groups of log del Pezzo surfaces with \\texorpdfstring{$\\frac13(1,1)$}{1/3(1,1)} singularities",
      section: "Introduction",
      statementScope:
        "The context selection records the theorem's hypotheses and preceding geometric clauses. The assertion selection is item (iii), preserving its two-way generality statement and its general-member scope.",
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
  {
    id: "ATT-X10-MAIN-SING-001",
    kind: "source-attestation",
    fragment: "FRAG-X10-MAIN-SING",
    target: "X10-SING-CLAIM-001",
    relation: "asserts",
    coverage: "complete-statement-with-recorded-context",
    review: {
      state: "accepted",
      method: "human",
      sourceCommit: "d59be5e034c4b1aba5a3cd6eb9f736a4262ae534",
      note: "Manually reviewed mapping for the theorem decomposition.",
    },
  },
  {
    id: "ATT-X10-MAIN-EC-001",
    kind: "source-attestation",
    fragment: "FRAG-X10-MAIN-EC",
    target: "X10-EC-CLAIM-001",
    relation: "asserts",
    coverage: "complete-statement-with-recorded-context",
    review: {
      state: "accepted",
      method: "human",
      sourceCommit: "d59be5e034c4b1aba5a3cd6eb9f736a4262ae534",
      note: "Manually reviewed mapping for the theorem decomposition.",
    },
  },
  {
    id: "ATT-X10-MAIN-KKS-001",
    kind: "source-attestation",
    fragment: "FRAG-X10-MAIN-KKS",
    target: "X10-KKS-CLAIM-001",
    relation: "asserts",
    coverage: "complete-statement-with-recorded-context",
    review: {
      state: "accepted",
      method: "human",
      sourceCommit: "d59be5e034c4b1aba5a3cd6eb9f736a4262ae534",
      note: "Manually reviewed mapping for the theorem decomposition.",
    },
  },
  {
    id: "ATT-X10-MAIN-GEN-001",
    kind: "source-attestation",
    fragment: "FRAG-X10-MAIN-GEN",
    target: "X10-GEN-CLAIM-001",
    relation: "asserts",
    coverage: "complete-statement-with-recorded-context",
    review: {
      state: "accepted",
      method: "human",
      sourceCommit: "d59be5e034c4b1aba5a3cd6eb9f736a4262ae534",
      note: "Manually reviewed mapping for the theorem decomposition.",
    },
  },
] as const;
