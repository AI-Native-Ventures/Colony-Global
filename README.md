# Colony Global

Colony is a desktop app for small business owners to work with an AI team. Scout, the Chief of Staff, brings work into topic conversations and asks for a person's decision before anything public, financial or consequential happens. The employees are ants.

This repository is the **public rebuild**. It reuses the Colony 2.0 engine and is replacing its old desktop interface with the [approved Colony OS design](design-reference/colony-os/README.md). The new production renderer lives in `app/`; the existing `desktop/src` is retained as migration reference while the new paths are proven. The white work area, blended rose/lilac/blue sidebar, channel-like conversations, side threads and shared conversation workspace are the design contract.

The rebuild is in progress. The shipped app's email-code path now calls the account relay, imports the verified identity through the native host and checks the current account on reopen. Browser tests cover the renderer with a controlled host/relay, while the engine lane tests the real account handlers against disposable Postgres and Redis. Installed-app sign-in, real email delivery, employee execution, billing, deployment and customer use remain separate proof gates. The [production coverage ledger](docs/production-coverage.md) shows which approved screens are actually wired. The [repository design](docs/superpowers/specs/2026-10-14-colony-global-rebuild-repository-design.md) defines the product and CI boundary; the [first-run plan](docs/superpowers/plans/2026-10-14-first-run-auth.md) tracks the current gate. [Source provenance](SOURCE-PROVENANCE.md) records the exact imported commits and licenses.

The source is licensed under [Apache-2.0](LICENSE), with separate third-party notices where bundled assets require them.
