import path from "node:path";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { researchSources } from "../../src/config/sources.ts";
import { commands, groupAt, maskIgnored } from "./latex.ts";
import {
  hash,
  readJson,
  resolveLocalPath,
  safeSegment,
  writeJson,
} from "./files.ts";
import type { Diagnostic, PaperSource, SourceSpan } from "./types.ts";

export interface Segment {
  start: number;
  end: number;
  file: string;
  sourceStart: number;
}
export interface ExpandedSource {
  text: string;
  segments: Segment[];
  files: Record<string, string>;
  bibliographies: string[];
  diagnostics: Diagnostic[];
}
export async function expandSource(
  entrypoint: string,
  read: (file: string) => Promise<string>,
): Promise<ExpandedSource> {
  const result: ExpandedSource = {
    text: "",
    segments: [],
    files: {},
    bibliographies: [],
    diagnostics: [],
  };
  async function load(file: string, stack: string[]) {
    if (stack.includes(file)) {
      result.diagnostics.push({
        severity: "error",
        file,
        message: `Circular input: ${[...stack, file].join(" → ")}`,
      });
      return;
    }
    if (stack.length > 32 || Object.keys(result.files).length >= 256)
      throw new Error("Source bundle exceeds the depth/file safety limit");
    let original: string;
    try {
      original =
        result.files[file] ?? (await read(file)).replace(/\r\n?/g, "\n");
      if (original.length > 8_000_000)
        throw new Error("Source file exceeds 8 MB");
      result.files[file] = original;
    } catch (error) {
      result.diagnostics.push({
        severity: "error",
        file,
        message: `Cannot read source: ${(error as Error).message}`,
      });
      return;
    }
    const clean = maskIgnored(original);
    let cursor = 0;
    const append = (start: number, end: number) => {
      if (end <= start) return;
      const offset = result.text.length;
      result.text += original.slice(start, end);
      result.segments.push({
        start: offset,
        end: result.text.length,
        file,
        sourceStart: start,
      });
    };
    for (const command of commands(original)) {
      if (["input", "include"].includes(command.name)) {
        const arg = groupAt(clean, command.end);
        if (!arg) {
          result.diagnostics.push({
            severity: "error",
            file,
            message: `Unbraced or malformed \\${command.name}; use a literal braced path.`,
          });
          continue;
        }
        append(cursor, command.start);
        cursor = arg.end;
        try {
          await load(resolveLocalPath(file, arg.value, ".tex"), [
            ...stack,
            file,
          ]);
        } catch (error) {
          result.diagnostics.push({
            severity: "error",
            file,
            message: (error as Error).message,
          });
        }
      } else if (["bibliography", "addbibresource"].includes(command.name)) {
        const options = groupAt(clean, command.end, "[", "]");
        const arg = groupAt(clean, options?.end ?? command.end);
        if (!arg) {
          result.diagnostics.push({
            severity: "warning",
            file,
            message: "Malformed bibliography declaration",
          });
          continue;
        }
        for (const target of arg.value.split(","))
          try {
            const bib = resolveLocalPath(file, target.trim(), ".bib");
            if (!result.bibliographies.includes(bib))
              result.bibliographies.push(bib);
          } catch (error) {
            result.diagnostics.push({
              severity: "error",
              file,
              message: (error as Error).message,
            });
          }
      }
    }
    append(cursor, original.length);
  }
  await load(entrypoint, []);
  for (const bib of result.bibliographies)
    try {
      const text = await read(bib);
      if (text.length > 8_000_000) throw new Error("Bibliography exceeds 8 MB");
      result.files[bib] = text.replace(/\r\n?/g, "\n");
    } catch (error) {
      result.diagnostics.push({
        severity: "error",
        file: bib,
        message: `Cannot load bibliography: ${(error as Error).message}`,
      });
    }
  return result;
}
export function sourceSpans(
  source: ExpandedSource,
  start: number,
  end: number,
): SourceSpan[] {
  const spans: SourceSpan[] = [];
  for (const segment of source.segments) {
    const lo = Math.max(start, segment.start),
      hi = Math.min(end, segment.end);
    if (hi <= lo) continue;
    const text = source.files[segment.file];
    const line = (offset: number) =>
      1 + (text.slice(0, offset).match(/\n/g)?.length ?? 0);
    const span = {
      file: segment.file,
      startLine: line(segment.sourceStart + lo - segment.start),
      endLine: line(segment.sourceStart + hi - segment.start - 1),
    };
    const previous = spans.at(-1);
    if (previous?.file === span.file && previous.endLine + 1 >= span.startLine)
      previous.endLine = span.endLine;
    else spans.push(span);
  }
  return spans;
}
interface Catalog {
  repository: string;
  branch: string;
  root: string;
  commit: string;
  directories: string[];
}
interface CacheRecord {
  source: PaperSource;
}
export class GithubSource {
  config = researchSources.papers;
  cacheRoot: string;
  offline: boolean;
  constructor(cacheRoot = ".import-cache", offline = false) {
    this.cacheRoot = cacheRoot;
    this.offline = offline;
  }
  async request(url: string) {
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Math-Overlord-Beta-0.2",
      },
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok)
      throw new Error(
        `GitHub HTTP ${response.status} for ${url}. Public API limits may apply; use --offline with an existing cache.`,
      );
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > 8_000_000) throw new Error("Source response exceeds 8 MB");
    const text = await response.text();
    if (text.length > 8_000_000)
      throw new Error("Source response exceeds 8 MB");
    return text;
  }
  async discover(): Promise<Catalog> {
    const { owner, repo, branch, root } = this.config,
      repository = `${owner}/${repo}`;
    const cached = await readJson<Catalog>(
      path.join(this.cacheRoot, "catalog.json"),
    );
    const valid =
      cached?.repository === repository &&
      cached.branch === branch &&
      cached.root === root;
    if (this.offline) {
      if (!valid)
        throw new Error(
          "No matching source catalog cached. Run an online import first.",
        );
      return cached;
    }
    const commit = JSON.parse(
      await this.request(
        `https://api.github.com/repos/${repository}/commits/${encodeURIComponent(branch)}`,
      ),
    ).sha as string;
    if (!/^[a-f0-9]{40}$/.test(commit))
      throw new Error("GitHub returned an invalid commit SHA");
    if (valid && cached.commit === commit) return cached;
    const entries = JSON.parse(
      await this.request(
        `https://api.github.com/repos/${repository}/contents/${root}?ref=${commit}`,
      ),
    );
    const catalog = {
      repository,
      branch,
      root,
      commit,
      directories: discoverDirectories(entries),
    };
    await writeJson(path.join(this.cacheRoot, "catalog.json"), catalog);
    return catalog;
  }
  async bundle(directory: string, catalog: Catalog) {
    safeSegment(directory);
    if (!catalog.directories.includes(directory))
      throw new Error(
        `No paper directory ${directory} found under ${catalog.root}`,
      );
    const cache = path.join(this.cacheRoot, directory, catalog.commit);
    const cached = await readJson<CacheRecord>(path.join(cache, "source.json"));
    const retrievedAt = cached?.source.retrievedAt ?? new Date().toISOString();
    const read = async (file: string) => {
      const dest = path.join(cache, "files", file);
      try {
        return await readFile(dest, "utf8");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
      if (this.offline)
        throw new Error(
          `Missing cached file ${file}; an online import is required`,
        );
      const remote = [
        catalog.repository,
        catalog.commit,
        catalog.root,
        directory,
        file,
      ]
        .join("/")
        .split("/")
        .map(encodeURIComponent)
        .join("/");
      const text = await this.request(
        `https://raw.githubusercontent.com/${remote}`,
      );
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, text);
      return text;
    };
    const expanded = await expandSource(this.config.entrypoint, read);
    const source: PaperSource = {
      provider: "github",
      repository: catalog.repository,
      branch: catalog.branch,
      commit: catalog.commit,
      root: catalog.root,
      paperDirectory: directory,
      retrievedAt,
      entrypoint: this.config.entrypoint,
      files: Object.entries(expanded.files)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([file, text]) => ({
          path: file,
          sha256: hash(text),
          bytes: Buffer.byteLength(text),
        })),
    };
    await writeJson(path.join(cache, "source.json"), { source });
    return { source, expanded };
  }
}
export function discoverDirectories(entries: unknown): string[] {
  if (!Array.isArray(entries))
    throw new Error("Expected a GitHub directory listing");
  return entries
    .filter((e) => e?.type === "dir" && typeof e.name === "string")
    .map((e) => safeSegment(e.name))
    .sort();
}
