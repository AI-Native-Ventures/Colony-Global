# Colony Global repository and CI design

- Date: 14 October 2026
- Decision: approved direction from the owner on 14 October 2026
- Destination: public `AI-Native-Ventures/Colony-Global`, created with the `nocodeafrica` GitHub identity
- Source anchors: Colony 2.0 canary `b553fe392433da46762a7b34d2f9c3b81f47b5da`; approved visual prototype `design/colony-os` at `44971c3b472274e3a070a1e2e6031c248c10183d`

## Product boundary

Colony Global is a new desktop product repository. It reuses Colony 2.0's relay, account, company, conversation, media, credits, agent harness, and native employee host as its engine. Its shipped window uses a new interface package built from the approved Colony OS design source. The work area stays white in light mode, the sidebar uses the approved rose, lilac and blue blend, and every AI employee remains an ant. Conversations keep channel timelines, message and card threads open beside them, and media, files, links and browser references belong to the conversation workspace. The approved first-run, Today, Team, desks, cards, Settings, system states and outside-app pages remain the screen contract.

The prototype supplies presentational components, assets, screen IDs and visual checks. Its fixture store must not become a production data source. The canary branch supplies partial production integrations, including email-code sign-in, shared business profile, conversations, People, Team and partner permissions. Those integrations are copied only after their production seams and dependencies are identified. The old renderer is retained temporarily as an internal reference while the new window is wired. It is not reachable from the shipped navigation; remove it after the replacement workflows have passed their gates. Preserve backend capabilities and stored data until a separate dependency and migration audit supports removal.

## Repository boundary

Create a new public repository with a fresh Git history and a recorded source-provenance document. Transfer tracked source from the canary source anchor, then add the approved prototype's source, bundled assets, registry and design documentation from its source anchor. Keep the existing Apache license, copyright notices and third-party asset licenses. Exclude generated PNG exports, build output, `node_modules`, local account files, credentials and untracked workspace state. Remove the 42 inherited workflows, release automation and deployment triggers before the first push. The new repository starts with one reviewable CI workflow and no automatic deployment.

Keep the engine's current crate and native-host paths initially so known code and data contracts remain intact. Add a separate production app package with an explicit typed bridge to the host and relay. Its entry point must not load the old desktop renderer or prototype fixtures. Electron loads the new app after the host bridge is ready; a failed host connection produces a recoverable product state rather than silently showing mock data. The source snapshot is a migration base, not evidence that the rebuilt app is complete.

## CI and proof gates

The new CI runs on pull requests and pushes to the new default branch with read-only permissions and no production secrets. Its required lanes are:

1. **App contract:** install from a lockfile, typecheck, lint, build the new app, and run focused browser tests for the shipped shell, keyboard access, honest unavailable states and failure recovery. Add first-run, conversation threads and workspace, Team and Settings tests to this required lane as those production workflows become active. Design-prototype checks may run as reference checks but never count as production behavior proof.
2. **Engine contract:** format, compile and run focused Rust tests for the retained account, company, conversation, profile, partner-permission and employee-control paths. The database-backed lane uses disposable Postgres and Redis and tests the same handlers the app calls as each workflow is connected.
3. **Native contract:** compile the native host and exercise the typed Electron-to-host bridge, including startup failure and restart behavior. Packaging and installed runtime are later gates, reported separately.
4. **Security and repository hygiene:** scan the active dependency set and source for credentials, verify source/license inventory and ensure legacy workflows or deployment triggers have not returned. The existing `unsafe-libyaml` advisory must be resolved or a genuine replacement adopted before this lane is called green; a new repo does not erase the dependency risk.

Each lane reports the exact commit SHA it checked. A failing or skipped required lane is a failed gate. Tests against fixtures, a green source build, packaged installation, deployed services and customer use are distinct claims. Product flows that are not yet implemented stay visibly unavailable and are recorded in the screen and engine coverage ledger. CI expands with each production slice so no newly active flow is left covered only by the old E2E suite.

## First phase acceptance

The bootstrap phase passes when `AI-Native-Ventures/Colony-Global` exists publicly, the two source anchors and licenses are recorded, the new app package is the only shipped UI entry, inherited workflows cannot run, and the new required CI reports green for its exact head SHA. At that point Colony Global is a working repository and build foundation, not a fully usable product. Any screen without a wired production path is visibly unavailable. The next phase wires the approved first-run and conversation workflows to real services and adds required CI cases for their success, permission, offline and retry paths. Later gates cover employee execution, billing, native packaging, deployment and live use.
