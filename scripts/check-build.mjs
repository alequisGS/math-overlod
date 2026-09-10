import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
const root = path.resolve("dist");
async function walk(dir) {
  return (
    await Promise.all(
      (await readdir(dir, { withFileTypes: true })).map((e) =>
        e.isDirectory() ? walk(path.join(dir, e.name)) : path.join(dir, e.name),
      ),
    )
  ).flat();
}
const files = await walk(root),
  html = files.filter((f) => f.endsWith(".html"));
const errors = [];
let mathPages = 0,
  links = 0;
for (const file of html) {
  const source = await readFile(file, "utf8");
  if (source.includes("katex-error")) errors.push(`KaTeX error in ${file}`);
  if (source.includes('class="katex"')) mathPages++;
  for (const [, attr, raw] of source.matchAll(/\b(href|src)="([^"#]+)"/g)) {
    if (/^(https?:|mailto:|data:|tel:)/.test(raw)) continue;
    const target = decodeURIComponent(raw.split(/[?#]/)[0]);
    if (!target) continue;
    links++;
    if (target.startsWith("/") && !target.startsWith("/math-overlod/")) {
      errors.push(`Missing base path: ${target} in ${file}`);
      continue;
    }
    let local = target.startsWith("/")
      ? path.join(root, target.slice("/math-overlod/".length))
      : path.resolve(path.dirname(file), target);
    try {
      if ((await stat(local)).isDirectory())
        local = path.join(local, "index.html");
      await stat(local);
    } catch {
      errors.push(`Broken ${attr}: ${raw} in ${file}`);
    }
  }
}
const nodePages = html.filter((f) =>
  f.includes(`${path.sep}node${path.sep}`),
).length;
if (nodePages < 25)
  errors.push(`Expected at least 25 node pages, got ${nodePages}`);
if (mathPages < 10)
  errors.push(
    `Expected mathematical rendering on multiple pages, got ${mathPages}`,
  );
for (const route of [
  "index.html",
  "graph/index.html",
  "index/index.html",
  "timeline/index.html",
  "404.html",
])
  if (!files.includes(path.join(root, route)))
    errors.push(`Missing route: ${route}`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  `Static QA passed: ${html.length} pages, ${nodePages} mathematical objects, ${mathPages} pages with KaTeX, ${links} internal links/assets checked.`,
);
