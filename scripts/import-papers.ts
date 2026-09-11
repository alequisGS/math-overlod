import path from "node:path";
import { open, unlink } from "node:fs/promises";
import { GithubSource } from "./ingest/source.ts";
import { parsePaper } from "./ingest/parser.ts";
import { readCurated } from "./ingest/curated.ts";
import { stagePaper, stagedPapers, proposals } from "./ingest/staging.ts";
import {
  acceptProposal,
  rejectProposal,
  relateNodes,
} from "./ingest/accept.ts";
const root = process.cwd();
const [command, ...args] = process.argv.slice(2).filter((a) => a !== "--");
const flags = new Map<string, string | boolean>();
const positional: string[] = [];
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg.startsWith("--")) {
    if (["--write", "--dry-run", "--offline"].includes(arg))
      flags.set(arg, true);
    else if (args[i + 1] && !args[i + 1].startsWith("--"))
      flags.set(arg, args[++i]);
    else throw new Error(`Missing value for ${arg}`);
  } else positional.push(arg);
}
const value = (key: string) =>
  typeof flags.get(key) === "string" ? String(flags.get(key)) : undefined;
const write = flags.has("--write") && !flags.has("--dry-run");
const supported = new Set([
  "--write",
  "--dry-run",
  "--offline",
  "--match",
  "--id",
  "--projects",
  "--publication",
  "--target",
  "--type",
  "--note",
]);
for (const key of flags.keys())
  if (!supported.has(key)) throw new Error(`Unknown option ${key}`);
const required = (index: number) => {
  if (!positional[index])
    throw new Error(
      "Missing paper ID, label, or node ID. See README CLI examples.",
    );
  return positional[index];
};
function diff(result: {
  file: string;
  before: string;
  after: string;
  written: boolean;
}) {
  console.log(
    `${result.written ? "WROTE" : "DRY RUN"} ${path.relative(root, result.file)}`,
  );
  // Full before/after makes source replacement and unchanged manual prose reviewable.
  console.log(
    `--- BEFORE\n${result.before || "(new file)"}\n+++ AFTER\n${result.after}`,
  );
  if (!result.written)
    console.log(
      "No curated file changed. Repeat with --write after reviewing.",
    );
}
async function main() {
  if (command === "papers" || command === "paper") {
    const github = new GithubSource(
      path.join(root, ".import-cache"),
      flags.has("--offline"),
    );
    const catalog = await github.discover();
    const curated = await readCurated(root);
    for (const id of command === "paper"
      ? [required(0)]
      : catalog.directories) {
      const { source, expanded } = await github.bundle(id, catalog);
      const result = await stagePaper(
        root,
        parsePaper(source, expanded),
        curated,
        flags.has("--dry-run"),
      );
      console.log(
        JSON.stringify(
          { paper: id, dryRun: flags.has("--dry-run"), ...result.report },
          null,
          2,
        ),
      );
    }
  } else if (command === "status") {
    for (const paper of (await stagedPapers(root)).filter(
      (p) => !positional[0] || p.source.paperDirectory === positional[0],
    )) {
      console.log(
        `\n${paper.source.paperDirectory} @ ${paper.source.commit}\n${paper.objects.length} mathematical proposals; ${paper.citations.length} bibliography entries; ${paper.source.files.length} files`,
      );
      for (const o of proposals(paper))
        console.log(
          `${o.reviewState.padEnd(19)} ${o.latexLabel ?? o.sourceKey} ${o.candidates.map((c) => `${c.nodeId} (${c.confidence})`).join(", ")}`,
        );
    }
  } else if (command === "accept")
    diff(
      await acceptProposal(root, required(0), required(1), {
        match: value("--match"),
        id: value("--id"),
        projects: value("--projects")?.split(","),
        publication: value("--publication"),
        write,
      }),
    );
  else if (command === "reject")
    console.log(
      await rejectProposal(
        root,
        required(0),
        required(1),
        value("--note") ?? "",
        write,
      ),
    );
  else if (command === "relate")
    diff(
      await relateNodes(
        root,
        required(0),
        value("--target") ?? required(1),
        value("--type") ?? "",
        value("--note") ?? "",
        write,
      ),
    );
  else
    throw new Error(
      "Commands: papers, paper <directory>, status, accept <directory> <label>, reject <directory> <label>, relate <node-id>. See README.",
    );
}
// Serialize CLI operations so staging and review ledgers cannot overwrite each other.
const lock = path.join(root, ".import-cache.lock");
let handle;
try {
  handle = await open(lock, "wx");
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (handle) {
    await handle.close();
    await unlink(lock);
  }
}
