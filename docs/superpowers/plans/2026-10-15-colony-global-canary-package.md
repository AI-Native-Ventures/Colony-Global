# Colony Global installed canary

The Scout first-turn source and exact-head CI gate passed at `88c51e9`. The
remaining runtime gate needs an installed app. This phase produces an unsigned,
ad hoc signed macOS test package without production credentials or deployment.

Acceptance gate:

1. The bundle and native host data directory use a Colony Global identity
   separate from inherited Buzz installs. The canary does not register an
   operating-system link scheme. The package
   stages `app/dist`, not the retained old renderer.
2. CI builds the real native host and required sidecars, packages them with
   the new renderer, verifies the archive and macOS signature, and attaches an
   exact-commit test artifact. No placeholder executable may be packaged.
   The host includes the Colony credits adapter, whose UI and authorization
   still require the relay's own capability and funded balance checks.
3. An installed launch is checked for the new UI and a recoverable offline
   state. This does not prove a provider turn; that still requires a live
   company relay, enabled credits gateway, funded owner, and observed signed
   Scout reply and proposal.

The package is for canary testing only. Public release signing, notarization,
auto-update, deployment, and customer use remain separate gates.
The canary does not claim an operating-system deep-link scheme, so installing
it cannot take `colony://` or `buzz://` links from an existing app.
