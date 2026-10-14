# Colony Global Bootstrap Implementation Plan

> **For agentic workers:** Implement this plan inline, task by task, with a proof checkpoint after each task. Do not merge or deploy. Use the exact source anchors in the approved [repository design](../specs/2026-10-14-colony-global-rebuild-repository-design.md).

**Goal:** Create public `AI-Native-Ventures/Colony-Global` with a clean source snapshot, the approved UI's production shell, and a new CI gate that checks the actual rebuild at its exact commit.

**Architecture:** Preserve the Colony 2.0 relay and native host, but put the new React renderer in `app/`. The old `desktop/src` remains reference code until its dependencies are retired. Electron's package step stages `app/dist` as its sole renderer. One new workflow replaces all inherited workflows and never deploys.

**Tech Stack:** Rust, Postgres, Redis, Electron, React 19, TypeScript, Vite, Playwright, GitHub Actions.

---

## Phase gate and ownership

The first phase is complete only when the public repo exists under the requested owner, the exact source anchors and licenses are visible, old workflows cannot run, the new renderer is the shipped entry, and every required new CI job is green at the pushed SHA. A prototype pass, local test, draft PR, package build, provider return, deployment and live use are separate evidence. Do not present this phase as a fully usable product.

Run Git commands after `. ./bin/activate-hermit`. Commit with `git commit -s`. Use `GH_TOKEN="$(gh auth token --hostname github.com --user nocodeafrica)"` for each GitHub operation; never print or embed the token in a URL. Do not push the existing canary branch or merge PR #301 as part of this plan.

## Task 1: Create a clean local snapshot

**Files:** Create `/Users/mac/Desktop/Billion/Colony-Global/`; import the tracked source at `b553fe392433da46762a7b34d2f9c3b81f47b5da`. Create `SOURCE-PROVENANCE.md` and `.gitignore`. Preserve `LICENSE` and the bundled font/asset license files.

- [ ] **Step 1: Verify the sources.** From `/Users/mac/.codex/worktrees/colony-ui-canary/Colony-3`, activate Hermit and assert the canary anchor exists with `git cat-file -e b553fe392433da46762a7b34d2f9c3b81f47b5da^{commit}`. From `/Users/mac/Desktop/Billion/Colony-3`, assert `git rev-parse HEAD` is `44971c3b472274e3a070a1e2e6031c248c10183d` and the design prototype contains `src/data/screen-registry.json`.
- [ ] **Step 2: Export only tracked source.** Make the destination, then run `git archive b553fe392433da46762a7b34d2f9c3b81f47b5da | tar -x -C /Users/mac/Desktop/Billion/Colony-Global` from the canary checkout. The archive is the tracked snapshot and cannot include local `.env`, `node_modules`, credentials or untracked files.
- [ ] **Step 3: Remove inherited automation before the first push.** Delete the imported `.github/workflows/*.yml` and `.github/workflows/*.yaml`; leave `.github/workflows/` for the new file. Inspect `.github` for any non-workflow event triggers and remove those too. Confirm `rg --files --hidden .github/workflows` returns no files.
- [ ] **Step 4: Record provenance.** Write `SOURCE-PROVENANCE.md` with the canary and design SHAs, original repository URLs, the Apache license and a statement that the design's mock data is reference-only. Verify both source commits and `LICENSE` are named. Do not claim native or live proof.
- [ ] **Step 5: Preserve the approved visual source without generated outputs.** Copy `design/colony-os/prototype/src`, `public`, `index.html`, `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`, plus `design/colony-os/README.md` and `COVERAGE.md` from the design checkout into `design-reference/colony-os/`. Exclude `png/`, `node_modules/`, `dist/` and Playwright output. The reference build must still run independently.
- [ ] **Step 6: Copy the approved spec and this plan** into `docs/superpowers/` of the new repo. Initialize Git with `git init -b main`, verify `git status --short`, run `git diff --check`, then make a signed source-snapshot commit. Expected: a clean `main` checkout with a fresh root commit and no inherited workflow.

## Task 2: Build the new production shell

**Files:** Create `app/package.json`, `app/package-lock.json`, `app/index.html`, `app/tsconfig.json`, `app/vite.config.ts`, `app/src/main.tsx`, `app/src/App.tsx`, `app/src/ColonyShell.tsx`, `app/src/styles.css`, `app/src/bridge.ts`, `app/public/assets/ant-portraits.png`, `app/public/assets/manrope-variable-latin.woff2`, `app/public/assets/OFL-Manrope.txt`, and `app/tests/shell.spec.ts`. Modify `SOURCE-PROVENANCE.md` for extracted design source.

- [ ] **Step 1: Write a browser test that fails before the shell exists.** `app/tests/shell.spec.ts` must open the built app at 1440 x 900 and 1024 x 700, assert a white main work area and gradient sidebar, the Colony ant mark and Scout ant portrait, keyboard access to the available Today entry, no old Buzz navigation, and a visible unavailable state on each unwired destination. It must assert no horizontal overflow at 1024 x 700. Run `npx playwright test tests/shell.spec.ts` from `app/` and observe the missing-app failure.
- [ ] **Step 2: Make the app package from the approved design source.** Start from the design prototype's React/Vite package versions and lockfile. Extract visual primitives and shell styles into focused production files without importing `data/mock-store`, fixture modules or the prototype `App.tsx`. Keep the approved white canvas, blended sidebar, Manrope, ant art and responsive widths. The app route state represents availability, not simulated business data.
- [ ] **Step 3: Add a typed host boundary.** `app/src/bridge.ts` exposes only explicit operations the shell needs, beginning with `getDefaultRelayUrl(): Promise<string>`, implemented through `window.colonyDesktop.request("invoke", { command: "get_default_relay_url", args: {} })`. A missing bridge, an empty URL or a rejected request yields a recoverable connection state. No product screen substitutes prototype fixtures when the host fails.
- [ ] **Step 4: Run `npm ci`, `npm run build`, and the focused Playwright shell test** from `app/`. Inspect a 1440 x 900 and 1024 x 700 screenshot against the approved design. Verify `rg 'mock-store|data/fixtures|design-reference' app/src` is empty. Commit the production shell with signoff.

## Task 3: Make Electron package only the new app

**Files:** Modify `desktop/scripts/electron-package.mjs` and its production build entry; create or modify `desktop/scripts/electron-renderer-source.test.mjs`; retain `desktop/electron/runtime-paths.mjs` unless a tested change is necessary.

- [ ] **Step 1: Write a failing package-source test** asserting the renderer staged by `electron-package.mjs` comes from `app/dist/index.html`, not the old `desktop/dist`, and that missing `app/dist` fails clearly. Run the focused Node test and observe failure.
- [ ] **Step 2: Make packaging stage the new renderer.** Keep Electron's existing `dist` path *inside the packaged desktop directory* for compatibility, but set the source path to `path.join(repo, "app", "dist")`. Keep the existing native host, preload, CSP and single-instance behavior. For local development, add a documented command that builds `app/` and points Electron at its Vite URL; do not run the old desktop build as a production step.
- [ ] **Step 3: Run the focused package-source test and existing `runtime-paths` and `renderer-host` Node tests.** Inspect the staged `index.html` and confirm its script comes from the new app build. Do not call this an installed-app proof. Commit with signoff.

## Task 4: Replace CI with rebuild checks

**Files:** Create `.github/workflows/ci.yml`; create `scripts/check-colony-global-source.mjs` with a matching focused Node test; update `app/package.json` scripts. Modify dependency manifests or active YAML parser code only as needed to resolve the existing `unsafe-libyaml` advisory.

- [ ] **Step 1: Write the source-policy test.** It fails if more than the new `ci.yml` exists under `.github/workflows`, if `app/src` imports design fixtures or `desktop/src`, if the package source points to `desktop/dist`, or if `LICENSE` and `SOURCE-PROVENANCE.md` are absent. Run it and see the missing-checker failure.
- [ ] **Step 2: Implement the source-policy checker** as a small Node script over explicit paths and import patterns. Run its test against a deliberately bad temporary fixture and the clean tree so the check is falsifiable.
- [ ] **Step 3: Add one GitHub Actions workflow with required `source`, `app`, `engine`, `native`, and `security` jobs.** Set `permissions: { contents: read }`; trigger on `pull_request` and `push` to `main`; pin third-party actions to immutable SHAs. `app` runs `npm ci`, typecheck/build and Playwright against `app/`. `engine` runs focused Cargo and disposable Postgres/Redis handler tests. `native` checks the host and typed bridge. `security` runs the active dependency policy with no advisory suppression added for `unsafe-libyaml`. Upload browser traces on failure. Each job prints `github.sha`.
- [ ] **Step 4: Resolve the existing YAML advisory in production dependencies.** Identify each active `serde_yaml` use, choose a maintained API-compatible replacement from its official crate documentation, migrate the callers and lockfiles, then run focused parse and error-path tests. Do not turn the advisory into an ignore rule or quietly drop the security job. Record the chosen crate and evidence in the PR description.
- [ ] **Step 5: Run quick local checks only:** workflow syntax parse, source-policy test, app build and focused Playwright, changed Rust formatting and target-specific test discovery. The exact pushed GitHub SHA is the CI gate. Commit with signoff.

## Task 5: Publish and verify the exact head

**Files:** New GitHub repository `AI-Native-Ventures/Colony-Global`; local Git remote `origin`. No deploy configuration or secrets.

- [ ] **Step 1: Confirm the repo name is available** with the pinned `nocodeafrica` token. Create it public, without a template, README or imported workflows: `GH_TOKEN="$(gh auth token --hostname github.com --user nocodeafrica)" GH_PROMPT_DISABLED=1 gh repo create AI-Native-Ventures/Colony-Global --public --description "Colony Global desktop app and company engine"`.
- [ ] **Step 2: Add the HTTPS remote and push `main` with the pinned identity.** Use `GH_TOKEN="$(gh auth token --hostname github.com --user nocodeafrica)" git -c credential.helper='!gh auth git-credential' push -u origin main`. Verify the remote SHA equals local `git rev-parse HEAD`; never print the token.
- [ ] **Step 3: Wait for every new CI job on that exact SHA.** Read failures, fix production code or CI setup, signed-commit and push again, then recheck the new exact SHA. Do not report the repo bootstrap complete while any required job is failed, skipped, cancelled or pending.
- [ ] **Step 4: Capture the proof ledger:** public repo URL, source/prototype SHAs, clean-history initial commit, active workflow list, exact green CI run and SHA, screenshots and local build evidence, plus explicit unproven account, relay, employee, payment, package and live gates. The old canary PR remains a source reference until the new repo proves its first production flow.

## Plan self-review

- The design's new public repo, reused engine, separate new UI, ant identity, visible-excess-first rule and new CI all have explicit tasks.
- The first phase tests an honest shell and active contracts. It does not claim unimplemented flows are usable or count prototype fixtures as production proof.
- The `unsafe-libyaml` dependency issue remains a blocking security task, not an ignored legacy failure.
