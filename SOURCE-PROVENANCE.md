# Source provenance

Colony Global starts from two existing public source trees. Its new Git history begins with this import; the source histories remain available at the links below.

| Imported material | Source | Exact commit |
| --- | --- | --- |
| Colony 2.0 relay, account, company, conversation, agent and native-host source | [AI-Native-Ventures/colony-ai](https://github.com/AI-Native-Ventures/colony-ai) | `b553fe392433da46762a7b34d2f9c3b81f47b5da` |
| Approved Colony OS design source, bundled assets, screen registry and coverage | [AI-Native-Ventures/colony-ai, design/colony-os](https://github.com/AI-Native-Ventures/colony-ai/tree/44971c3b472274e3a070a1e2e6031c248c10183d/design/colony-os) | `44971c3b472274e3a070a1e2e6031c248c10183d` |
| Repository and CI design decision | Local canary worktree, copied into `docs/superpowers/specs/` | signed design commit `cc719ed70cc49cfa315c5dd5ed6136736bab6f43` |

The engine source keeps the upstream Apache-2.0 `LICENSE` and existing file notices. The design reference retains the bundled Manrope OFL license. These notices stay with the imported material as it is moved or modified.

The initial import used tracked files from the two commits. It excluded local `.env` files, credentials, generated PNG exports, dependency directories, build outputs and old GitHub workflows. The design reference's mock data and actions are **not** production data or evidence of working accounts, employees, payments, provider integrations or live delivery. The new production app is built separately under `app/`.

`vendor/kube-client/` is the Apache-2.0 `kube-client` 2.0.1 crate from crates.io. Its changes replace the `serde_yaml` dependency with `noyalib-serde-yaml` 0.0.57 and adapt the multi-document kubeconfig parser call to that library's compatibility API. This keeps the current Kubernetes client API while removing the transitive `unsafe-libyaml` parser. The vendored copy can be removed when Colony adopts a compatible upstream `kube-client` release that no longer depends on `serde_yaml`.
