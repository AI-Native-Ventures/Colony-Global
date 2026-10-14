# Security baseline for the repository bootstrap

The new `app/` is the only shipped renderer. The Colony 2.0 native host and engine are retained during the rebuild. The required CI scans the full root Rust graph and the macOS native-host graph with Cargo Deny, production JavaScript dependencies with npm audit, and Git history with Gitleaks.

The unsafe YAML parser is removed from both Rust lockfiles. Direct callers use `noyalib-serde-yaml` 0.0.57. The vendored `kube-client` 2.0.1 changes its YAML dependency and multi-document parser call to the same safe-Rust implementation. The original crate's Apache-2.0 source and the exact modification are retained in `vendor/kube-client/`.

The native host carries the following inherited advisory exceptions in `deny.toml`. They remain visible here and must be revisited before their old surfaces are enabled in the new app:

| Advisory | Dependency path | Current boundary |
| --- | --- | --- |
| RUSTSEC-2026-0150 | `opus` → `audiopus_sys` | Unmaintained build dependency in legacy huddle audio; no safe upstream upgrade. |
| RUSTSEC-2026-0293 | `neteq` → `ringbuf` | `neteq` 0.8.3 declares `ringbuf` 0.3 without using it in its source; remove with legacy audio dependencies. |
| RUSTSEC-2020-0168 | `user-idle`/`IOKit-sys` → `mach` | Unmaintained macOS dependency in retained host; no safe version upgrade. |
| RUSTSEC-2025-0075, -0080, -0081, -0098, -0100 | Tauri `urlpattern` → `rust-unic` | Unmaintained Unicode family; upstream has no safe version upgrade. |

The known `h2` and `rtrb` vulnerabilities were fixed by updating the native lockfile to patched compatible versions. The legacy audio and Tauri dependency paths are not proof of working new-app product flows. Native packaging and installed runtime remain separate gates; these exceptions do not certify those surfaces as safe for release.

Gitleaks found 58 matches in the imported public-source snapshot, all in tests, examples, generated lockfile strings, or non-secret constants. Their exact original-commit fingerprints are pinned in `.gitleaksignore`. New commits produce new fingerprints and are scanned normally. Review any additional match before adding an ignore.
