import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { unified } from "@astrojs/markdown-remark";

export default defineConfig({
  site: "https://alequisGS.github.io",
  base: "/math-overlod",
  output: "static",
  trailingSlash: "always",
  integrations: [mdx()],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [[rehypeKatex, { strict: "error", throwOnError: true }]],
    }),
  },
});
