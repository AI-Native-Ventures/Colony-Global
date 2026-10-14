import path from "node:path";

/** Renderer build to stage inside the Electron archive. */
export function colonyRendererSource(repositoryRoot) {
  return path.join(repositoryRoot, "app", "dist");
}
