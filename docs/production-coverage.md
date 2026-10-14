# Colony Global production coverage

This ledger describes the **shipped `app/` renderer**, not the approved static design preview or the retained Colony 2.0 engine. A screen is active only when it uses a production data path. GitHub CI validates source behavior on an exact commit; installed, provider and live behavior need separate evidence.

| Approved surface | New app state | Engine and validation boundary | Still needed |
|---|---|---|---|
| O-01 welcome, O-02 email code | Email path wired to `POST /api/accounts/code/start` and `/verify`; the verified identity is imported through the native host. The current account is checked with a signed `GET /api/accounts/me` on launch. | App browser cases cover new and returning email, policy and age gate, cooldown, offline, wrong/expired code, host failure, import failure and session lookup. Engine CI runs the real passwordless handlers against disposable Postgres and Redis. | Google option from the approved O-01 screen; installed-app and real email-delivery proof. |
| O-03 to O-10 and partner P-01/P-01a | Unavailable in the shipped app. | Company, credits, agent and invite engine code is retained as migration source, not proof of a new-app flow. | Company creation/rejoin, business profile, power, Scout setup, team start and partner invitations. |
| N-01/N-02 return and team move | Signed account lookup restores identity; the approved return and move screens are unavailable. | Native identity persistence is the production seam; app browser tests use a controlled host. | Company/team rejoin and move workflow, installed-device proof. |
| Today, conversations, side threads and workspace | Navigation shows explicit unavailable content after sign-in. | Relay/channel/media capabilities are retained in the engine. | Real channel list, timeline, thread side panel and conversation-level files, links, images, videos and browser references. |
| Team, employee desks, decisions and cards | Navigation shows explicit unavailable content after sign-in. | Company and employee capabilities are retained in the engine. | Real records and ant employee actions, permissions and recovery. |
| Settings, system states and outside-app pages | Settings navigation shows explicit unavailable content; other views are not routed yet. | Existing backend and desktop reference remain available for migration. | Persisted settings, billing, notifications, diagnostics and remaining approved pages. |

The production renderer must not load `design-reference/colony-os/prototype` fixtures or `desktop/src`. `scripts/check-colony-global-source.mjs` enforces that source boundary. Update this ledger when a shipped route gains a real production path and its required CI case.
