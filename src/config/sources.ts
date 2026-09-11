/** Public working sources. No credential is required by the importer. */
export const researchSources = {
  papers: {
    provider: "github" as const,
    owner: "alequisGS",
    repo: "alequisGS.github.io",
    branch: "main",
    root: "ArXiv",
    entrypoint: "main.tex",
  },
};
