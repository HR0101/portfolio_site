# E2E Test Infra: Portfolio Site

## Test Philosophy
- **Opaque-box, requirement-driven**: Test the frontend interactions and behavior via simulated DOM environments. The tests make no assumptions about the build tool (Vite vs. Next.js) or framework internal structures, other than target container IDs and component test-ids.
- **Methodology**: Incorporates Category-Partition (feature coverage), Boundary Value Analysis (corner/error cases), Pairwise/Interaction Testing (cross-feature scenarios), and Real-World Workload Testing (recruiter, offline visitor, etc.), supplemented by empirical adversarial checks.

## Feature Inventory
| # | Feature | Source (Requirement) | Tier 1 (Coverage) | Tier 2 (Boundary) | Tier 3 (Cross) | Tier 4 (Real-World) |
|---|---------|----------------------|:----------------:|:-----------------:|:--------------:|:-------------------:|
| F1| Hero Section | ORIGINAL_REQUEST R3 | 5 tests | 5 tests | ✓ | ✓ |
| F2| Projects Section | ORIGINAL_REQUEST R1, R3 | 5 tests | 6 tests | ✓ | ✓ |
| F3| Technical Skills | ORIGINAL_REQUEST R3 | 5 tests | 5 tests | ✓ | ✓ |
| F4| Career Timeline | ORIGINAL_REQUEST R3 | 5 tests | 5 tests | ✓ | ✓ |
| F5| Blog Section | ORIGINAL_REQUEST R3 | 5 tests | 8 tests | ✓ | ✓ |
| F6| Dark/Light Mode | ORIGINAL_REQUEST R3 | 5 tests | 5 tests | ✓ | ✓ |
| F7| GitHub API & Cache | ORIGINAL_REQUEST R1 | 5 tests | 5 tests | ✓ | ✓ |

## Test Architecture
- **Test Runner**: Executed via `node tests/run.js`, which imports each suite (`tier1.test.js`, `tier2.test.js`, `tier3.test.js`, `tier4.test.js`, `adversarial.test.js`), loops over the contained test assertions asynchronously, and reports the results.
- **Environment**: Plain Node.js Mock DOM setup via `tests/helpers/browserMock.js` implementing classList, mock element tags, selector querying, basic HTML parsing, event dispatching, and mocks for global localStorage and fetch API.
- **Mock Application Wrapper**: `tests/helpers/mockApp.js` simulates the portfolio application state, rendering logic, Markdown parser, localStorage theme retrieval, and GitHub API endpoint mapping.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| F4.S1 | Recruiter Journey | Hero, Skills, Projects, Theme | Medium |
| F4.S2 | Offline Visitor | Projects, Blog, API Offline Fallback | High |
| F4.S3 | Project Discovery | Projects Search, Filters, Detail drill down | Medium |
| F4.S4 | Blog Reader | Blog navigation, Markdown rendering, XSS sanitization, Theme persistence | High |
| F4.S5 | GitHub Cache Refresh | API caching lifecycle, expiration, offline cache read, online refresh | High |

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: ≥5 tests per feature. Evaluates baseline happy paths for all 7 key features (35 tests total).
- **Tier 2 (Boundary & Corner Cases)**: ≥5 tests per feature covering extreme inputs, DOM element removals, rapid actions, and error fallbacks (39 tests total).
- **Tier 3 (Cross-Feature Combinations)**: 7 tests testing interactions (e.g. filtering and theme persistence, search + navigation).
- **Tier 4 (Real-World Application Scenarios)**: 5 comprehensive user journey workflows.
- **Adversarial (Empirical Hardening)**: 5 tests auditing security validation, cache corruptions, and injection patterns.
