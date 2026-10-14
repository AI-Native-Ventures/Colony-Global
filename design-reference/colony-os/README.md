# Colony OS design: complete visual screen pack

Branch: `design/colony-os`, based on `docs/colony-os` at `262d489eb`.

The approved screen pack is the product contract. Every employee remains an ant, including Scout. No human employee portraits are included.

## Review

Open [the local review board](http://127.0.0.1:4317/#/review), [the system menu](http://127.0.0.1:4317/#/G-02), [the landing page](http://127.0.0.1:4317/#/W-01), [the owner website](http://127.0.0.1:4317/#/W-08), [a result card](http://127.0.0.1:4317/#/C-06?form=full), [a conversation thread](http://127.0.0.1:4317/#/T-03?state=card-thread), [the conversation workspace](http://127.0.0.1:4317/#/T-03?state=workspace), [first run](http://127.0.0.1:4317/#/O-01), [Settings](http://127.0.0.1:4317/#/S-01), [Team](http://127.0.0.1:4317/#/M-01) or [Scout's desk](http://127.0.0.1:4317/#/D-01). The review bar switches screen, state, appearance, platform, card form and owner or partner view. It sits outside the product interface. The [PNG gallery](png/index.html) offers exported states for side-by-side review.

The prototype includes all 128 visual IDs and 1,433 registered states in the approved pack. It has a white work area with Colony's blended rose, lilac and blue gradient in the sidebar, and a deeper violet-blue gradient in dark mode. Conversations keep their channel-like timeline and focused message and work-card threads beside it. The shared conversation workspace indexes media and files and saves links and browser references. All result cards C-00 to C-20 have inline and full viewers, local state changes, and links from relevant conversations, desks or Needs you views. System and outside-app routes cover menus, notifications, banners, recovery states, landing, install, pricing, payment specimens, email, invite and the example owner website. All six employees retain ant portraits.

## Run and verify

From `prototype/`, run `npm ci`, then `npm run build` and `npm run preview`. The static app uses hash routes and locally bundled Manrope. It has no backend. Install Chromium once with `npx playwright install chromium` if needed.

- `npm run verify`: existing mock interactions and keyboard behavior.
- `npm run verify:conversations`: topic, threads, shared workspace, search, voice and local-file behavior.
- `npm run verify:team`: employee identity, lifecycle, plans, routines, chats and hiring.
- `npm run verify:desks`: all desk routes and linked decisions, corrections, media, leads, site and customer flows.
- `npm run verify:settings`: all nine Settings routes, owner and partner permissions, persistence, confirmations and local external-action boundaries.
- `npm run verify:first-run`: all 14 first-run routes, owner, partner and new-computer paths, external-return boundaries and ant portraits.
- `npm run verify:remaining-cards`: C-06 to C-20 interactions, keyboard paths, manual send marks, owner-only billing and per-person briefs.
- `npm run verify:system-outside`: system menus, notifications, banners, confirmations, outside pages, payment return, invite and website form paths.
- `npm run verify:contrast` and `npm run verify:review`: contrast and review controls.
- `npm run export`: PNG, three-size layout and automated accessibility matrix.
- `npm run coverage`: full screen-pack inventory and proof counts.

When campaign artwork changes, run `npm run export:assets` before the build. Reports and proof limits are in [verification/README.md](verification/README.md). The system and outside-surface acceptance gate is in [the implementation plan](../../docs/superpowers/plans/2026-10-13-colony-system-and-external-surfaces.md).

## Scope

The local prototype can demonstrate decisions, navigation, keyboard paths and saved mock state. Thread replies, card actions and workspace references are local mock records; browser references open in the system browser, with no live embedded browser session. It does not prove real account creation, email verification, payment, provider sign-in, team hire, cross-computer hand-over, employee execution, relay-backed messages and threads, file upload, social posting, website publication, DNS checks, hosting payment, invitation email, native notifications, help delivery, company closure or customer delivery. The first-run and payment flows mark external returns as design review simulations. The bundled library images are mood examples, not the 86 real product photos in the brief. HEIC conversion and long-term media storage need native and service work. The legal page is an outline awaiting approved text; real release files and installer screenshots, payment provider UI and the owner's actual product photos are also dependencies. [COVERAGE.md](COVERAGE.md) lists every visual ID and flow boundary.
