# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [1.0.0] - 2026-02-19

Initial release of the Rankscale GEO Analytics Skill (RS-126).

### Added

#### Core Skill

- `rankscale-skill.js` — main skill logic, exported as a Node.js module compatible with OpenClaw and ClawhHub
- CLI entry point: `node rankscale-skill.js` with `--api-key`, `--brand-id`, `--brand-name`, `--discover-brands`, and `--help` flags
- `.skill` metadata manifest for ClawhHub packaging (id, version, triggers, credentials, capabilities, endpoints, output spec)
- `scripts/validate-skill.js` — ClawhHub validation script (84 checks; exits 0 on pass)

#### API Integration

- Authentication via Bearer token (`rk_<hash>_<brandId>` format)
- Auto-extraction of Brand ID from the API key suffix
- Sequential + parallel API orchestration:
  - `GET /v1/metrics/brands` — brand discovery
  - `GET /v1/metrics/report` — GEO score and rank
  - `GET /v1/metrics/citations` — citation count and top sources
  - `GET /v1/metrics/sentiment` — sentiment breakdown
  - `GET /v1/metrics/search-terms-report` — top AI search queries
- Dual-format response normalization for all endpoints:
  - Sentiment: float 0–1 or nested score objects or integer %
  - Report: standard fields or `geoScore`/`rankPosition`/`weeklyDelta` variants
  - Citations: `count`/`rate`/`sources` or `total`/`citationRate`/`topSources` variants
  - Search terms: `terms[]`, `data[]`, `searchTerms[]`, or `results[]`
- Exponential backoff with jitter: 3 retries on 429 / 5xx / timeout (1s, 2s, 4s)
- Custom error classes: `AuthError`, `NotFoundError`, `ApiError`

#### GEO Interpretation Engine

Ten rules with severity levels CRIT / WARN / INFO:

- **R1** — Low Citation Rate (WARN): citation rate < 40%
- **R2** — Critical Citation Rate (CRIT): citation rate < 20% (supersedes R1)
- **R3** — Negative Sentiment Spike (CRIT): negative sentiment > 25%
- **R4** — Low GEO Score (CRIT): GEO score < 40
- **R5** — Medium GEO Score / Growth Zone (WARN): score 40–64
- **R6** — Negative Score Trend (WARN): score change < -5 week-over-week
- **R7** — Positive Momentum (INFO): score change >= +3 and positive sentiment > 55%
- **R8** — Content Gap Investigation (WARN): detection rate < 70%
- **R9** — Competitive Benchmark Gap (WARN): competitor leads by > 15 points
- **R10** — Engine-Specific Optimization (WARN): max−min engine visibility > 30 points

Rule deduplication logic: R2 supersedes R1 when both citation thresholds fire. Maximum 5 insights surfaced per report, prioritized CRIT → WARN → INFO.

#### Competitor Comparison

- Industry benchmark data embedded (SaaS/Tech 2026 aggregate)
- Competitor delta surfaced via Rule R9 when applicable
- Per-engine visibility spread surfaced via Rule R10

#### Ranked Recommendations

- Each insight includes root cause analysis, actionable steps, and expected timeline
- Recommendations ranked by severity (CRIT first)

#### ASCII Output (Mobile-Compatible)

- 55-character max width, no markdown tables
- Sections: GEO Score header, Top AI Search Terms, GEO Insights
- Footer link to full report on Rankscale dashboard
- Compatible with OpenClaw chat, terminal, and mobile displays

#### Onboarding Flow

- First-run detection when credentials are absent
- Interactive onboarding prompt guiding users through:
  - Account creation at `app.rankscale.ai/signup`
  - Brand setup
  - API key generation
  - Credential configuration (env vars or CLI flags)
- `assets/onboarding.md` — standalone onboarding copy, 55-char ASCII format

#### ClawhHub Packaging

- `.skill` manifest with full metadata (id, triggers, credentials, capabilities, endpoints, output, tags)
- 13 trigger keywords registered for assistant detection
- Category: Analytics / GEO AI Search
- `scripts/validate-skill.js` passes 84/84 checks

#### Documentation

- `SKILL.md` — OpenClaw skill spec (triggers, flow, credential spec, output format, error handling)
- `references/api-integration.md` — full Rankscale API reference (5 endpoints, dual-format schemas, error codes, cURL and Node.js examples)
- `references/geo-playbook.md` — GEO interpretation playbook (all 10 rules with root causes, recommended actions, timelines; metric definitions; benchmark data; content type rankings; glossary)
- `README.md` — GitHub landing page (overview, install, quick start, requirements, links)
- `USAGE.md` — comprehensive usage guide (setup, triggers, flags, example outputs, troubleshooting)
- `CHANGELOG.md` — this file
- `docs/ARCHITECTURE.md` — technical deep-dive for skill maintainers

---

[Unreleased]: https://github.com/Mathias-RS/RS-Skill/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Mathias-RS/RS-Skill/releases/tag/v1.0.0
