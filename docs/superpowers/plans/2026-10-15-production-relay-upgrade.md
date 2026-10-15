# Colony Global production relay upgrade implementation plan

> **For agentic workers:** Execute this plan in the dedicated `codex/production-upgrade-prep` worktree. Keep production unchanged until the owner reviews the exact commit and a separate live-deploy decision is recorded.

**Goal:** Prepare the existing `colony-relay` service for Colony Global without interrupting old relay writes during migration, and make the release path reviewable before deployment.

**Architecture:** Use expand-compatible SQL migrations, a disposable Postgres rehearsal seeded with pre-upgrade account and payment rows, and a manual-only production workflow. The first release leaves credits and Stripe off; live Scout inference and billing activation are later gates.

**Tech Stack:** PostgreSQL 16, SQLx migration files, Rust relay, Docker/GHCR, Fly Machines, GitHub Actions.

---

## Baseline and scope

Read-only inspection on 15 October 2026 found `colony-relay` healthy on image `sha-c9315a6ec48775611a0d87a720d89e4206974587`. That source ends at migration `0053`; versions `0001`–`0053` are unchanged in the new source anchor. The actual production database migration ledger has not been inspected. The new engine adds `0054` through `0059`; the deployed relay returns 404 for `/api/credits-gateway/capabilities`, while `/api/payments/packs` reports disabled PayFast. The new public repository has no production Actions secrets or protected environment. No production state is changed by this phase.

The current repo design started with one CI workflow and no automatic deployment. A **manual-only** workflow is appropriate now that the new app has an installed canary; it must never run on push or pull request. The workspace/channel data model in `VISION.md` and multi-tenant boundary in `VISION_SOVEREIGN.md` stay intact. Backend tables and historical data are preserved.

## File map

- `migrations/0054_stripe_credit_checkout.sql`: retain the old PayFast amount column while adding the new currency-neutral one; synchronize inserts from both binary versions.
- `migrations/0058_pending_email_sign_in_codes.sql`: populate the new email column when the old binary inserts an account code.
- `scripts/rehearse-production-upgrade.sh` and `scripts/production-upgrade-*.sql`: apply the deployed migration set, seed old rows, apply the new migrations, and assert old/new writes and preserved data in a disposable database.
- `.github/workflows/ci.yml`: run the migration rehearsal as a required service-backed lane and build the production relay image before release.
- `.github/workflows/deploy-production.yml`: manual dry run and guarded live release from a green default-branch commit, with a fresh verified database snapshot before Fly's release command.
- `scripts/check-colony-global-source.mjs` and its test: permit only the new manual workflow in addition to CI.
- `deploy/fly/PRODUCTION-UPGRADE.md`: exact staged rollout, missing credentials, activation gates, verification, and rollback limits.

## Acceptance gates

1. The rehearsal starts from the deployed `0053` schema with representative PayFast, account-code, outbox, and test-mail rows. After `0054`–`0059`, the old-style inserts still work, the new-style inserts work, and existing values survive. The test must fail against the current rename/non-null migrations before the compatibility changes.
2. The production workflow is `workflow_dispatch` only, defaults to a no-secret dry run, and refuses a live run without the reviewed exact SHA, a green CI run for that SHA, a migration rehearsal record, the expected currently deployed image, and a deliberate confirmation phrase. It checks production environment protection and required secret **names** without printing values.
3. The live path builds an immutable image, verifies the current image, creates and waits for a new Postgres volume snapshot, deploys with the release command, and checks image identity, health, NIP-11, and passwordless-route presence. Every failure reports the previous image and snapshot; database restore remains a separate reviewed operation.
4. The first release keeps credits and Stripe disabled. A real Scout turn requires a later gateway/Stripe activation, funded test account, installed-app connection, and observed signed reply and proposal. Green CI, image deploy, and provider proof remain distinct.

## Execution sequence

- [x] Add a disposable upgrade rehearsal and observe it fail on an old-style payment write after the current migrations.
- [x] Expand migrations `0054` and `0058` to preserve both binary versions' insert contracts, then pass the same rehearsal.
- [x] Add the manual workflow and source-boundary tests. Validate workflow parsing and local dry-run config assertions without Fly access.
- [ ] Document production prerequisites and rollback limits. Run focused checks, commit with DCO signoff, open a draft PR, and require exact-head CI green before asking for live deployment approval.

## Remaining live-release prerequisites

The owner must configure protected `production` environment review and the new repository's Fly tokens through their normal secret-management process. Before a live dispatch, rehearse against a restored production snapshot and record the result, identify the current image, and take a fresh verified snapshot. The first code rollout should happen in a controlled window because code rollback cannot undo new accounts or partner-role state created after deployment. No payment or provider credentials are needed for the first code-only release.
