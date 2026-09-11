# Math Overlord

Math Overlord is an experiment in representing mathematical research as a knowledge network rather than only as a sequence of papers.

**A visual mathematical knowledge network · Beta 0.2**

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
npm test         # Offline ingestion, acceptance, ontology and relation tests
npm run build    # Type check, static generation, route/link/KaTeX audit
npm run preview  # Serve the production output
```

`npm ci` reproduces the committed lockfile in CI. The generated `dist/` and `.astro/` directories are not source content.

## Four ways into the mathematics

- **Research** — an editorial introduction to the three connected programs, with a real graph neighborhood.
- **Graph** — Cytoscape.js pan/zoom, fit, reset, search, project/type/claim/publication filters, labels, immediate-neighbor highlighting, semantic edge labels, and a selected-object panel. On small screens the panel becomes a bottom sheet. The expandable object list provides keyboard access; Escape closes the panel.
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

The graph has **no separate node dataset**. Cytoscape elements are generated from the content metadata. Graph clusters use the first `projects` membership for placement; filters include every membership; placement is deterministic and computed from collection membership. Preview and local graphs select subsets of those same objects. Timeline milestones use optional `timeline` metadata. Layout positions have no mathematical meaning; arrow labels do.

Important files:

| File                                 | Responsibility                                          |
| ------------------------------------ | ------------------------------------------------------- |
| `src/content.config.ts`              | Field schema and Markdown/MDX loader                    |
| `src/content/nodes/`                 | All mathematical records and prose                      |
| `src/lib/model.ts`                   | Type, status, project and relation vocabularies         |
| `src/lib/relations.ts`               | Dependency normalization and graph integrity            |
| `src/lib/graph.ts`                   | Shared data access and base-aware URL helpers           |
| `src/scripts/research-graph.ts`      | Cytoscape interactions, filters and panel               |
| `src/components/ResearchGraph.astro` | Graph surface and accessible text alternative           |
| `src/components/StatusBadge.astro`   | Consistent status text, symbol and appearance           |
| `src/pages/node/[id].astro`          | Stable mathematical document routes                     |
| `src/styles/global.css`              | Typography, layout, responsive and reduced-motion rules |
| `scripts/check-build.mjs`            | Static routes, internal links, assets and math checks   |
| `.github/workflows/deploy.yml`       | GitHub Pages build and deployment                       |

Astro statically generates every route. Vanilla TypeScript powers the graph and filters. Markdown is processed with remark-math and rehype-katex; MDX is enabled for future mathematical documents. There is no React UI, authentication, application backend or database.

## Add a theorem, example or open problem

Create a Markdown file in `src/content/nodes/`. Give it a unique, permanent identifier. The filename can change; the **frontmatter `id` owns the mathematical URL**. Do not recycle identifiers or encode paper section numbering as the identity.

```yaml
---
id: CATGEN-NEW-001
title: A question about a categorical invariant
shortTitle: A categorical question
type: open-problem
claimStatus: open
publicationStatus: unpublished
summary: State the actual mathematical question in one sentence.
authors: []
projects: [CATGEN]
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

Supported claim statuses: `source-claimed`, `proved`, `verified`, `computational`, `conjectural`, `open`, `in-progress`, `abandoned`. Badges show status in text and a symbol, with distinct border/fill treatments. Graph shapes encode mathematical role; dashed outlines mark unfinished entries. The selected panel displays exact status and provenance. Status is never encoded only by color.

Optional metadata includes `date` (ISO `YYYY-MM-DD`), `dateNote`, `arxiv` (optionally versioned), and `timeline: { stage: 0, note: "..." }` for stages 0–4. Do not invent dates to fill the timeline.

## Add semantic relations

Relations are **outgoing from the record containing them**. For example, on `A-001`, `{ target: B-001, type: uses }` means **A uses B**. An arrow points toward the target. `dependsOn` is shorthand for outgoing `depends-on` relations; repeated identical edges are collapsed. Incoming relationships are computed automatically, so do not manually duplicate them on the target.

Supported relations: `uses`, `implies`, `generalizes`, `specializes`, `example-of`, `motivates`, `depends-on`, `obstructs`, `related-to`, `appears-in`. An optional `note` can qualify a relation. `motivates` describes a research direction, **not a logical consequence**. `related-to` makes no stronger claim. Never turn an exploratory edge into `implies` without mathematical justification.

The build rejects duplicate mathematical IDs, missing targets, self relations and dependency cycles. Reciprocal conceptual relationships are allowed. Every graph node and relationship comes from the collection, including local graphs.

## Provenance and the beta dataset

`provenance` distinguishes `source-backed`, `background` and `research-direction` entries. Every record requires `verification.method` (`human`, `human-source`, `computational`, `formal` or `mixed`) and an explanatory note. The method describes the attributed evidence, not an automatic certificate provided by this website.

- The X₁₀ exceptional-collection theorem is labeled **proved**, attributed to the preprint. Its proof has not been independently audited here.
- The Euler-form entry is a **source-reported computation**. This repository does not contain or rerun a numerical matrix computation.
- The arXiv record is described as a **preprint**, not as a journal publication.
- Background definitions are editorial atlas entries marked **in progress** pending review; this does not make standard definitions conjectural.
- Categorical genus, its mirror interpretation, and broad HMS/arithmetic extensions remain descriptions or questions where precise statements were not supplied. No invented genus formula, mirror polynomial or general theorem is asserted.
- No object in this beta claims formal verification.

The seed files use JSON-style values inside valid YAML frontmatter to keep fields on distinct lines. Conventional YAML, as above, is equally supported. References to the research outline identify user-supplied material; they are not external publications.

## Git as research history

The Git repository is intentionally the research database. Reviewable changes to `claimStatus`, `publicationStatus`, statement, sources, verification notes and relations record how mathematical objects develop. Keep IDs stable and use commit messages explaining the mathematical change.

An object might evolve from an observation (`concept`, `in-progress`) to a conjecture (`conjecture`, `conjectural`), then a proved result (`theorem`, `proved`), undergo revision, and eventually become published (`type: theorem`, `claimStatus: proved`, `publicationStatus: published`). “Observation” and “revised” describe history, not additional schema status values. An identity such as `CATGEN-004` would survive all of those transitions.

Git history links become useful after the files are committed to `main`; the conceptual timeline is not an automatically inferred commit timeline.

## GitHub Pages deployment

The project-site configuration is:

```js
site: "https://alequisGS.github.io";
base: "/math-overlod";
output: "static";
trailingSlash: "always";
```

All internal links use a shared base-path helper; bundled assets use Astro’s base configuration. The repository spelling **math-overlod** is intentional in paths, distinct from the **Math Overlord** product name.

1. Commit and push the project to `main` in `alequisGS/math-overlod`.
2. In repository **Settings → Pages → Build and deployment**, set **Source: GitHub Actions**.
3. The workflow runs on every push to `main` and can also be run manually. The official Astro action installs from the lockfile, runs tests and the production build, and uploads the static artifact. The deploy job publishes that artifact with Pages/OIDC permissions.
4. After the workflow succeeds, the site is available at **https://alequisGS.github.io/math-overlod/**.

The workflow follows the [official Astro GitHub Pages guide](https://docs.astro.build/en/guides/deploy/github/). This repository does not need a separate hosting service. Merely generating the workflow locally does not publish the website; it must run in GitHub with Pages enabled.

## Roadmap

**Beta 0.1:** individual research atlas, 31 stable mathematical objects, semantic graph, basic search/filtering, mathematical documents, index, provenance and conceptual timeline.

**Beta 0.2:** deterministic GitHub/LaTeX ingestion, source provenance, bibliography records, review staging, explicit acceptance, source synchronization, configurable projects, and separate claim/publication statuses.

**Beta 0.3 (deferred):** optional AI proposals, deeper semantic matching, richer mathematical search, compiled TeX numbering, and reproducible computation integrations. Any interpretation layer must still pass through review.

**Future:** multiple mathematicians, a federated/global graph, contributions through pull requests and links to formal verification.

Authentication, comments, rankings, social features, a database backend and an AI chatbot are intentionally absent from this beta.

## Beta 0.2: GitHub/LaTeX ingestion

The working source is the author's GitHub LaTeX repository. arXiv and journal versions provide public frozen presentations. Math Overlord stores the curated mathematical objects and their relationships.

```text
GitHub TeX at a pinned commit → deterministic extraction → imports/ review staging
                                                              ↓ explicit human acceptance
                                                    src/content/nodes/*.md
                                                              ↓
                                                   existing Astro collection and graph
```

No importer command automatically rewrites the graph. Source references mean only **source-refers-to**, not uses/implies. New accepted objects are **source-claimed**, with verification method **human-source** and publication status **draft** by default. Existing nodes retain their claim/publication status, IDs, manual prose, and semantic relations when source metadata is accepted.

### After updating a paper

1. Edit the TeX and push it to `alequisGS/alequisGS.github.io` under `ArXiv/<paper>/`.
2. Import the source and inspect the report and review page.
3. Review each proposed match and statement. Accept selected source records, then separately add justified semantic relations.
4. Run checks and build, review the Markdown/Git diff, then commit and push the Math Overlord changes when ready to publish.

```sh
npm run import:papers                            # Discover/import all first-level paper directories
npm run import:paper -- 2606.18238                # Import one paper at the current main commit
npm run import:status -- 2606.18238               # Local review states and candidate matches
npm run dev
# http://localhost:4321/math-overlod/imports/2606.18238/

# Review only: full before/after output; these do not write curated nodes.
npm run import:accept -- 2606.18238 paper --match X10-PAPER-001 --dry-run
npm run import:accept -- 2606.18238 cor:X10-stack-fec --match X10-EC-001 --dry-run
npm run import:accept -- 2606.18238 prop:X10-euler-form --match X10-EUL-001 --dry-run

# ONLY after deciding that the source belongs to that curated object:
npm run import:accept -- 2606.18238 cor:X10-stack-fec --match X10-EC-001 --write

# To create a genuinely new, reviewed object: choose its ID and project(s).
npm run import:accept -- 2606.18238 thm:explicit-cascades-main --id X10-CASC-THM-001 --projects X10,CATGEN --dry-run
# Repeat the reviewed command with --write. Optional: --publication preprint

# Reject a proposal (staging ledger only).
npm run import:reject -- 2606.18238 thm:explicit-cascades-main --note "Explain the review decision" --write

# Semantic relations are a separate mathematical judgment. Start with a dry run.
npm run import:relate -- X10-EC-001 --target X10-PAPER-001 --type appears-in --note "Reviewed attribution to this paper" --dry-run
# Replace --dry-run with --write only after reviewing the relation.

npm test
npm run check
npm run build
```

The example IDs are suggestions, not claims of equivalence. Never run all example accept commands indiscriminately. There is no bulk auto-accept. Without `--write`, accept/reject/relate are dry runs; `--dry-run` always overrides `--write`. After the first acceptance, the source key remembers the chosen stable ID, so later acceptance can omit `--match`. Changing that ID or attaching the same source identity to a second node is rejected.

`npm run import:paper -- 2606.18238 --dry-run` prints a proposed synchronization report without writing staging or curated content (the ignored fetch cache may be populated). `--offline` uses only a previously complete cache. `import:status` without a paper ID lists all staged papers. Static review pages do not persist browser actions; rebuild/restart the preview after CLI changes.

### Implementation and provenance

| File or directory                                   | Responsibility                                                                           |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/config/sources.ts`                             | Public GitHub repository, branch, source root, entrypoint                                |
| `scripts/import-papers.ts`                          | CLI dispatch, dry runs, serial command lock                                              |
| `scripts/ingest/source.ts`                          | Directory discovery, commit-pinned fetch/cache, recursive local inputs                   |
| `scripts/ingest/latex.ts`, `parser.ts`, `bibtex.ts` | Balanced structural scanning, object/proof extraction, bibliography                      |
| `scripts/ingest/matching.ts`, `staging.ts`          | Candidate scores, stable-key diff, review state                                          |
| `scripts/ingest/accept.ts`, `curated.ts`            | Explicit promotion and source-only updates to Markdown                                   |
| `imports/<paper>/paper.json`                        | Reviewable source representation; not a second graph database                            |
| `imports/<paper>/report.json`                       | Latest synchronization counts, differences, diagnostics                                  |
| `imports/<paper>/review.json`                       | Created on the first explicit accept/reject; decisions keyed by source identity and hash |
| `src/pages/imports/`                                | Informational Beta review routes                                                         |
| `src/components/SourceRecord.astro`                 | Accepted statements, proof disclosure, bibliography and provenance                       |
| `src/lib/node-schema.ts`                            | Shared CLI/Astro schema, optional multiple sources                                       |
| `src/content/projects.json`                         | Configurable research project definitions                                                |
| `tests/fixtures/paper/`, `tests/ingestion.test.ts`  | Offline multi-file fixtures and safety/regression tests                                  |

Every proposal records repository, branch, commit SHA, paper directory, source file and line ranges, labels, environment, section, retrieved timestamp, source file hashes, original statement/proof TeX, macros, citations, and syntactic references. Accepted `sources[]` records retain those source spans and file hashes. Hashes use UTF-8 text normalized to LF. Links distinguish the **commit-pinned imported version**, **current branch version**, and **file history**. The paper proposal uses the same acceptance mechanism and suggests the existing paper node. Its accepted source metadata holds the working title/authors/abstract independently of curated bibliographic prose. Paper pages compute contained accepted nodes from shared source identity or explicit appears-in relations.

The ignored `.import-cache/<paper>/<commit>/` stores fetched files and provenance. Public GitHub API/raw fetches need no token. Only declared .tex/.bib inputs are fetched; no generated files, shell escape, TeX execution, LLM API, or paid service is used. Relative inputs are resolved against their containing file, constrained to the paper directory. An unavailable file, include cycle, duplicate label, malformed environment, or unmatched brace becomes a diagnostic. Source errors prevent acceptance. The configured entrypoint is `main.tex`; adjust the source config for a different convention.

### Synchronization and stable identity

- Labeled objects use `label:<LaTeX label>`. Paper metadata uses `paper`. Printed numbers, ordering and file line shifts do not determine identity.
- Unlabeled objects use a normalized-text fingerprint and require extra review. Add a stable source label before substantial revisions; renamed/deleted labels require deliberate human reconciliation.
- The latest import compares against the prior staged version: **new**, **changed**, **removed**, **unchanged**, plus presentation changes. Comments and whitespace are normalized; statement/proof, relevant macros, and cited bibliography changes affect fingerprints. Structural numbering is an estimate, never claimed to be a compiled TeX number.
- **ACCEPTED/REJECTED** decisions persist only for the reviewed content hash. A changed accepted source becomes **CHANGED**, leaving the curated source snapshot untouched until explicitly accepted again. Removed objects are reported; the importer never deletes curated nodes.
- Exact accepted source identities have priority over fuzzy matches. Text/title overlap, arXiv ID (ignoring version suffix), type and tags provide deterministic **heuristic scores**, not probabilities or mathematical verification. Fuzzy candidates always require an explicit `--match`.
- **MATCHED** means an existing source identity is found; **POSSIBLE DUPLICATE** means text-based candidates exist; **NEEDS REVIEW** flags ambiguous/incomplete extraction or missing stable labels. Pending changed proposals remain flagged across reruns until reviewed.

Individual files are written through atomic replacements. A repository-local `.import-cache.lock` serializes CLI runs; if a terminated process leaves it behind, confirm no importer is running before removing that lock. Staging files and Markdown/ledger updates are not a cross-file database transaction: if interrupted after a Markdown source write, rerun acceptance; exact source metadata recovers the stable ID. Review generated diffs before committing. Missing cache files in offline mode produce diagnostics rather than invented content.

### Projects and epistemic status

Add a project to `src/content/projects.json` with title, short name, description, anchor node ID and direction. Create its anchor as a normal curated node. Graph filters, index, project headings and cluster placement read the registry; no hard-coded three-project limit remains. A node can have `projects: [X10, CATGEN]`; filtering matches every membership, while placement uses the first membership for one visible position. Unknown/duplicate memberships and missing anchors fail validation.

`claimStatus` accepts source-claimed, proved, verified, computational, conjectural, open, in-progress and abandoned. `publicationStatus` independently accepts draft, unpublished, preprint and published. Both dimensions have badges and graph/index filters. A preprint is not journal publication; a theorem environment is not independent proof verification.

The 31 existing nodes were migrated without changing IDs, body prose, verification notes or relations. Legacy project/status fields are also understood by the shared loader. `npm run migrate:content` previews migrations; add `-- --write` to write. Legacy published becomes publicationStatus published plus claimStatus source-claimed (it supplies no proof evidence); other claim statuses are preserved, and an existing arXiv identifier supplies preprint publication context when no explicit publication status exists.

### Initial source inspection and limitations

The initial source is commit `d59be5e034c4b1aba5a3cd6eb9f736a4262ae534`, under `ArXiv/2606.18238`. Extraction found **57 mathematical objects** (8 theorems, 11 propositions, 12 lemmas, 12 corollaries, 10 definitions, 1 example, 3 remarks), **25 section/subsection headings**, **28 bibliography entries**, **52 labeled objects**, **29 attached proofs**, and **70 internal references** across two files. **37 objects have 78 candidate match pairs**, plus one paper candidate, X10-PAPER-001. These are proposals; none were accepted into the 31-node curated graph. Its working title has evolved beyond the frozen Beta 0.1 bibliographic entry. Review the paper metadata update as well as individual statements; importing it does not silently replace the older exposition.

The parser deliberately does not implement TeX expansion, conditional compilation, custom counter programs, or mathematical equivalence. Unknown macros remain in original source. The safe KaTeX preview renders supported math and falls back to source for unsupported expressions; raw TeX is always available. Proofs associate only when immediately following an object. Numbering, candidate matches and source references are review aids. Bibliography records remain references, not graph nodes. Future semantic extractors implement the proposal-only `SemanticExtractor` interface; no external interpretation API is called in Beta 0.2.
