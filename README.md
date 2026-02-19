# Rankscale GEO Analytics Skill

**Skill ID:** `rs-geo-analytics`  
**Version:** 1.0.0  
**Ticket:** RS-126  
**Branch:** `feature/rs-126-geo-analytics-skill`

An [OpenClaw](https://openclaw.ai) skill that connects to the [Rankscale](https://rankscale.ai) API to fetch and interpret **GEO (Generative Engine Optimization)** analytics for your brand. Understand how often your brand is cited in AI-generated search answers, what the sentiment looks like, and what to do about it.

---

## What It Does

- Fetches your brand's **GEO score**, citation rate, sentiment breakdown, and top AI search terms from the Rankscale API
- Applies the **GEO Interpretation Engine** (10 rules, severity CRIT/WARN/INFO) to surface actionable insights
- Compares your performance against **industry benchmarks** and tracked competitors
- Renders results as **mobile-compatible ASCII output** (55-char width, no markdown tables)
- Guides new users through **first-run onboarding** if credentials are missing

---

## Requirements

| Requirement | Details |
|-------------|---------|
| Node.js | >= 16 |
| Rankscale account | Free trial available at https://app.rankscale.ai/signup |
| `RANKSCALE_API_KEY` | API key from Settings > API Keys |
| `RANKSCALE_BRAND_ID` | Your brand ID (auto-extracted from API key if omitted) |

---

## Installation

### Via ClawhHub (recommended)

```
/skill install rs-geo-analytics
```

ClawhHub handles credential prompts automatically on first run.

### Manual

```bash
# Clone the repository
git clone https://github.com/Mathias-RS/RS-Skill.git
cd RS-Skill

# Set credentials
export RANKSCALE_API_KEY="rk_xxxxxxxx_<brandId>"
export RANKSCALE_BRAND_ID="<brandId>"

# Run
node rankscale-skill.js
```

---

## Quick Start

### Via your AI assistant

Once installed, just ask:

```
Run a Rankscale GEO report
Show my AI search visibility
What's my GEO score?
Pull a citation analysis for Acme Corp
How is my brand performing in AI search?
```

### Via command line

```bash
# Basic report (uses env vars for credentials)
node rankscale-skill.js

# With inline credentials
node rankscale-skill.js --api-key rk_xxxxxxxx_<brandId> --brand-id <brandId>

# Discover brands on your account
node rankscale-skill.js --discover-brands

# Help
node rankscale-skill.js --help
```

### Example output

```
=======================================================
  RANKSCALE GEO REPORT
  Brand: Acme Corp | 2026-02-19
=======================================================
  GEO SCORE:     72 / 100   [+3 vs last week]
  CITATION RATE: 34%        [Industry avg: 28%]
  SENTIMENT:     Pos 61% | Neu 29% | Neg 10%
-------------------------------------------------------
  TOP AI SEARCH TERMS
  1. "best project management tool"    (18 mentions)
  2. "acme corp reviews"               (12 mentions)
  3. "project software comparison"     ( 9 mentions)
-------------------------------------------------------
  GEO INSIGHTS  [3 of 5]
  [WARN] Citation rate below 40% target.
         Action: Publish 2+ authoritative
         comparison articles this month.
  [INFO] Sentiment trending positive.
         Maintain current content cadence.
  [CRIT] Brand missing from 3 high-vol
         queries. Add FAQ schema markup.
-------------------------------------------------------
  Full report: https://app.rankscale.ai/brands/<id>
=======================================================
```

---

## First-Run Setup

If credentials are not set, the skill will walk you through setup interactively. See `assets/onboarding.md` for the full onboarding flow, or visit:

```
https://app.rankscale.ai/signup
```

---

## Documentation

| File | Description |
|------|-------------|
| `USAGE.md` | Full usage guide — triggers, flags, troubleshooting |
| `CHANGELOG.md` | Version history |
| `docs/ARCHITECTURE.md` | Technical deep-dive for skill maintainers |
| `references/api-integration.md` | Rankscale API endpoint reference |
| `references/geo-playbook.md` | GEO interpretation rules (R1–R10) |
| `assets/onboarding.md` | New user onboarding walkthrough |
| `SKILL.md` | OpenClaw skill spec (triggers, flow, output format) |

---

## Support

- **Rankscale Docs:** https://docs.rankscale.ai
- **Rankscale Support:** support@rankscale.ai
- **Rankscale Discord:** https://discord.gg/rankscale
- **Issues:** https://github.com/Mathias-RS/RS-Skill/issues

---

## License

MIT — see `LICENSE` for details.
