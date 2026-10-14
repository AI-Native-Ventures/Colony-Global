# Colony OS design coverage

Every visual ID in the approved pack has a local design route: first run, Today, Conversations, Team, desks, Settings, result cards, system surfaces and the outside pages. The workspace is white with a restrained rose-lilac-blue sidebar gradient. Base: docs/colony-os at 262d489ebd05576530ab8e6c066fb070bf822d38.

All employees remain ants, including Scout. No human employee portraits are bundled.

## Evidence

- 1433 states across 128 IDs. Inline and full forms for C-00 to C-20.
- 3860 PNGs, including Windows frame variants and foundations.
- 11580 layout checks across 1440 x 900, 1728 x 1117 and 1024 x 700: 0 failures.
- 3860 automated WCAG A/AA audits: 0 failing variants.
- 29 interaction checks passed; 0 failed.
- 58 contrast token pairs and 6 campaign artwork checks: 0 failures.
- 13 review-control checks passed; 0 failed.
- 45 conversation interaction checks passed; 0 failed.
- 35 Team interaction checks passed; 0 failed.
- 26 employee desk interaction checks passed; 0 failed.
- 18 Settings interaction checks passed; 0 failed.
- 12 first-run, partner and new-computer interaction checks passed; 0 failed.
- 17 remaining-card interaction checks passed; 0 failed.
- 18 system and outside-page interaction checks passed; 0 failed.
- Reports and limits: verification/README.md. Automated audit incompletes remain recorded; zero violations is not a blanket accessibility certification.
- Scope: static local browser prototype. No native runtime, backend, deployment, delivery, billing, microphone recording or employee execution is proven.

## Designed state inventory

| ID | Screen | Forms | Designed states |
| --- | --- | --- | --- |
| G-01 | App window | screen | normal, first-open, reopening, unreachable, paused-credits, paused-plan, paused-person, team-stopped, scout-stopped, other-computer, several-companies, signed-out, update-required, smallest, loading, loading-slow, offline, paused, partner, problem, empty |
| G-07 | Employee identity | screen | working, starting, free, waiting, paused, stopped, away, hiring, loading, loading-slow, offline, partner, problem, empty |
| O-01 | Welcome and sign in | screen | first-launch, returning, invite, waiting-google, google-cancelled, email-wrong, too-many-tries, offline, unreachable, loading, loading-slow, paused, partner, problem, empty |
| O-02 | Email code | screen | waiting, checking, wrong, expired, too-many, no-email, cooling-down, offline, unreachable, loading, loading-slow, paused, partner, problem, empty |
| O-03 | Your business | screen | asking, summary, bad-link, creating, company-failed, rate-limit, company-limit, offline, loading, loading-slow, paused, partner, problem, empty |
| O-04 | Power your team | screen | normal, credits-already, plan-already, offline, loading, loading-slow, paused, partner, problem, empty |
| O-05 | Buy credits | screen | choosing, waiting-payment, paid, credits-coming, credits-slow, cancelled, not-finished, email-unconfirmed, offline, unreachable, loading, loading-slow, paused, partner, problem, empty |
| O-06 | Connect your plan | screen | choice, getting-ready, slow, not-enough-space, setup-failed, waiting-browser, sign-in-cancelled, free-plan, checking, check-failed, connected, already-set-up, offline, loading, loading-slow, paused, partner, problem, empty |
| O-07 | Scout gets to know you | screen | reading, reading-slow, getting-ready, link-failed, no-links, profile-ready, scout-failed, credits-out, plan-limit, offline, loading, loading-slow, paused, partner, problem, empty |
| O-08 | Meet your team | screen | proposal-ready, putting-together, some-unticked, only-scout, name-not-allowed, low-credits, hiring, one-hire-failed, offline, loading, loading-slow, paused, partner, problem, empty |
| O-09 | Keep your team running | screen | normal, notifications-allowed, notifications-refused, computer-message, desktop-computer, offline, loading, loading-slow, paused, partner, problem, empty |
| O-10 | Team starting | screen | starting, slow, one-failed, scout-failed, credits-out, plan-limit, offline, ready, loading, loading-slow, paused, partner, problem, empty |
| P-01 | Join a company | screen | valid, wrong-email, expired, cancelled, already-member, closed, failed, offline, loading, loading-slow, paused, partner, problem, empty |
| P-01a | Stay in the loop | screen | allowed, refused, team-not-running, offline, loading, loading-slow, paused, partner, problem, empty |
| N-01 | Welcome back | screen | online, off, never-started, several-companies, offline, loading, loading-slow, paused, partner, problem, empty |
| N-02 | Moving your team | screen | confirming, old-online, old-off, moving, one-failed, move-failed, power-needed, offline, done, loading, loading-slow, paused, partner, problem, empty |
| T-01 | Today | screen | normal, first-day, before-brief, friday, weekend, empty, many, away, paused-credits, paused-plan, paused-person, scout-stopped, team-stopped, computer-off, loading, loading-slow, offline, paused, partner, problem |
| T-02 | Conversation list | screen | normal, archive-activity, archived, archived-empty, empty, loading, loading-slow, offline, paused, partner, problem |
| T-03 | Conversation | screen | normal, new, long-history, working, sending, sent, not-sent, paused-credits, paused-plan, paused-person, scout-stopped, team-stopped, computer-off, employee-stuck, archived, writing, mention, reply, thread, card-thread, workspace, edited, deleted, waiting-send, routing, loading, loading-slow, offline, paused, partner, problem, empty, unread, search-result |
| T-04 | New conversation | screen | empty, first-sent, routing, loading, loading-slow, offline, paused, partner, problem |
| T-05 | Needs you | screen | normal, empty, many, two-people, history, history-empty, urgent, to-post, plans, money, employee, loading, loading-slow, offline, paused, partner, problem |
| T-06 | Search | screen | normal, results, filtered, archived, voice, no-results, empty, loading, loading-slow, offline, paused, partner, problem |
| T-07 | Voice note | screen | idle, first-use, permission-denied, no-microphone, recording, locked, review, near-limit, at-limit, too-short, sent, transcribing, transcript-ready, transcription-failed, transcript-fixed, long-transcript, preparing, loading, loading-slow, offline, paused, partner, problem |
| T-08 | Attachments | screen | before-send, empty, uploading, upload-failed, too-big, not-allowed, too-many, rate-limited, sent, photo-viewer, document-viewer, library-offer, library-added, customer-screenshot, loading, loading-slow, offline, paused, partner, problem |
| C-00 | Card basics | full, inline | waiting, changes, approved, declined, ready, ready-send, posted, sent, live, expired, withdrawn, replaced, answered, hired, paid, fixed, chosen, owner-only, note, versions, history, loading, loading-slow, offline, paused, partner, problem, empty, two-people, image-failed |
| C-01 | Decision | full, inline | waiting, approved, declined, changes, expired, withdrawn, replaced, note, decline-note, ask-scout, loading, loading-slow, offline, paused, partner, problem, empty, two-people |
| C-02 | Question | full, inline | waiting, answered, skipped, expired, withdrawn, options, multiple, files, you-decide, loading, loading-slow, offline, paused, partner, problem, empty, two-people |
| C-03 | Plan | full, inline | waiting, approved, changes, replaced, ended, above-budget, not-enough-credits, employee-plan, partly-approved, note, loading, loading-slow, offline, paused, partner, problem, empty, two-people |
| C-04 | Social post | full, inline | waiting, changes, ready, posted, skipped, replaced, withdrawn, time-to-post, late, missed, batch, batch-mixed, note, change-time, post-link, loading, loading-slow, offline, paused, partner, problem, empty, two-people, image-failed |
| C-05 | Carousel | full, inline | waiting, changes, ready, posted, skipped, replaced, withdrawn, time-to-post, late, missed, batch, batch-mixed, note, change-time, post-link, slide-3, loading, loading-slow, offline, paused, partner, problem, empty, two-people, image-failed |
| C-06 | Video script | full, inline | waiting, changes, to-film, to-post, posted, skipped, missed, replaced, withdrawn, shot-progress, post-link, loading, loading-slow, offline, paused, partner, problem, empty, two-people |
| C-07 | Image set | full, inline | waiting, chosen, more-asked, declined, expired, withdrawn, replaced, credits-out, image-failed, loading, loading-slow, offline, paused, partner, problem, empty, two-people |
| C-08 | Message draft | full, inline | waiting, changes, ready-send, sent, replied, skipped, replaced, withdrawn, batch, loading, loading-slow, offline, paused, partner, problem, empty, two-people |
| C-09 | Customer reply | full, inline | waiting, changes, ready-send, sent, customer-replied, skipped, replaced, withdrawn, urgent, loading, loading-slow, offline, paused, partner, problem, empty, two-people |
| C-10 | Website change | full, inline | waiting, changes, scheduled, going-live, live, failed-live, undone, declined, replaced, withdrawn, hosting-paused, no-domain, undo-confirm, loading, loading-slow, offline, paused, partner, problem, empty, two-people |
| C-11 | Lead list | full, inline | waiting, approved, changes, declined, expired, withdrawn, selection, loading, loading-slow, offline, paused, partner, problem, empty, two-people |
| C-12 | Document | full, inline | waiting, changes, approved, declined, replaced, withdrawn, loading, loading-slow, offline, paused, partner, problem, empty, two-people |
| C-13 | Invoice or quote | full, inline | waiting, changes, ready-send, sent, paid, overdue, cancelled, accepted, not-accepted, declined, replaced, quote, loading, loading-slow, offline, paused, partner, problem, empty, two-people |
| C-14 | Brand kit | full, inline | waiting, changes, approved, replaced, missing-logo, loading, loading-slow, offline, paused, partner, problem, empty, two-people |
| C-15 | Hire proposal | full, inline | waiting, hired, not-now, changes, expired, withdrawn, change-name, loading, loading-slow, offline, paused, partner, problem, empty, two-people |
| C-16 | Money request | full, inline | waiting, approved, paid, declined, changes, expired, withdrawn, owner-only, credits-out, hosting, ad-spend, change-amount, loading, loading-slow, offline, paused, partner, problem, empty, two-people |
| C-17 | Numbers check-in | full, inline | waiting, sent, skipped, expired, invalid-number, loading, loading-slow, offline, paused, partner, problem, empty, two-people |
| C-18 | Problem | full, inline | open, restarting, fixed, still-failing, paused, computer-off, loading, loading-slow, offline, partner, problem, empty, two-people |
| C-19 | Brief and Friday wrap | full, inline | new, read, late, friday, loading, loading-slow, offline, paused, partner, problem, empty, two-people |
| C-20 | Done note | full, inline | shown, grouped, loading, loading-slow, offline, paused, partner, problem, empty, two-people |
| M-01 | Team | screen | normal, first-day, waiting, paused-credits, paused-person, team-stopped, stopped-elsewhere, other-computer, only-scout, former, loading, loading-slow, offline, paused, partner, problem, empty |
| M-02 | Employee page | screen | working, starting, first-week, free, away, waiting, paused-person, paused-credits, paused-plan, paused-budget, stopped, failing, let-go, other-computer, loading, loading-slow, offline, paused, partner, problem, empty |
| D-03 | Naledi's desk | screen | normal, first-week, brand-waiting, batch-waiting, missed, no-accounts, paused, month, instagram, tiktok, facebook, posted, loading, loading-slow, offline, partner, problem, empty |
| M-03 | Employee plan | screen | approved, first-week, waiting, behind, changes, ended, paused, previous, let-go, loading, loading-slow, offline, partner, problem, empty |
| M-04 | Employee schedule | screen | normal, routine-off, running, missed, didnt-finish, paused, let-go, confirm-off, change-time, loading, loading-slow, offline, partner, problem, empty |
| M-05 | Employee activity | screen | normal, filtered-empty, older, let-go, loading, loading-slow, offline, partner, problem, empty |
| M-06 | Employee settings | screen | normal, scout, paused, paused-budget, saving, save-failed, computer-off, confirm-pause, confirm-let-go, let-go, loading, loading-slow, offline, partner, problem, empty |
| M-07 | Direct chat | screen | first-time, working, paused, stopped, failing, paused-person, paused-credits, let-go, loading, loading-slow, offline, partner, problem, empty |
| M-08 | New hire starting | screen | starting, done, failed, other-computer, computer-off, paused-credits, cancel-confirm, loading, loading-slow, offline, partner, problem, empty |
| D-01 | Scout's desk | screen | first-day, plan-waiting, normal, stopped, loading, loading-slow, offline, paused, partner, problem, empty, let-go |
| D-02 | Maya's desk | screen | normal, first-week, no-website, shopify, no-numbers, behind, loading, loading-slow, offline, paused, partner, problem, empty, let-go |
| D-02a | Campaign detail | screen | planned, running, behind, paused, done, loading, loading-slow, offline, partner, problem, empty, let-go |
| D-03a | Photo library | screen | normal, empty, uploading, file-rejected, filtered-empty, loading, loading-slow, offline, paused, partner, problem, let-go |
| D-04 | Sipho's desk | screen | normal, first-week, no-leads, nothing-due, loading, loading-slow, offline, paused, partner, problem, empty, let-go |
| D-04a | Lead detail | screen | new, contacted, talking, won, lost, no-contact, unreadable, loading, loading-slow, offline, paused, partner, problem, empty, let-go |
| D-05 | Leo's desk | screen | live, no-site, first-week, first-ready, going-live, publish-failed, domain-connecting, payment-problem, hosting-paused, shopify, loading, loading-slow, offline, paused, partner, problem, empty, let-go |
| D-05a | Connect your domain | screen | entering, waiting, securing, connected, domain-problem, removing, loading, loading-slow, offline, paused, partner, problem, empty, let-go |
| D-06 | Grace's desk | screen | normal, first-week, forwarding, no-customers, overdue, decision-needed, loading, loading-slow, offline, paused, partner, problem, empty, let-go |
| D-06a | Customer thread | screen | to-reply, waiting-customer, done, needs-decision, unreadable, loading, loading-slow, offline, paused, partner, problem, empty, let-go |
| D-06b | Knowledge | screen | approved, first-week, website-old, empty, loading, loading-slow, offline, paused, partner, problem, let-go |
| D-06c | Paste a customer message | screen | empty, reading, unreadable, matched, loading, loading-slow, offline, paused, partner, problem, let-go |
| S-01 | Business profile | screen | normal, missing-facts, saving, saved, save-failed, changed-by-someone, follow-up, loading, loading-slow, offline, paused, partner, problem, empty |
| S-02 | Credits and billing | screen | normal, low, out, waiting-payment, paid, payment-failed, auto-top-up-ran, auto-top-up-failed, monthly-limit, hosting-problem, own-plan, no-payments, loading, loading-slow, offline, paused, partner, problem, empty |
| S-03 | How your team is powered | screen | credits, claude, chatgpt, setting-up, setup-failed, limit, signed-out, other-computer, loading, loading-slow, offline, paused, partner, problem, empty |
| S-04 | Connections | screen | normal, forwarding-not-set, waiting-first-email, confirmation-needed, working, no-emails, test-sent, test-arrived, test-failed, domain-connecting, domain-connected, domain-broken, no-social, loading, loading-slow, offline, paused, partner, problem, empty |
| S-05 | People | screen | normal, just-owner, invite-pending, invite-expired, invite-failed, already-invited, loading, loading-slow, offline, paused, partner, problem, empty |
| S-06 | Notifications | screen | normal, permission-off, not-asked, quiet-now, loading, loading-slow, offline, paused, partner, problem, empty |
| S-07 | Running | screen | normal, paused-person, paused-credits, plan-limit, stopped, computer-off, moving, restarting, loading, loading-slow, offline, paused, partner, problem, empty |
| S-08 | Account | screen | normal, editing, saved, save-failed, team-computer, closing, close-failed, loading, loading-slow, offline, paused, partner, problem, empty |
| S-09 | Help and updates | screen | normal, checking, downloading, update-ready, update-failed, sending, sent, send-failed, loading, loading-slow, offline, paused, partner, problem, empty |
| G-02 | Menu bar and tray | screen | normal, first-run, signed-out, other-computer, offline, update-ready, needs-you, paused, problem |
| G-03 | Computer notifications | screen | decision, several-decisions, employee-problem, scout-stopped, team-stopped, team-paused, credits-low, morning-brief, friday-wrap, time-to-post, customer-waiting, reply-to-you, team-moved, quiet-hours, notifications-off, handled-elsewhere, looking-at-it |
| G-04 | Banners | screen | normal, multiple, partner |
| G-05 | Keyboard | screen | normal |
| G-06 | Toasts and undo | screen | approved, declined, posted, sent, copied, saved, archived, renamed, invite, undo |
| G-08 | Themes and sizes | screen | normal, light, dark, large, larger, smallest, large-smallest, full-screen, reduced-motion, higher-contrast |
| X-01 | Offline | screen | just-offline, offline-a-while, messages-waiting, back-online |
| X-02 | Colony unreachable | screen | first-minutes, longer, back |
| X-03 | While you were away | screen | catching-up, caught-up, long-time-off, nothing-missed |
| X-04 | Credits low | screen | owner, partner, auto-top-up-failed, auto-top-up-limit |
| X-05 | Credits out | screen | owner, partner, own-plan, waiting-payment, resumed |
| X-06 | Own plan limit reached | screen | known, unknown, using-credits, plan-back, partner |
| X-07 | Own plan disconnected | screen | team-computer, other-computer, signing-in, sign-in-failed, fixed |
| X-08 | Employee stuck or failing | screen | open, restarting, back, still-failing, paused |
| X-09 | Scout stopped | screen | open, restarting, back, still-failing |
| X-10 | Team stopped | screen | team-computer, other-computer, restarting, restart-failed |
| X-11 | Update ready or required | screen | ready, required, updating, failed, updated, mac-launch |
| X-12 | Signed out | screen | signed-out, removed, left, company-closed, missing-sign-in |
| X-13 | Team runs on another computer | screen | unreachable, moving, moved, computer-back, old-computer |
| X-14 | First close of the window | screen | team-mac, team-windows, other-mac, other-windows |
| X-15 | Quit | screen | team-computer, other-computer, shutting-down |
| X-16 | Confirmations | screen | asking, working, done, failed |
| X-17 | Empty states | screen | empty, filled |
| X-18 | Loading | screen | short, placeholders, long, very-long, done |
| X-19 | Problem messages | screen | first, repeated, fixed |
| X-20 | Permissions | screen | not-asked, explaining, allowed, denied, no-device, device-busy, restart-needed, microphone, microphone-denied |
| X-21 | Can't run here | screen | old-mac, old-windows, already-open, not-responding, disk-low, team-paused |
| X-22 | Team paused by a person | screen | paused, resuming, resumed, long-time |
| W-01 | Landing page | screen | mac, windows, phone, unsupported, slow |
| W-02 | Download and install | screen | mac, windows, phone, unsupported, blocked, signed, unsigned, old-mac |
| W-03 | Pricing | screen | normal, unmeasured, phone |
| W-04 | Terms and privacy | screen | terms, privacy, changed, phone |
| W-05 | Payment pages | screen | credits, hosting, save-card, change-card, paid-open, paid-closed, paid-phone, confirming, cancelled, declined, expired, paid-hosting |
| W-06 | Emails | screen | sign-in-code, partner-invite, receipt, credits-low, top-up-failed, credits-out, hosting-failed, website-paused, company-closed, partner-closed, bounced, phone |
| W-07 | Invite page | screen | valid, not-installed, expired, joined, cancelled, invalid, phone, company-closed |
| W-08 | The owner's website | screen | home, products, product, about, contact, faq, campaign, form-sending, form-sent, form-problem, sold-out, campaign-ended, preview, page-not-found, paused, closed, phone |
| W-09 | Website paused page | screen | unpaid, cancelled, closed, restored |
| G-04a | Team stopped banner | screen | owner, partner |
| G-04b | Scout stopped banner | screen | owner, partner |
| G-04c | Credits out banner | screen | owner, partner |
| G-04d | Plan limit banner | screen | owner, partner |
| G-04e | Plan disconnected banner | screen | owner, partner |
| G-04f | Offline banner | screen | owner, partner |
| G-04g | Colony unreachable banner | screen | owner, partner |
| G-04h | Team computer off banner | screen | owner, partner |
| G-04i | Paused by a person banner | screen | owner, partner |
| G-04j | Website paused banner | screen | owner, partner |
| G-04k | Credits low banner | screen | owner, partner |
| G-04l | Update ready banner | screen | owner, partner |
| G-04m | Notifications off banner | screen | owner, partner |
| G-04n | Images paused banner | screen | owner, partner |
| G-04o | Disk almost full banner | screen | owner, partner |
| G-04p | Terms updated banner | screen | owner, partner |

## Full pack inventory

Every visual and flow ID in section 11 is listed. Flow rows are local prototype journeys, not live operations. Engine items in section 12 are context only.

| ID | Name | Status |
| --- | --- | --- |
| G-01 | App window | Milestone 1: 21 states, screen |
| G-02 | Menu bar and tray | System: 9 states, screen |
| G-03 | Computer notifications | System: 17 states, screen |
| G-04 | Banners | System: 3 states, screen |
| G-05 | Keyboard | System: 1 states, screen |
| G-06 | Toasts and undo | System: 10 states, screen |
| G-07 | Employee identity | Milestone 1: 14 states, screen |
| G-08 | Themes and sizes | System: 10 states, screen |
| G-04a | Banner catalogue, variant a | System: 2 states, screen |
| G-04b | Banner catalogue, variant b | System: 2 states, screen |
| G-04c | Banner catalogue, variant c | System: 2 states, screen |
| G-04d | Banner catalogue, variant d | System: 2 states, screen |
| G-04e | Banner catalogue, variant e | System: 2 states, screen |
| G-04f | Banner catalogue, variant f | System: 2 states, screen |
| G-04g | Banner catalogue, variant g | System: 2 states, screen |
| G-04h | Banner catalogue, variant h | System: 2 states, screen |
| G-04i | Banner catalogue, variant i | System: 2 states, screen |
| G-04j | Banner catalogue, variant j | System: 2 states, screen |
| G-04k | Banner catalogue, variant k | System: 2 states, screen |
| G-04l | Banner catalogue, variant l | System: 2 states, screen |
| G-04m | Banner catalogue, variant m | System: 2 states, screen |
| G-04n | Banner catalogue, variant n | System: 2 states, screen |
| G-04o | Banner catalogue, variant o | System: 2 states, screen |
| G-04p | Banner catalogue, variant p | System: 2 states, screen |
| O-01 | Welcome and sign in | First run: 15 states, screen |
| O-02 | Email code | First run: 15 states, screen |
| O-03 | Your business | First run: 14 states, screen |
| O-04 | Power your team | First run: 10 states, screen |
| O-05 | Buy credits | First run: 16 states, screen |
| O-06 | Connect your plan | First run: 19 states, screen |
| O-07 | Scout gets to know you | First run: 16 states, screen |
| O-08 | Meet your team | First run: 15 states, screen |
| O-09 | Keep your team running | First run: 12 states, screen |
| O-10 | Team starting | First run: 14 states, screen |
| P-01 | Join a company | First run: 14 states, screen |
| P-01a | Stay in the loop | First run: 10 states, screen |
| N-01 | Welcome back | First run: 11 states, screen |
| N-02 | Moving your team | First run: 15 states, screen |
| T-01 | Today | Milestone 1: 20 states, screen |
| T-02 | Conversation list | Conversations: 11 states, screen |
| T-03 | Conversation | Milestone 1: 34 states, screen |
| T-04 | New conversation | Conversations: 9 states, screen |
| T-05 | Needs you | Milestone 1: 17 states, screen |
| T-06 | Search | Conversations: 13 states, screen |
| T-07 | Voice note | Conversations: 23 states, screen |
| T-08 | Attachments | Conversations: 20 states, screen |
| C-00 | Card basics | Milestone 1: 30 states, full + inline |
| C-01 | Decision | Milestone 1: 18 states, full + inline |
| C-02 | Question | Milestone 1: 17 states, full + inline |
| C-03 | Plan | Milestone 1: 18 states, full + inline |
| C-04 | Social post | Milestone 1: 24 states, full + inline |
| C-05 | Carousel | Milestone 1: 25 states, full + inline |
| C-06 | Video script | Milestone 1: 19 states, full + inline |
| C-07 | Image set | Milestone 1: 17 states, full + inline |
| C-08 | Message draft | Milestone 1: 17 states, full + inline |
| C-09 | Customer reply | Milestone 1: 17 states, full + inline |
| C-10 | Website change | Milestone 1: 21 states, full + inline |
| C-11 | Lead list | Milestone 1: 15 states, full + inline |
| C-12 | Document | Milestone 1: 14 states, full + inline |
| C-13 | Invoice or quote | Milestone 1: 20 states, full + inline |
| C-14 | Brand kit | Milestone 1: 13 states, full + inline |
| C-15 | Hire proposal | Milestone 1: 15 states, full + inline |
| C-16 | Money request | Milestone 1: 20 states, full + inline |
| C-17 | Numbers check-in | Milestone 1: 13 states, full + inline |
| C-18 | Problem | Milestone 1: 13 states, full + inline |
| C-19 | Brief and Friday wrap | Milestone 1: 12 states, full + inline |
| C-20 | Done note | Milestone 1: 10 states, full + inline |
| M-01 | Team | Team: 17 states, screen |
| M-02 | Employee page | Team: 21 states, screen |
| M-03 | Plan tab | Team: 15 states, screen |
| M-04 | Schedule tab | Team: 15 states, screen |
| M-05 | Activity tab | Team: 10 states, screen |
| M-06 | Employee settings | Team: 16 states, screen |
| M-07 | Direct chat | Team: 14 states, screen |
| M-08 | New hire starting | Team: 13 states, screen |
| D-01 | Scout's desk | Employee desks: 12 states, screen |
| D-02 | Maya's desk | Employee desks: 14 states, screen |
| D-03 | Naledi's desk | Employee desks: 18 states, screen |
| D-04 | Sipho's desk | Employee desks: 12 states, screen |
| D-05 | Leo's desk | Employee desks: 18 states, screen |
| D-06 | Grace's desk | Employee desks: 14 states, screen |
| D-02a | Campaign detail | Employee desks: 12 states, screen |
| D-03a | Photo library | Employee desks: 12 states, screen |
| D-04a | Lead detail | Employee desks: 15 states, screen |
| D-05a | Connect your domain | Employee desks: 14 states, screen |
| D-06a | Customer thread | Employee desks: 13 states, screen |
| D-06b | Knowledge | Employee desks: 11 states, screen |
| D-06c | Paste a customer message | Employee desks: 11 states, screen |
| S-01 | Business profile | Settings: 14 states, screen |
| S-02 | Credits and billing | Settings: 19 states, screen |
| S-03 | How your team is powered (credits, Claude plan, ChatGPT plan) | Settings: 15 states, screen |
| S-04 | Connections (forwarding address, website domain, social account names) | Settings: 20 states, screen |
| S-05 | People (partners and invites) | Settings: 13 states, screen |
| S-06 | Notifications | Settings: 11 states, screen |
| S-07 | Running (this computer, start with the computer, stay awake, pause, restart, move the team) | Settings: 15 states, screen |
| S-08 | Account (profile, appearance, sign out, close the company or leave it) | Settings: 14 states, screen |
| S-09 | Help and updates | Settings: 15 states, screen |
| X-01 | Offline | System: 4 states, screen |
| X-02 | Colony unreachable | System: 3 states, screen |
| X-03 | While you were away | System: 4 states, screen |
| X-04 | Credits low | System: 4 states, screen |
| X-05 | Credits out (team paused) | System: 5 states, screen |
| X-06 | Own plan limit reached | System: 5 states, screen |
| X-07 | Own plan disconnected | System: 5 states, screen |
| X-08 | Employee stuck or failing | System: 5 states, screen |
| X-09 | Scout stopped | System: 4 states, screen |
| X-10 | Team stopped | System: 4 states, screen |
| X-11 | Update ready or required | System: 6 states, screen |
| X-12 | Signed out | System: 5 states, screen |
| X-13 | Team runs on another computer | System: 5 states, screen |
| X-14 | First close of the window | System: 4 states, screen |
| X-15 | Quit | System: 3 states, screen |
| X-16 | Confirmations | System: 4 states, screen |
| X-17 | Empty states | System: 2 states, screen |
| X-18 | Loading | System: 5 states, screen |
| X-19 | Problem messages | System: 3 states, screen |
| X-20 | Permissions (notifications, microphone) | System: 9 states, screen |
| X-21 | Can't run here (old system, already open, disk full) | System: 6 states, screen |
| X-22 | Team paused by a person | System: 4 states, screen |
| W-01 | Landing page | Outside the app: 5 states, screen |
| W-02 | Download and install | Outside the app: 8 states, screen |
| W-03 | Pricing | Outside the app: 3 states, screen |
| W-04 | Terms and privacy | Outside the app: 4 states, screen |
| W-05 | Payment pages (checkout, back to the app) | Outside the app: 12 states, screen |
| W-06 | Emails | Outside the app: 12 states, screen |
| W-07 | Invite page | Outside the app: 8 states, screen |
| W-08 | The owner's website (Colony-hosted) | Outside the app: 17 states, screen |
| W-09 | Website paused page | Outside the app: 4 states, screen |
| F-01 | Owner first run | Partial or deferred; see flow table |
| F-02 | Partner joins | Partial or deferred; see flow table |
| F-03 | Signing in on a new computer | Partial or deferred; see flow table |
| F-04 | Daily loop | Partial or deferred; see flow table |
| F-05 | New topic to done | Partial or deferred; see flow table |
| F-06 | Social post to posted | Partial or deferred; see flow table |
| F-07 | Customer message to sent reply | Partial or deferred; see flow table |
| F-08 | Sales outreach | Partial or deferred; see flow table |
| F-09 | First website and own domain | Partial or deferred; see flow table |
| F-10 | Approving the 2-week plans | Partial or deferred; see flow table |
| F-11 | Talking to one employee | Partial or deferred; see flow table |
| F-12 | Hiring another employee | Partial or deferred; see flow table |
| F-13 | Pause, restart, let go | Partial or deferred; see flow table |
| F-14 | Credits low and top-up | Partial or deferred; see flow table |
| F-15 | Credits out and resume | Partial or deferred; see flow table |
| F-16 | Computer asleep overnight | Partial or deferred; see flow table |
| F-17 | Employee stuck | Partial or deferred; see flow table |
| F-18 | App update | Partial or deferred; see flow table |
| F-19 | Voice note | Partial or deferred; see flow table |
| F-20 | Thursday numbers | Partial or deferred; see flow table |
| F-21 | Friday wrap | Partial or deferred; see flow table |
| F-22 | Closing the company | Partial or deferred; see flow table |

## Flow boundaries at this gate

The owner approved the simpler Today, Conversations and Team direction, requested employee desks and Settings, then asked to finish the screen pack with a white workspace and blended sidebar gradient. F-01 to F-08 have local clickable paths. Real accounts, payments, providers, native preferences, employee execution and team movement remain outside the prototype.

| Flow | Implemented segment | Remaining dependency |
| --- | --- | --- |
| F-01 | W-01 landing and pricing to W-02 install, O-01 to O-10 setup, W-05 payment return and entry to Today | Real installer, account, email, legal publication, payment or provider return, profile generation and employee hire |
| F-02 | S-05 invitation, W-06 email specimen, W-07 invite page, P-01 join, P-01a computer choices and partner permissions | Real invite delivery, identity verification, membership and native notification permission |
| F-03 | W-02 installer path, N-01 computer choice, X-16 confirmation, N-02 local move and per-computer setup | Safe cross-computer hand-over with actual team processes and a shared authority |
| F-04 | G-03 notification specimen, Today, Needs you, C-00 to C-20, all six desks and local history | Native notifications, relay-backed cards and actual employee work |
| F-05 | Topic list, new conversations, message and card threads, shared workspace, explicit routing, search, voice and files, mentions, work lines and C-01 to C-20 | Relay-backed threads, shared media storage, browser sessions and real team execution |
| F-06 | G-03 notification specimen, approve, ask changes, slide navigation, image choice, film checklist, copy, numbered downloads, mark posted, undo and calendar | Real filming, image generation, credits charge and external posting by a person |
| F-07 | W-08 contact form specimen, Grace's customer list, thread, C-09 reply approval, sent mark and knowledge | Real form ingestion, email and customer delivery |
| F-08 | Sipho's lead list, C-11 selection, C-08 draft, sent mark and stage history | Real outreach and replies |
| F-10 | Employee plans, canonical approval, change notes and history | Live plan authoring and revision |
| F-11 | One direct chat per employee, voice and files, quoted Scout handoff | Real employee replies and remote delivery |
| F-12 | C-15 hire proposal, prefilled hiring conversation and M-08 setup, failure, cancellation and first week | Real employee creation and partner hiring permission in the relay |
| F-13 | Atomic local pause, restart, let go and Undo, former-member history | Commands carried out by the actual team computer |

F-09 to F-22 have designed screen destinations where the pack names them, but their cross-system journeys are not all demonstrated end to end. All flow rows above are local prototype segments, not complete runtime flows.

## Review notes

- O-01 to O-10, P-01, P-01a, N-01 and N-02: first run, partner join and a new computer are designed. Browser returns use a clearly marked review control. No real external effect is proven.
- G-02 to G-06 and G-08: menu and tray, notifications, banner variants, keyboard, toasts and appearance are local specimens. Native menu placement, system notifications, close and quit behaviour and OS permissions are unproven.
- X-01 to X-22: system conditions, confirmations and recovery states have review routes. The prototype does not detect real connectivity, provider limits, restarts, updates or storage conditions.
- W-01 to W-09: responsive outside pages, email specimens, install steps, payment returns and Lerato Designs website states have review routes. No installer was downloaded, email was sent, card was charged or website was published. Legal full text needs a lawyer. Installer screenshots need a real build. Stripe owns the checkout page. Lerato's real product photos are needed before her website can be published.
- T-02 to T-08: Conversations is designed. T-05 remains the shared Needs you surface. Voice capture, transcription, file transfers and native app handoff use local fixtures or browser affordances, with no native or server proof.
- T-06: search covers local fixture messages, topics, transcripts and cards; server search is unproven.
- M-01 to M-08: Team, employee pages, plans, routines, activity, settings, direct chats and new-hire setup are designed. All identity choices remain ants.
- D-01 to D-06c: all six ant employee desks and their detail screens are designed. Actions share local mock records. Photo transfer, outbound messages, website publication, DNS, hosting, and live employee work remain unproven.
- D-03a: the library uses six bundled AI-made example artworks, not the 86 real product photos in the screen brief. Local additions can be tested; HEIC conversion and external upload are unproven.
- S-01 to S-09: all nine Settings sections are designed. Shared facts, personal choices, invites, pause and appearance use the local mock snapshot. Provider, payment, email, native notifications, updates, team move and closure remain unproven.
- C-06 to C-20: all remaining result cards have inline and full review states. Local mock actions demonstrate decisions, media selection, manual send marks, website recovery, numbers, briefs and done notes. No live employee work, billing or external delivery is proven.
- The screenshot gallery is png/index.html. The route and state registry is prototype/src/data/screen-registry.json.
