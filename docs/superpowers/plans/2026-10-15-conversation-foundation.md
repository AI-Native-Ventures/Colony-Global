# Conversation foundation implementation plan

> **For agentic workers:** Implement each checked step in order in this session. Use signed commits and keep the production renderer independent of prototype fixtures.

**Goal:** Open a real company conversation, send a message, and discuss a message in a side panel using the retained relay.

**Architecture:** Account discovery stays on the deployment relay. After company selection, the native host applies that company's relay as its active workspace and verifies the signer. A small typed client validates channel and signed event responses. The renderer shows only relay-backed records and labels unavailable capabilities honestly.

**Tech Stack:** React 19, TypeScript, Tauri native IPC via Electron, Nostr signed events, Playwright browser contract tests.

---

### Task 1: Pin account and company scope

**Files:** `desktop/src-tauri/src/commands/identity.rs`, `desktop/src-tauri/src/lib.rs`, `app/src/bridge.ts`, `app/src/App.tsx`, `app/tests/shell.mjs`.

- [x] Add `get_default_relay_http_url` alongside `get_default_relay_url`; it returns the configured deployment HTTP API base without reading a company workspace override.
- [x] Use the default deployment WebSocket and HTTP addresses for account discovery. After selecting a company, call `apply_workspace` with `wss://<validated company host>`, then require `get_active_workspace` to report that relay and the signed-in pubkey before showing company content.
- [x] Add browser cases for company-scope activation, failure/retry, and a returning account after a renderer restart while the native override remains active.

### Task 2: Typed conversation relay client

**Files:** `app/src/conversationClient.ts`, `app/tests/shell.mjs`.

- [x] Parse and bound `get_channels`, `get_channel_window`, `get_thread_replies`, `get_channel_members`, and send responses; reject malformed shape, wrong channel IDs, unsigned/tampered events, and a changed active workspace.
- [x] Send top-level messages and thread replies through `send_channel_message` with captured `expectedRelayUrl` and `expectedSignerPubkey`; retain the draft and require a person to inspect a fresh relay read before retrying an uncertain send.
- [x] Add focused browser cases that mutate production responses and prove the UI cannot display cross-company or unsigned content.

### Task 3: Production conversation screens

**Files:** `app/src/Conversations.tsx`, `app/src/styles.css`, `app/src/App.tsx`, `app/tests/shell.mjs`.

- [x] Render the selected company's open conversations from `get_channels`; allow a person to create a private stream topic through scoped `create_channel` and refresh the server list.
- [x] Render the selected conversation's real top-level messages and channel members. Provide a composer with Enter to send and Shift+Enter for a new line. Keep the draft on failed sends.
- [x] Open a message's replies in a side panel, fetch them by channel and root ID, and send a reply there. Restore focus to the opening message when closing the panel.
- [x] Show loading, empty, connection/error, and retry states without inventing Scout replies or agent status.

### Task 4: Gate and publish for review

**Files:** `docs/production-coverage.md`, `app/tests/shell.mjs`.

- [x] Update the coverage ledger to distinguish real conversation paths from workspace/media and Scout execution still outstanding.
- [x] Run focused app lint, typecheck, build, and browser tests; correct failures.
- [ ] Commit with `git commit -s`, push the new branch, open a stacked PR against `codex/power-credits`, attach it to this task, and require all CI lanes green for that exact SHA. Do not claim installed app or live provider proof from CI.
