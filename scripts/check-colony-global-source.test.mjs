import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { checkColonyGlobalSource } from "./check-colony-global-source.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "colony-source-policy-"));

after(() => fs.rmSync(fixture, { recursive: true, force: true }));

function write(relative, contents) {
  const filename = path.join(fixture, relative);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, contents);
}

test("current source stays within the new repository boundary", () => {
  assert.deepEqual(checkColonyGlobalSource(repo), []);
});

test("checker catches inherited workflows, fixtures and old renderer", () => {
  write(".github/workflows/ci.yml", "name: CI\n");
  write(".github/workflows/deploy-production.yml", "on:\n  workflow_dispatch:\n");
  write(".github/workflows/release.yml", "name: Old release\n");
  write("LICENSE", "Apache License\n");
  write("SOURCE-PROVENANCE.md", "b553fe392433da46762a7b34d2f9c3b81f47b5da 44971c3b472274e3a070a1e2e6031c248c10183d");
  write("desktop/scripts/electron-renderer-source.mjs", 'path.join(repositoryRoot, "desktop", "dist")');
  write("app/src/Bad.ts", 'import data from "../../design-reference/colony-os/src/data/fixtures";');
  const errors = checkColonyGlobalSource(fixture).join("\n");
  assert.match(errors, /only ci.yml and deploy-production.yml/u);
  assert.match(errors, /stage app\/dist/u);
  assert.match(errors, /imports reference or mock source/u);
});

test("checker rejects automatic production deployment triggers", () => {
  write(".github/workflows/deploy-production.yml", "on:\n  workflow_dispatch:\n  push:\n");
  assert.match(checkColonyGlobalSource(fixture).join("\n"), /workflow_dispatch only/u);
  write(".github/workflows/deploy-production.yml", "on:\n  workflow_dispatch:\n  workflow_call:\n");
  assert.match(checkColonyGlobalSource(fixture).join("\n"), /workflow_dispatch only/u);
});
