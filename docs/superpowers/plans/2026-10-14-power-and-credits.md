# Power and credits first run implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the approved O-04 power choice and O-05 Stripe credit purchase usable in the shipped app, with the real server balance and a recoverable payment state.

**Architecture:** A small signed account-payments client reads native and relay capability, server-priced packs, account intent history and the confirmed ledger. A power screen reuses the approved first-run layout and keeps payment state recoverable from the server after a restart. O-06 own-plan connection is a separate native-runtime phase; the app must identify it as unavailable until that path is wired.

**Tech Stack:** React 19, TypeScript, native Electron-to-Tauri bridge, signed NIP-98 HTTP, Stripe-hosted checkout, Node/Playwright browser cases, Rust relay integration tests.

---

## Contract and acceptance gate

The approved screens are `design-reference/colony-os/prototype/src/screens/FirstRunPower.tsx` and O-04/O-05 in `docs/superpowers/specs/2026-10-11-colony-os-screens/02-first-run.md`. The retained service owns prices and payment truth. Never read prototype fixtures in `app/`. Never call a pending Stripe intent paid, invent a `$50` balance, open a non-HTTPS checkout URL, or offer a paid path while the native flag, relay gateway, Stripe catalog or HTTPS customer terms are unavailable. A zero balance keeps Buy credits available. A successful top-up advances to O-07 only after the signed balance and intent agree; O-07 remains a separate implementation gate, so the interim screen must say that Scout setup is still being built.

The current payment ledger belongs to the owner's account, while the approved product calls it a company wallet. Treating one owner account as one company wallet is the interim E-15 contract and must be disclosed in the coverage ledger. Do not expose the owner's wallet to partners or imply separate wallets for multiple companies. `COLONY_CREDITS_GATEWAY` remains off by default; production activation, real Stripe payment, installed runtime and agent spend are separate gates.

The exact-head CI gate passes when the app, source, native, security and engine jobs are green. Browser cases must cover configured, unavailable and offline gateway states; server-priced pack selection; keyboard use; pending checkout, browser-open failure, reopen and copy; cancelled/failed/uncertain payment; restart recovery; paid intent with zero and positive ledger; malformed/untrusted URL; duplicate click and lost response. The engine lane must exercise the production payment router's signed checkout validation and duplicate Stripe webhook/ledger tests against disposable Postgres. No real charge occurs in CI.

## File map

- Create `app/src/creditsClient.ts`: bounded signed payments requests, strict response validation, capability gate, account snapshot, checkout and intent lookup.
- Create `app/src/PowerEntry.tsx`: O-04 and O-05 presentation and state machine, Stripe browser handoff, recovery and keyboard semantics.
- Modify `app/src/bridge.ts`: narrow, validated native helpers for the launch flag, external HTTPS checkout and copy link.
- Modify `app/src/App.tsx`: route an owner who finished O-03 into power setup; keep partner routes distinct.
- Modify `app/src/styles.css`: reuse first-run frame and approved simple white/gradient styling for the two screens at 1440×900 and 1024×700.
- Modify `app/tests/shell.mjs`: mock only the host, Stripe handoff and relay edge; inspect signed requests, payment recovery and displayed states.
- Modify `.github/workflows/ci.yml`: add the existing focused Stripe router tests to the engine lane.
- Modify `docs/production-coverage.md` and `README.md`: record the exact new surface and remaining E-15/E-16/E-17 and live proof limits.

### Task 1: Read a trustworthy credit capability and snapshot

- [ ] Add browser cases where the native flag is off; relay gateway is absent/disabled; Stripe packs are absent; terms are not HTTPS; balance is exactly zero; and a configured response has server-priced USD packs and signed history/balance requests. Run `npm run test:shell --prefix app` and confirm these cases fail at O-04 before implementation.
- [ ] Implement `readCreditsCapability()` to require `colony_credits_gateway_enabled === true`, `GET /api/credits-gateway/capabilities` with `{enabled:true,runtime:"colony",model:<nonempty>}`, and `GET /api/payments/packs` with `{enabled:true,provider:"stripe"}` plus valid HTTPS terms and acceptable-use URLs. Return a typed unavailable state for genuine unavailability; propagate a retryable error for a failed network or malformed response. Never infer availability from a mocked balance.
- [ ] Implement `readCreditSnapshot()` as signed `GET /api/payments/history` followed by signed `GET /api/payments/balance`, bound to one relay base and current account pubkey. Verify the returned balance is a nonnegative safe integer and the history is a bounded array of known statuses. Preserve exact zero. Run app lint, typecheck, production build and the focused browser cases.
- [ ] Commit the client and focused tests with `git commit -s` after the checks pass.

### Task 2: Render O-04 with a real choice

- [ ] Add an owner browser case that finishes O-03 and sees the approved O-04 text and ant portrait, plus a returning owner case with a confirmed positive balance. Add keyboard arrow/Enter and 1024×700 viewport checks. Confirm they fail before the route is installed.
- [ ] Route owner completion into `PowerEntry` with an account/company-scoped request generation fence; recheck capability on resume. Render the approved radio choices, explanation, back action and status in the existing first-run frame. Disable the Colony credits action when the gate is unavailable, with a plain reason and retry. Mark the own-plan choice as unavailable until O-06 is wired, with a visible alternative; never route it to a fake connection state.
- [ ] Run app lint, typecheck, production build and browser cases; commit the O-04 route, styles and tests with `git commit -s`.

### Task 3: Complete O-05 through Stripe-hosted checkout

- [ ] Add browser cases for the server's `$5/$15/$50/$120` packs; signed `POST /api/payments/checkout` with one UUID idempotency key; `checkout.stripe.com` HTTPS browser handoff; double click; failed browser open; pending and uncertain intent recovered after reload; paid intent confirmed by the ledger; invalid checkout URL; copy link; manual retry; and cancelled/failed checkout. Confirm the new cases fail before the flow is installed.
- [ ] Implement the O-05 radio pack list using `chargeMinorUnits` and `grantUsdCents` returned by the relay. Validate the checkout response's reference, status, matching pack and safe Stripe URL before calling `plugin:opener|open_url`. Preserve the idempotency key while an intent is open. Re-read `/api/payments/history` and `/balance` on restart and after a bounded poll; use `/api/payments/intents/{reference}` only for an owned open intent. Never treat browser return or a checkout response as payment proof.
- [ ] Preserve the waiting state's reopen and copy actions. A network failure keeps the intent/reference recoverable; a terminal failed/cancelled intent permits a fresh key. A confirmed paid intent plus positive signed balance leads to a truthful O-07 pending state. Run app lint, typecheck, build and focused browser cases; commit the O-05 flow with `git commit -s`.

### Task 4: Bind relay proof and review the gate

- [ ] Add the existing `stripe_checkout_http_rejects_unknown_and_payfast_packs_without_creating_an_intent` and `stripe_webhook_http_accepts_signed_duplicate_delivery_and_grants_exactly_once` tests to the engine CI lane. The exact command is `cargo test -p buzz-relay stripe_ --locked -- --ignored --test-threads=1` against its disposable Postgres service.
- [ ] Update the coverage ledger and README to state that O-04/O-05 run only with configured credits, while O-06, Scout execution, company-level budget enforcement, installed checkout, real Stripe delivery and live spending remain unproven. Run `git diff --check` and the source-boundary script, then commit with `git commit -s`.
- [ ] Push a `codex/` feature branch, open a stacked PR against `codex/company-entry`, and require all five GitHub CI jobs green on its exact head SHA. Correct any CI failure and rerun. Keep merge, production flag activation and a real charge as separate gates.

## Self-review

O-04 and O-05 actions, keyboard path, existing-balance, offline, waiting, retry, paid and problem states have tasks. O-06 is intentionally a separate native-runtime subsystem because its terminal-free installation, browser sign-in and paid-tier proof are not provided by the credits client. The interim O-07 state must remain visibly unfinished until Scout's real first turn is wired. No step assumes that a successful mock, CI run or checkout return proves a deployed payment or working employee.
