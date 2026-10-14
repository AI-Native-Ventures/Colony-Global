import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const requiredAnchors = [
  "b553fe392433da46762a7b34d2f9c3b81f47b5da",
  "44971c3b472274e3a070a1e2e6031c248c10183d",
];

function filesUnder(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(filename) : [filename];
  });
}

/** Return policy violations for the shipped source tree. */
export function checkColonyGlobalSource(root) {
  const errors = [];
  const workflows = filesUnder(path.join(root, ".github", "workflows"))
    .map((filename) => path.relative(path.join(root, ".github", "workflows"), filename))
    .sort();
  if (JSON.stringify(workflows) !== JSON.stringify(["ci.yml"])) {
    errors.push(`Expected only ci.yml under .github/workflows; found ${workflows.join(", ") || "none"}`);
  }

  const license = path.join(root, "LICENSE");
  if (!fs.existsSync(license) || !fs.readFileSync(license, "utf8").includes("Apache License")) {
    errors.push("The Apache LICENSE is missing");
  }
  const provenance = path.join(root, "SOURCE-PROVENANCE.md");
  const provenanceText = fs.existsSync(provenance) ? fs.readFileSync(provenance, "utf8") : "";
  for (const anchor of requiredAnchors) {
    if (!provenanceText.includes(anchor)) errors.push(`Missing source anchor ${anchor}`);
  }

  const rendererSource = path.join(root, "desktop", "scripts", "electron-renderer-source.mjs");
  if (!fs.existsSync(rendererSource) ||
      !fs.readFileSync(rendererSource, "utf8").includes('path.join(repositoryRoot, "app", "dist")')) {
    errors.push("Electron must stage app/dist as its renderer");
  }

  for (const filename of filesUnder(path.join(root, "app", "src"))) {
    if (!/\.[cm]?[jt]sx?$/u.test(filename)) continue;
    const source = fs.readFileSync(filename, "utf8");
    if (/from\s*["'][^"']*(?:design-reference|desktop\/src|\/fixtures?\/|\/mocks?\/)/u.test(source) ||
        /import\s*\(["'][^"']*(?:design-reference|desktop\/src|\/fixtures?\/|\/mocks?\/)/u.test(source)) {
      errors.push(`Production app imports reference or mock source: ${path.relative(root, filename)}`);
    }
  }
  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const errors = checkColonyGlobalSource(root);
  if (errors.length) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
  } else {
    console.log("Colony Global source boundary verified");
  }
}
