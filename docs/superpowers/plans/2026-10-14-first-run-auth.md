# First-run email sign-in implementation plan

> For agentic workers: implement the tasks in order, checking each production seam before moving on. This phase runs inline in the current task; the owner has already authorized the rebuild.

**Goal:** A new or returning person can sign in with a six-digit email code in the shipped Colony Global app, reopen the app into the same account, and recover from service and code failures.

**Architecture:** Keep the relay account service and the native identity store as the authorities. The new renderer uses a small typed client for the account and join-policy endpoints, imports the returned identity through the existing native command, and chooses first-run or the workroom from a signed account lookup on startup. No prototype fixture state enters the shipped app.

**Tech stack:** React 19, Vite, Electron native bridge, existing Rust account routes, Playwright browser tests, GitHub Actions.

---

## Product and proof boundary

The O-01 and O-02 design screens are the visual contract. The relay's `/api/accounts/code/start` and `/api/accounts/code/verify` handlers already test new and returning accounts, code guessing, and cooldowns against Postgres and Redis. `import_identity` owns local persistence. A browser test can prove that the shipped renderer calls those seams correctly, but it cannot prove that a real email was delivered or an installed app reopened; those are later runtime gates.

The phase passes when required CI is green for the exact feature SHA and its browser tests cover first and returning sign-in, signed session restore, wrong/expired code, cooldown, offline/unreachable relay, native import failure, and retry. A signed-in user may still see honest unavailable states for Today and other unwired screens.

## Task 1: Type the native and relay boundary

**Files:** `app/src/bridge.ts`, `app/src/accountClient.ts`, `app/tests/shell.mjs`.

- [ ] Add native `invoke` helpers for relay URLs, identity, signing, import, and join policy. Reject missing, malformed, or mismatched responses.
- [ ] Add a bounded account HTTP client with a 15-second timeout, HTTPS except loopback HTTP, stable error codes, one-shot POSTs, and signed `GET /api/accounts/me` using the native signer.
- [ ] Verify in browser tests that no response secret enters rendered text or persistent web storage.

## Task 2: Route startup through account authority

**Files:** `app/src/App.tsx`, `app/src/FirstRun.tsx`, `app/src/styles.css`, `app/tests/shell.mjs`.

- [ ] After the host responds, fetch the current account with a signed request. Show O-01 on `account_not_found`, the workroom on a matching account, and a recoverable service state on transport or host failure.
- [ ] Implement O-01/O-02 from the approved simple design: email, current join policy, age attestation when required, six-digit code, resend cooldown, change email, and contextual errors.
- [ ] On verification, import the relay-returned identity through the native host, compare pubkeys, clear the response secret, and advance only after import succeeds.

## Task 3: Expand the required app gate

**Files:** `app/tests/shell.mjs`, `.github/workflows/ci.yml`, `README.md`.

- [ ] Drive the shipped renderer with a controlled native bridge and account HTTP responses. Exercise both successful paths and the failure/retry paths above through visible controls.
- [ ] Run focused lint, typecheck, production build, and the browser test locally. Push the signed branch and wait for every required GitHub CI lane at the exact SHA.
- [ ] Record CI evidence and remaining unproven installed/email-delivery behavior. Do not call the full Colony product usable from this phase.

## Later phases

1. **Company entry:** create or rejoin the company and persist the owner's business profile through the retained engine, then finish the remaining first-run steps, Google sign-in and partner invites. Gate on a new owner reaching their company and a returning owner rejoining the same company without fixture state.
2. **Conversations:** real channel list and timeline, side-panel message/card threads, and conversation-level files, links, images, videos, and browser references; gate on permissions, reload, offline, and retries.
3. **Team and work:** Today, Team, ant desks, decisions, and remaining cards; gate on real records, employee actions, and failure recovery.
4. **Settings and operations:** account, people, plans, credits, notifications, and remaining system states; gate on persisted changes and permission boundaries.
5. **Runtime and launch:** native packages, installed-device first run, email delivery, employee execution, billing, deployment, and live-use proof. Each is a separate gate.
