# Verification record

Validated during creation on 2026-10-26.

| Check | Result |
|---|---|
| `mvn verify` | Passed; 31 JUnit test invocations, 0 failures, 0 errors |
| Seeded heap vs full-sort oracle | 400 combinations passed |
| BFS vs Floyd–Warshall distance oracle | All 576 ordered recipe pairs passed |
| `node scripts/check-demo.mjs` | 120 searches + 576 paths/traces + 14 Trie queries match Java |
| JavaScript syntax | `node --check` passed for application and engine |
| Real Spring HTTP integration | UI, catalog, API runtime config, autocomplete, search, path, 400 validation, and 404 recipe checks passed |
| Desktop browser QA | Presets, recipe dialog, save action, graph path/trace, algorithm panel inspected |
| Mobile browser QA | 390px iframe (375px content viewport with scrollbar), no horizontal overflow; preset and recipe dialog tested |

The UI tests were manual browser interactions rather than an automated browser test suite. Screenshots document the rendered interface. Unit/API checks are repeatable through Maven and the parity script. The test resource selects Mockito’s subclass mock maker so Spring’s test listeners do not require JVM agent self-attachment; no mock is substituted for the real API server.

Not claimed: production load testing, measured performance improvements over scans, deployed JVM hosting, Docker build execution, or a successful GitHub Actions run before the repository is actually published.
