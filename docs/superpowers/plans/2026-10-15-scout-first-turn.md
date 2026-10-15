# Scout first real turn in Colony Global

The approved O-07 screen is a real agent turn. No renderer copy may impersonate Scout's first reply, research progress, or proposed facts. The source gate is a signed owner kickoff, a running company-scoped Scout, a signed Scout reply and typed profile proposal, and an owner decision that saves the reviewed profile. The runtime gate additionally requires a configured provider and live relay, with first words under 30 seconds and explicit recovery after 90 seconds.

Implementation order:

1. Add `profileProposal` to the shared ask record. Validate the complete business profile and enforce owner/admin human resolution. The relay marks proposal heads and rejects proposal creation by outsiders. Exercise these paths in core and service-backed relay tests.
2. Add a company-scoped Scout startup coordinator. Reuse the built-in Scout persona and managed-agent runtime, create or reopen one Getting started conversation, grant Scout access, and send one owner-signed kickoff with the Scout mention. Recheck company host and signing identity after every asynchronous boundary. A retry must reconcile existing agent/channel/kickoff instead of duplicating them.
3. Render only relay-signed Scout messages and proposal heads. Present the approved profile fields in the simple white/gradient style with ant artwork. An owner can confirm or ask Scout for a change; loading, delayed start, offline, and failure states remain explicit.
4. On confirmation, write the profile action using the current revision, then resolve the ask. If the second write fails, reconcile the saved profile against the open ask on retry. Never mark an ask approved before the profile is saved.
5. Prove the native startup and relay paths, controlled-host browser recovery, exact-head CI, and one installed-app run with a configured provider before calling the turn usable.

This phase ends only when those gates pass. Protocol-only changes may be reviewed separately but do not satisfy O-07.
