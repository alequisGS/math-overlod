import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Document } from "yaml";
import {
  expandSource,
  discoverDirectories,
  GithubSource,
} from "../scripts/ingest/source.ts";
import { fixtureReader, resolveLocalPath } from "../scripts/ingest/files.ts";
import { parsePaper } from "../scripts/ingest/parser.ts";
import { parseBibtex } from "../scripts/ingest/bibtex.ts";
import {
  comparePapers,
  stagePaper,
  ledgerFor,
  applyReview,
  stagedPapers,
} from "../scripts/ingest/staging.ts";
import {
  acceptProposal,
  rejectProposal,
  relateNodes,
} from "../scripts/ingest/accept.ts";
import { readCurated, parseRecord } from "../scripts/ingest/curated.ts";
import { candidatesFor } from "../scripts/ingest/matching.ts";
import {
  migrateLegacyNode,
  validateProjectMembership,
} from "../src/lib/ontology.ts";
import { sourceLinks } from "../src/lib/source-links.ts";
import { latexPreview } from "../src/lib/latex-preview.ts";
import type { PaperSource } from "../scripts/ingest/types.ts";
const source: PaperSource = {
  provider: "github",
  repository: "test/papers",
  branch: "main",
  commit: "a".repeat(40),
  root: "ArXiv",
  paperDirectory: "2606.18238",
  retrievedAt: "2026-09-11T00:00:00Z",
  files: [],
  entrypoint: "main.tex",
};
async function fixture() {
  const expanded = await expandSource("main.tex", (file: string) =>
    fixtureReader(path.resolve("tests/fixtures/paper"), file),
  );
  return parsePaper(structuredClone(source), expanded);
}
async function parse(text: string) {
  return parsePaper(
    structuredClone(source),
    await expandSource("main.tex", async () => text),
  );
}
const legacy = {
  id: "X10-TEST-001",
  title: "Exceptional collection for the canonical stack of X₁₀",
  shortTitle: "Exceptional collection",
  type: "theorem",
  status: "proved",
  project: "X10",
  summary: "The canonical stack admits an exceptional collection.",
  arxiv: "2606.18238v4",
  tags: ["exceptional collection"],
  relations: [],
  dependsOn: [],
  verification: { method: "human", note: "Curated proof attribution." },
  provenance: "source-backed",
};
async function workspace() {
  const root = await mkdtemp(path.join(os.tmpdir(), "math-overlord-test-"));
  await mkdir(path.join(root, "src/content/nodes"), { recursive: true });
  const file = path.join(root, "src/content/nodes/test.md");
  await writeFile(
    file,
    `---\n${new Document(legacy).toString()}---\n\n## Human exposition\n\nPreserve my exact $x$ and punctuation.\n`,
  );
  return { root, file };
}
test("first-level directory discovery excludes files and unsafe names", () => {
  assert.deepEqual(
    discoverDirectories([
      { name: "2606.18238", type: "dir" },
      { name: "README.md", type: "file" },
      { name: "future", type: "dir" },
    ]),
    ["2606.18238", "future"],
  );
  assert.throws(() => discoverDirectories([{ name: "../bad", type: "dir" }]));
});
test("recursive input/include resolves extensions, source lines, and bibliography", async () => {
  const p = await fixture();
  assert.deepEqual(p.diagnostics, []);
  assert.equal(p.objects.length, 4);
  assert.equal(p.sections.length, 2);
  assert.equal(p.metadata.authors.length, 2);
  assert.equal(p.metadata.title, "A fixture for $\\Xten$");
  assert.match(p.metadata.abstract!, /\\mystery/);
  const o = p.objects.find((o) => o.latexLabel === "thm:stable")!;
  assert.ok(o);
  assert.equal(o.sourceFile, "ArXiv/2606.18238/parts/results.tex");
  assert.equal(o.startLine, 2);
  assert.equal(o.endLine, 6);
  assert.deepEqual(o.labels, ["thm:stable"]);
  assert.equal(o.printedNumber, "1.1");
  assert.equal(
    p.objects.find((o) => o.latexLabel === "lem:fixture")?.printedNumber,
    "1.2",
  );
  assert.equal(o.title, "A {nested} name");
  assert.equal(p.macros["\\Xten"], "X_{10}");
  assert.equal(
    p.objects.find((o) => o.environment === "open-problem")?.proposedNodeType,
    "open-problem",
  );
});
test("proofs with nested lists retain references and do not infer semantics", async () => {
  const p = await fixture(),
    o = p.objects.find((o) => o.latexLabel === "thm:stable")!;
  assert.match(o.proof!, /First step/);
  assert.ok(o.proofSpans?.length);
  assert.ok(
    o.references.some(
      (r) => r.context === "proof" && r.targetSourceKey === "label:lem:fixture",
    ),
  );
  assert.ok(
    o.references.some(
      (r) =>
        r.label === "eq:fixture" &&
        r.targetKind === "equation" &&
        !r.targetSourceKey,
    ),
  );
  assert.ok(
    o.references.some(
      (r) => r.label === "sec:geometry" && r.targetKind === "section",
    ),
  );
  assert.deepEqual(o.citations, ["Source"]);
  assert.equal(o.equations.length, 1);
  assert.equal(o.claimStatus, "source-claimed");
  assert.equal(o.verification.method, "human-source");
  assert.ok(!("relations" in o));
});
test("path traversal, dynamic paths, remote files and include cycles fail safely", async () => {
  for (const target of [
    "../outside",
    "/etc/passwd",
    "https://evil/x",
    "C:\\file",
    "%2e%2e/file",
    "\\macro",
    "file.pdf",
  ])
    assert.throws(() => resolveLocalPath("main.tex", target, ".tex"));
  const read = async (file: string) =>
    file === "main.tex" ? "\\input{parts/a}" : "\\input{../main}";
  const circular = await expandSource("main.tex", read);
  assert.ok(circular.diagnostics.some((d) => /Circular/.test(d.message)));
  const escape = await expandSource(
    "main.tex",
    async () => String.raw`\input{../secret}`,
  );
  assert.ok(escape.diagnostics.some((d) => d.severity === "error"));
});
test("BibTeX nested values, strings, keys, case-insensitive fields and used flags", async () => {
  const p = await fixture(),
    c = p.citations.find((c) => c.key === "Source")!;
  assert.deepEqual(c.authors, ["Example, Alice", "Test, Bob"]);
  assert.equal(c.title, "A {Nested {Title}}");
  assert.equal(c.journal, "Fixture Journal");
  assert.equal(c.doi, "10.1234/example");
  assert.equal(c.eprint, "2606.18238");
  assert.equal(c.used, true);
  assert.equal(p.citations.find((c) => c.key === "Unused")?.used, false);
  assert.match(c.raw, /@article/);
  assert.ok(
    parseBibtex("@article{x, title={bad}", "a.bib").diagnostics.some(
      (d) => d.severity === "error",
    ),
  );
});
test("duplicate labels are blocked and malformed TeX is diagnostic rather than executable", async () => {
  const p = await parse(
    String.raw`\begin{theorem}\label{dup}A\end{theorem}\begin{lemma}\label{dup}B\end{lemma}`,
  );
  assert.equal(p.objects.length, 2);
  assert.ok(p.objects.every((o) => o.blocked));
  assert.ok(p.diagnostics.some((d) => /Duplicate/.test(d.message)));
  const broken = await parse(String.raw`\begin{theorem}\label{incomplete}A`);
  assert.equal(broken.objects.length, 0);
  assert.ok(broken.diagnostics.some((d) => /Unclosed/.test(d.message)));
  const braces = await parse(String.raw`\begin{theorem}{A\end{theorem}`);
  assert.ok(braces.diagnostics.some((d) => /braces/.test(d.message)));
});
test("renumbering/reordering preserves labeled identity and detects presentation changes", async () => {
  const text = String.raw`\newtheorem{theorem}{Theorem}[section]\section{One}\begin{theorem}\label{stable}A.\end{theorem}`;
  const old = await parse(text),
    fresh = await parse(
      text.replace("\\section{One}", "\\section{Before}\\section{One}"),
    );
  assert.equal(old.objects[0].sourceKey, fresh.objects[0].sourceKey);
  assert.equal(old.objects[0].suggestedId, fresh.objects[0].suggestedId);
  assert.equal(old.objects[0].contentHash, fresh.objects[0].contentHash);
  const diff = comparePapers(old, fresh);
  assert.ok(diff.unchanged.includes("label:stable"));
  assert.ok(diff.presentationChanged.includes("label:stable"));
  assert.equal(diff.new.length, 0);
});
test("content changes and removal are distinct, comments alone are unchanged", async () => {
  const old = await parse(
      String.raw`\begin{theorem}\label{one}A.\end{theorem}\begin{lemma}\label{two}B.\end{lemma}`,
    ),
    fresh = await parse(
      String.raw`\begin{theorem}\label{one}C.\end{theorem}\begin{lemma}\label{three}D.\end{lemma}`,
    );
  const diff = comparePapers(old, fresh);
  assert.deepEqual(diff.changed, ["label:one"]);
  assert.deepEqual(diff.removed, ["label:two"]);
  assert.deepEqual(diff.new, ["label:three"]);
  const comment = await parse(
    String.raw`\begin{theorem}\label{one}A.% comment` +
      "\n" +
      String.raw`\end{theorem}\begin{lemma}\label{two}B.\end{lemma}`,
  );
  assert.equal(comparePapers(old, comment).changed.length, 0);
});
test("macro or cited bibliography changes update fingerprints", async () => {
  const a = await parse(
      String.raw`\newcommand{\X}{x}\begin{theorem}\label{one}$\X$\end{theorem}`,
    ),
    b = await parse(
      String.raw`\newcommand{\X}{y}\begin{theorem}\label{one}$\X$\end{theorem}`,
    );
  assert.deepEqual(comparePapers(a, b).changed, ["label:one"]);
  const base = (file: string) =>
    fixtureReader(path.resolve("tests/fixtures/paper"), file);
  const old = await fixture();
  const fresh = parsePaper(
    source,
    await expandSource("main.tex", async (file) => {
      const s = await base(file);
      return file === "refs.bib" ? s.replace("2026", "2027") : s;
    }),
  );
  assert.ok(comparePapers(old, fresh).changed.includes("label:thm:stable"));
});
test("matching proposes overlap and version-independent arXiv matches without merging", async () => {
  const { root } = await workspace(),
    records = await readCurated(root),
    paper = await fixture(),
    object = paper.objects.find((o) => o.latexLabel === "thm:stable")!;
  const matches = candidatesFor(object, paper, records);
  assert.equal(matches[0].nodeId, legacy.id);
  assert.ok(!matches[0].exact);
  assert.ok(matches[0].reasons.some((r) => /arXiv/.test(r)));
});
test("importing and dry-run acceptance never change curated records", async () => {
  const { root, file } = await workspace(),
    before = await readFile(file, "utf8"),
    paper = await fixture();
  const records = await readCurated(root);
  await stagePaper(root, paper, records);
  await stagePaper(root, structuredClone(paper), records);
  assert.equal(await readFile(file, "utf8"), before);
  const result = await acceptProposal(root, "2606.18238", "thm:stable", {
    match: legacy.id,
  });
  assert.equal(result.written, false);
  assert.equal(await readFile(file, "utf8"), before);
  assert.deepEqual((await ledgerFor(root, "2606.18238")).decisions, {});
  const fresh = await workspace();
  await stagePaper(fresh.root, paper, await readCurated(fresh.root), true);
  assert.deepEqual(await stagedPapers(fresh.root), []);
});
test("acceptance preserves stable ID, exact manual prose, claim status and relations across sync", async () => {
  const { root, file } = await workspace();
  const body = parseRecord(await readFile(file, "utf8"), file).body;
  await writeFile(
    path.join(root, "src/content/nodes/other.md"),
    `---\n${new Document({ ...legacy, id: "X10-OTHER-001" }).toString()}---\nOther curated object.\n`,
  );
  await writeFile(
    file,
    `---\n${new Document({ ...legacy, dependsOn: ["X10-OTHER-001"], relations: [{ target: "X10-OTHER-001", type: "uses", note: "Manually reviewed dependency." }] }).toString()}---\n${body}`,
  );
  const paper = await fixture();
  await stagePaper(root, paper, await readCurated(root));
  const before = parseRecord(await readFile(file, "utf8"), file);
  await acceptProposal(root, "2606.18238", "thm:stable", {
    match: legacy.id,
    write: true,
  });
  const after = parseRecord(await readFile(file, "utf8"), file);
  assert.equal(after.data.id, before.data.id);
  assert.equal(after.body, before.body);
  assert.equal(after.data.claimStatus, "proved");
  assert.deepEqual(after.data.relations, before.data.relations);
  assert.deepEqual(after.data.dependsOn, before.data.dependsOn);
  assert.equal(after.data.sources[0].label, "thm:stable");
  assert.equal(after.data.sources[0].commit, source.commit);
  const same = await stagePaper(root, await fixture(), await readCurated(root));
  assert.equal(
    same.paper.objects.find((o) => o.latexLabel === "thm:stable")?.reviewState,
    "ACCEPTED",
  );
  const changed = await fixture();
  const object = changed.objects.find((o) => o.latexLabel === "thm:stable")!;
  object.statement += " Changed.";
  object.contentHash = "changed";
  changed.source.commit = "b".repeat(40);
  await stagePaper(root, changed, await readCurated(root));
  assert.equal(
    applyReview(changed, await ledgerFor(root, "2606.18238")).objects.find(
      (o) => o.latexLabel === "thm:stable",
    )?.reviewState,
    "CHANGED",
  );
  assert.equal(
    parseRecord(await readFile(file, "utf8"), file).data.sources[0].commit,
    source.commit,
  );
  await acceptProposal(root, "2606.18238", "thm:stable", { write: true });
  const updated = parseRecord(await readFile(file, "utf8"), file);
  assert.equal(updated.data.id, legacy.id);
  assert.equal(updated.body, before.body);
  assert.deepEqual(updated.data.relations, before.data.relations);
  assert.deepEqual(updated.data.dependsOn, before.data.dependsOn);
  assert.equal(updated.data.sources.length, 1);
  assert.equal(updated.data.sources[0].commit, "b".repeat(40));
  changed.objects = changed.objects.filter(
    (o) => o.latexLabel !== "thm:stable",
  );
  const removed = await stagePaper(root, changed, await readCurated(root));
  assert.ok(removed.report.diff.removed.includes("label:thm:stable"));
  assert.equal((await readCurated(root)).length, 2);
});
test("new acceptance requires explicit identity/project and remains source-claimed", async () => {
  const { root } = await workspace();
  await stagePaper(root, await fixture(), await readCurated(root));
  await assert.rejects(
    () => acceptProposal(root, "2606.18238", "lem:fixture"),
    /Choose/,
  );
  await assert.rejects(
    () =>
      acceptProposal(root, "2606.18238", "lem:fixture", {
        id: "NEW-001",
        projects: ["UNKNOWN"],
        write: true,
      }),
    /unknown project/,
  );
  await acceptProposal(root, "2606.18238", "lem:fixture", {
    id: "NEW-001",
    projects: ["X10", "CATGEN"],
    write: true,
  });
  const fresh = (await readCurated(root)).find((r) => r.data.id === "NEW-001")!;
  assert.equal(fresh.data.claimStatus, "source-claimed");
  assert.equal(fresh.data.publicationStatus, "draft");
  assert.deepEqual(fresh.data.projects, ["X10", "CATGEN"]);
  assert.equal(fresh.data.relations.length, 0);
  await relateNodes(
    root,
    "NEW-001",
    legacy.id,
    "uses",
    "Explicit reviewed dependency.",
    true,
  );
  assert.equal(
    (await readCurated(root)).find((r) => r.data.id === "NEW-001")?.data
      .relations[0].type,
    "uses",
  );
  await assert.rejects(
    () =>
      relateNodes(
        root,
        "NEW-001",
        legacy.id,
        "source-refers-to",
        "syntactic",
        true,
      ),
    /supported/,
  );
});
test("rejections persist until source changes and source errors prevent acceptance", async () => {
  const { root } = await workspace();
  const p = await fixture();
  await stagePaper(root, p, await readCurated(root));
  await rejectProposal(root, "2606.18238", "lem:fixture", "Not relevant", true);
  assert.equal(
    applyReview(p, await ledgerFor(root, "2606.18238")).objects.find(
      (o) => o.latexLabel === "lem:fixture",
    )?.reviewState,
    "REJECTED",
  );
  p.diagnostics.push({ severity: "error", message: "Missing input" });
  await stagePaper(root, p, await readCurated(root));
  await assert.rejects(
    () =>
      acceptProposal(root, "2606.18238", "thm:stable", {
        match: legacy.id,
        write: true,
      }),
    /Resolve source errors/,
  );
});
test("project and status migration is idempotent and supports additional/multiple projects", () => {
  const migrated = migrateLegacyNode(legacy);
  assert.deepEqual(migrated.projects, ["X10"]);
  assert.equal(migrated.claimStatus, "proved");
  assert.equal(migrated.publicationStatus, "preprint");
  assert.ok(!("status" in migrated));
  assert.deepEqual(migrateLegacyNode(migrated), migrated);
  const published = migrateLegacyNode({ ...legacy, status: "published" });
  assert.equal(published.claimStatus, "source-claimed");
  assert.equal(published.publicationStatus, "published");
  assert.doesNotThrow(() =>
    validateProjectMembership([{ id: "TEST-001", projects: ["X10", "NEW"] }], {
      X10: {},
      NEW: {},
    }),
  );
  assert.throws(() =>
    validateProjectMembership([{ id: "TEST-001", projects: ["X10", "X10"] }], {
      X10: {},
    }),
  );
});
test("provenance links are commit pinned and preview escapes HTML/unknown commands", () => {
  const links = sourceLinks({
    ...source,
    path: "ArXiv/2606.18238/main.tex",
    startLine: 2,
    endLine: 5,
  });
  assert.match(links.pinned, new RegExp(`/blob/${source.commit}/.*#L2-L5$`));
  assert.match(links.current, /\/blob\/main\//);
  assert.match(links.history, /\/commits\/main\//);
  const html = latexPreview("<script>alert(1)</script> $\\unknown{x}$");
  assert.ok(!html.includes("<script>"));
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /latex-fallback/);
  const title = latexPreview(
    String.raw`\texorpdfstring{$x$}{x} \label{hidden} \unknown{kept}`,
  );
  assert.ok(!title.includes("texorpdfstring"));
  assert.ok(!title.includes("label{hidden}"));
  assert.ok(title.includes("unknown{kept}"));
});
test("public source cache is reusable offline without any network request", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "math-overlord-cache-"));
  const github = new GithubSource(root);
  let requests = 0;
  github.request = async (url) => {
    requests++;
    if (url.includes("/commits/"))
      return JSON.stringify({ sha: source.commit });
    if (url.includes("/contents/"))
      return JSON.stringify([{ name: "2606.18238", type: "dir" }]);
    return String.raw`\title{Cached}\begin{theorem}\label{cached}A\end{theorem}`;
  };
  const catalog = await github.discover();
  await github.bundle("2606.18238", catalog);
  assert.equal(requests, 3);
  const offline = new GithubSource(root, true);
  offline.request = async () => {
    throw new Error("Network forbidden");
  };
  const cached = await offline.bundle("2606.18238", await offline.discover());
  assert.match(cached.expanded.text, /Cached/);
  assert.equal(cached.source.commit, source.commit);
});
