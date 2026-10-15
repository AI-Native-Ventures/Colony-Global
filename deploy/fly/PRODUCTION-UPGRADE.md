# Colony Global production relay upgrade

This is the review record for upgrading the existing `colony-relay` Fly app. The
first release introduces Colony Global's account-code and credits-gateway code
while keeping paid inference and checkout disabled. It does not prove a live
Scout turn. The GitHub workflow is manual only and defaults to a dry run.

## Current baseline and first-release scope

Read-only inspection on 15 October 2026 found the relay deployed and healthy on
`sha-c9315a6ec48775611a0d87a720d89e4206974587`. That image's source ends
at migration `0053`; its current database migration ledger has not been read.
The app currently reports payment packs disabled and has no credits
gateway capability route. Its Fly configuration uses a SQLx release command,
one relay data volume, and a separate `colony-db-prod-iad` Postgres volume.
Confirm all of these again immediately before dispatch; they are live facts
that can change.

The first release adds migrations `0054` through `0059`, including passwordless
email-code sign-in, partner roles, the durable AI-request journal, and Stripe
schema. `COLONY_CREDITS_GATEWAY=0` and `COLONY_PAYMENTS_ENABLED=false` in
`fly.prod.toml`. The workflow rejects Fly secrets that could override either
flag or activate the upstream/Stripe path. The existing PayFast amount column
and old account-code insert shape remain usable while the previous binary is
still serving during Fly's release migration.

## Preparation gate

1. Review and merge the source PRs in order: Scout, installed canary package,
   then production-upgrade preparation. Require green CI for the exact merge
   commit. The migration CI lane rehearses a `0053` database with representative
   account, mail, and PayFast records, and exercises both old and new inserts.
   The image lane builds `runtime-prod` without publishing it.
2. Restore a fresh **production database snapshot into an isolated test
   instance**, using the operator's normal Fly/Postgres restore procedure. Do
   not point the rehearsal script at production: it deliberately accepts only
   an empty local `colony_global_rehearsal_*` database. In the isolated restored
   instance, confirm the `0053` starting version, apply `0054`–`0059` with the
   candidate `buzz-admin migrate`, and exercise existing sign-in/PayFast reads
   and writes plus new sign-in-code writes. Record the source snapshot ID,
   candidate SHA, migration result, checks, and reviewer in a non-secret issue
   or CI record. A disposable schema rehearsal is not a production-data
   rehearsal.
3. Configure the new repository's protected `production` GitHub environment
   with required reviewers and the two environment secrets
   `FLY_API_TOKEN_PROD` and `FLY_DB_API_TOKEN_PROD`. Use scoped Fly tokens from
   the owner's secret manager. Never copy token values into the repository,
   workflow inputs, comments, or logs. The workflow checks for the expected
   Fly *secret names* and does not read their values.
4. Run the manual workflow on the exact default-branch commit with `dry_run`
   selected. Review its source-only plan, the candidate SHA, current Fly image,
   and the isolated snapshot rehearsal record. A dry run does not access Fly,
   GHCR, or production secrets.

## Reviewed release gate

For a separate owner-approved live run, choose the same default-branch commit,
set `dry_run=false`, enter the explicit confirmation phrase, and supply:

- the successful `push` CI run ID for that **exact SHA**;
- the non-secret production-snapshot rehearsal record;
- the currently deployed Fly image tag in `sha-<40 hex>` form.

The workflow refuses a non-default branch, a different or unsuccessful CI SHA,
an unprotected environment, a changed current image, a missing relay volume or
required secret name, or a credit/Stripe activation secret. It builds and pushes
an immutable GHCR image, copies it to Fly's registry, rechecks the current
image, creates a fresh Postgres volume snapshot and waits for its `created`
status, then performs a rolling deploy with the SQLx release command. It checks
the new image and readiness, `/health`, NIP-11, the passwordless-code route,
the disabled credits capability, and disabled payment packs. The run summary
records the pre-release image and snapshot for recovery. A failed verification
requires operator assessment; the workflow does not automatically restore data.

## After the first code release

The first live gate proves only code and the disabled service boundaries.
Enabling the credits upstream or Stripe requires its own security, funding,
pricing, and fault-injection review. A funded Scout turn must then be observed
through the installed app against the live relay before claiming real product
usability. Keep rollback scoped to code unless a separate data-restoration
decision accounts for accounts and partner activity created since deployment.
