import { mkdir, readFile, rename, writeFile, realpath } from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";

export const hash = (text: string) =>
  createHash("sha256").update(text).digest("hex");
export function safeSegment(value: string) {
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value) ||
    value === "." ||
    value === ".."
  )
    throw new Error(`Unsafe paper directory: ${value}`);
  return value;
}
export function resolveLocalPath(
  from: string,
  target: string,
  extension: string,
) {
  if (
    !target ||
    /[\\\0:#?{}%]/.test(target) ||
    path.posix.isAbsolute(target) ||
    /^[A-Za-z]:/.test(target)
  )
    throw new Error(`Unsafe or dynamic source path: ${target}`);
  const normalized = path.posix.normalize(
    path.posix.join(path.posix.dirname(from), target.trim()),
  );
  if (normalized === ".." || normalized.startsWith("../"))
    throw new Error(`Source path escapes the paper directory: ${target}`);
  if (
    path.posix.extname(normalized) &&
    path.posix.extname(normalized) !== extension
  )
    throw new Error(`Only ${extension} source files may be loaded: ${target}`);
  return path.posix.extname(normalized)
    ? normalized
    : `${normalized}${extension}`;
}
export async function readJson<T>(file: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
}
export async function atomicWrite(file: string, text: string) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  await writeFile(temp, text, "utf8");
  await rename(temp, file);
}
export const writeJson = (file: string, value: unknown) =>
  atomicWrite(file, JSON.stringify(value, null, 2) + "\n");
export async function fixtureReader(root: string, file: string) {
  const base = await realpath(root),
    resolved = await realpath(path.resolve(root, file));
  if (resolved !== base && !resolved.startsWith(base + path.sep))
    throw new Error(`Local source symlink escapes paper directory: ${file}`);
  return readFile(resolved, "utf8");
}
