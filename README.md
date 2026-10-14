# Colony Global

Colony is a desktop app for small business owners to work with an AI team. Scout, the Chief of Staff, brings work into topic conversations and asks for a person's decision before anything public, financial or consequential happens. The employees are ants.

This repository is the **public rebuild**. It reuses the Colony 2.0 engine and is replacing its old desktop interface with the [approved Colony OS design](design-reference/colony-os/README.md). The new production renderer lives in `app/`; the existing `desktop/src` is retained as migration reference while the new paths are proven. The white work area, blended rose/lilac/blue sidebar, channel-like conversations, side threads and shared conversation workspace are the design contract.

The rebuild is in progress. A design prototype, source import or green build does not prove real sign-in, employee execution, billing, packaging, deployment or customer use. The [repository design](docs/superpowers/specs/2026-10-14-colony-global-rebuild-repository-design.md) defines the product and CI boundary; the [bootstrap plan](docs/superpowers/plans/2026-10-14-colony-global-bootstrap.md) tracks the first gate. [Source provenance](SOURCE-PROVENANCE.md) records the exact imported commits and licenses.

The source is licensed under [Apache-2.0](LICENSE), with separate third-party notices where bundled assets require them.
