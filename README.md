# Math Overlord

Math Overlord is an experiment in representing mathematical research as a knowledge network rather than only as a sequence of papers.

**A visual mathematical knowledge network · Beta 0.1**

A paper is a linear presentation. A research graph exposes mathematical structure: ideas, definitions, theorems, examples, computations, conjectures, open problems and projects, linked by relations such as `uses`, `implies`, `generalizes`, `motivates` and `example-of`.

This first atlas follows Alex Gomez’s research across log del Pezzo surfaces, categorical genus, and homological mirror symmetry/periods. The 31 seed objects come from the supplied research outline, with the X₁₀ headline result and bibliographic metadata anchored to [arXiv:2606.18238v4](https://arxiv.org/abs/2606.18238v4). The mathematics is the primary object; the researcher and papers provide context.

## Run locally

Install a current Node.js 24 LTS release (with npm), then:

```sh
npm install
npm run dev
```

Open the local URL printed by Astro, including `/math-overlod/` (normally `http://localhost:4321/math-overlod/`). No environment variables, API keys, services or accounts are needed. Fonts, math styles and graph scripts are served locally; there are no runtime CDN dependencies.

```sh
npm run check    # Astro + TypeScript diagnostics
npm test         # Semantic relation and dependency validation tests
npm run build    # Type check, static generation, route/link/KaTeX audit
npm run preview  # Serve the production output
```

`npm ci` reproduces the committed lockfile in CI. The generated `dist/` and `.astro/` directories are not source content.

## Four ways into the mathematics

- **Research** — an editorial introduction to the three connected programs, with a real graph neighborhood.
- **Graph** — Cytoscape.js pan/zoom, fit, reset, search, project/type/status filters, labels, immediate-neighbor highlighting, semantic edge labels, and a selected-object panel. On small screens the panel becomes a bottom sheet. The expandable object list provides keyboard access; Escape closes the panel.
- **Index** — a grouped, searchable text view with stable IDs and status badges. It remains navigable without JavaScript.
- **Timeline** — a branching conceptual sequence. Only the paper has a verified date; undated stages are explicitly labeled and are not asserted as chronology.

Every object has its own mathematical document at `/math-overlod/node/IDENTIFIER/`, including rendered LaTeX, provenance, incoming/outgoing relationships, references, a local graph and a Git history link. A URL without its final slash is redirected to the directory form by GitHub Pages.

## Architecture: one mathematical source of truth

```text
src/content/nodes/*.md or *.mdx
              ↓
src/content.config.ts        typed Astro Content Collection
              ↓
src/lib/relations.ts         normalize relations; reject invalid networks
              ↓
src/lib/graph.ts             shared collection → graph data / stable URLs
              ↓
Research · Graph · Index · Timeline · /node/[id]/
```

The graph has **no separate node dataset**. Cytoscape elements are generated from the content metadata. Graph clusters use the `project` field; placement is deterministic and computed from collection membership. Preview and local graphs select subsets of those same objects. Timeline milestones use optional `timeline` metadata. Layout positions have no mathematical meaning; arrow labels do.

Important files:

| File | Responsibility |
| --- | --- |
| `src/content.config.ts` | Field schema and Markdown/MDX loader |
| `src/content/nodes/` | All mathematical records and prose |
| `src/lib/model.ts` | Type, status, project and relation vocabularies |
| `src/lib/relations.ts` | Dependency normalization and graph integrity |
| `src/lib/graph.ts` | Shared data access and base-aware URL helpers |
| `src/scripts/research-graph.ts` | Cytoscape interactions, filters and panel |
| `src/components/ResearchGraph.astro` | Graph surface and accessible text alternative |
| `src/components/StatusBadge.astro` | Consistent status text, symbol and appearance |
| `src/pages/node/[id].astro` | Stable mathematical document routes |
| `src/styles/global.css` | Typography, layout, responsive and reduced-motion rules |
| `scripts/check-build.mjs` | Static routes, internal links, assets and math checks |
| `.github/workflows/deploy.yml` | GitHub Pages build and deployment |

Astro statically generates every route. Vanilla TypeScript powers the graph and filters. Markdown is processed with remark-math and rehype-katex; MDX is enabled for future mathematical documents. There is no React UI, authentication, application backend or database.

## Add a theorem, example or open problem

Create a Markdown file in `src/content/nodes/`. Give it a unique, permanent identifier. The filename can change; the **frontmatter `id` owns the mathematical URL**. Do not recycle identifiers or encode paper section numbering as the identity.

```yaml
---
id: CATGEN-NEW-001
title: A question about a categorical invariant
shortTitle: A categorical question
type: open-problem
status: open
summary: State the actual mathematical question in one sentence.
authors: []
project: CATGEN
tags: [Euler pairing, numerical invariants]
provenance: research-direction
dependsOn:
  - CATGEN-EUL-001
relations:
  - target: CATGEN-001
    type: related-to
references:
  - title: Research notebook
    note: Add precise source information when available.
verification:
  method: human
  note: Open question; no proof or formal verification claimed.
---

## Description

Write the question with explicit hypotheses. Inline math uses $...$.

$$
\chi^-(v,w)=\chi(v,w)-\chi(w,v).
$$

## Why it matters

Explain what resolving this question would clarify.
```

For a theorem use `type: theorem`, an appropriate evidence-backed status, a precise **Statement**, and a proof or proof reference. For an example use `type: example` and, when appropriate, an `example-of` relation. Do not mark a result `proved`, `published` or `verified` merely because a file exists. Build before committing.

Supported types: `concept`, `definition`, `theorem`, `lemma`, `proposition`, `corollary`, `example`, `construction`, `computation`, `conjecture`, `open-problem`, `project`, `paper`.

Supported statuses: `published`, `proved`, `verified`, `computational`, `conjectural`, `open`, `in-progress`, `abandoned`. Badges show status in text and a symbol, with distinct border/fill treatments. Graph shapes encode mathematical role; dashed outlines mark unfinished entries. The selected panel displays exact status and provenance. Status is never encoded only by color.

Optional metadata includes `date` (ISO `YYYY-MM-DD`), `dateNote`, `arxiv` (optionally versioned), and `timeline: { stage: 0, note: "..." }` for stages 0–4. Do not invent dates to fill the timeline.

## Add semantic relations

Relations are **outgoing from the record containing them**. For example, on `A-001`, `{ target: B-001, type: uses }` means **A uses B**. An arrow points toward the target. `dependsOn` is shorthand for outgoing `depends-on` relations; repeated identical edges are collapsed. Incoming relationships are computed automatically, so do not manually duplicate them on the target.

Supported relations: `uses`, `implies`, `generalizes`, `specializes`, `example-of`, `motivates`, `depends-on`, `obstructs`, `related-to`, `appears-in`. An optional `note` can qualify a relation. `motivates` describes a research direction, **not a logical consequence**. `related-to` makes no stronger claim. Never turn an exploratory edge into `implies` without mathematical justification.

The build rejects duplicate mathematical IDs, missing targets, self relations and dependency cycles. Reciprocal conceptual relationships are allowed. Every graph node and relationship comes from the collection, including local graphs.

## Provenance and the beta dataset

`provenance` distinguishes `source-backed`, `background` and `research-direction` entries. Every record requires `verification.method` (`human`, `computational`, `formal` or `mixed`) and an explanatory note. The method describes the attributed evidence, not an automatic certificate provided by this website.

- The X₁₀ exceptional-collection theorem is labeled **proved**, attributed to the preprint. Its proof has not been independently audited here.
- The Euler-form entry is a **source-reported computation**. This repository does not contain or rerun a numerical matrix computation.
- The arXiv record is described as a **preprint**, not as a journal publication.
- Background definitions are editorial atlas entries marked **in progress** pending review; this does not make standard definitions conjectural.
- Categorical genus, its mirror interpretation, and broad HMS/arithmetic extensions remain descriptions or questions where precise statements were not supplied. No invented genus formula, mirror polynomial or general theorem is asserted.
- No object in this beta claims formal verification.

The seed files use JSON-style values inside valid YAML frontmatter to keep fields on distinct lines. Conventional YAML, as above, is equally supported. References to the research outline identify user-supplied material; they are not external publications.

## Git as research history

The Git repository is intentionally the research database. Reviewable changes to `status`, statement, sources, verification notes and relations record how mathematical objects develop. Keep IDs stable and use commit messages explaining the mathematical change.

An object might evolve from an observation (`concept`, `in-progress`) to a conjecture (`conjecture`, `conjectural`), then a proved result (`theorem`, `proved`), undergo revision, and eventually become published (`theorem`, `published`). “Observation” and “revised” describe history, not additional schema status values. An identity such as `CATGEN-004` would survive all of those transitions.

Git history links become useful after the files are committed to `main`; the conceptual timeline is not an automatically inferred commit timeline.

## GitHub Pages deployment

The project-site configuration is:

```js
site: 'https://alequisGS.github.io'
base: '/math-overlod'
output: 'static'
trailingSlash: 'always'
```

All internal links use a shared base-path helper; bundled assets use Astro’s base configuration. The repository spelling **math-overlod** is intentional in paths, distinct from the **Math Overlord** product name.

1. Commit and push the project to `main` in `alequisGS/math-overlod`.
2. In repository **Settings → Pages → Build and deployment**, set **Source: GitHub Actions**.
3. The workflow runs on every push to `main` and can also be run manually. The official Astro action installs from the lockfile, runs tests and the production build, and uploads the static artifact. The deploy job publishes that artifact with Pages/OIDC permissions.
4. After the workflow succeeds, the site is available at **https://alequisGS.github.io/math-overlod/**.

The workflow follows the [official Astro GitHub Pages guide](https://docs.astro.build/en/guides/deploy/github/). This repository does not need a separate hosting service. Merely generating the workflow locally does not publish the website; it must run in GitHub with Pages enabled.

## Roadmap

**Beta 0.1:** individual research atlas, 31 stable mathematical objects, semantic graph, basic search/filtering, mathematical documents, index, provenance and conceptual timeline.

**Beta 0.2:** richer dependency graphs, bibliography integration, import from papers, richer full-text/mathematical search (basic title/metadata search already works), stronger editorial review and reproducible computations.

**Beta 0.3:** AI-assisted graph interrogation and natural-language navigation, grounded in the same explicit mathematical objects and provenance.

**Future:** multiple mathematicians, a federated/global graph, contributions through pull requests and links to formal verification.

Authentication, comments, rankings, social features, a database backend and an AI chatbot are intentionally absent from this beta.
