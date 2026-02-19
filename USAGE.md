# USAGE — Rankscale GEO Analytics Skill

**Skill ID:** `rs-geo-analytics` | **Version:** 1.0.0

---

## Table of Contents

1. [First-Run Setup](#first-run-setup)
2. [Credential Configuration](#credential-configuration)
3. [Trigger Patterns](#trigger-patterns)
4. [Command-Line Flags](#command-line-flags)
5. [Example Outputs](#example-outputs)
6. [Understanding Your Report](#understanding-your-report)
7. [Troubleshooting](#troubleshooting)

---

## First-Run Setup

If you have not yet configured credentials, the skill will detect this on first run and guide you through the onboarding flow.

### Step 1 — Create a Rankscale account

```
https://app.rankscale.ai/signup
```

A 14-day free trial is available (no credit card required).

### Step 2 — Add your brand

From the Rankscale dashboard:

1. Click **Add Brand**
2. Enter your brand name and primary domain
3. Select your category (e.g. "SaaS / Productivity")
4. Add 3–5 competitors to benchmark against
5. Click **Create Brand**

Your Brand ID appears in the URL after creation:

```
https://app.rankscale.ai/brands/<YOUR_BRAND_ID>
```

Initial GEO data takes **24–48 hours** to populate.

### Step 3 — Generate an API key

1. Go to **Settings → API Keys**:  
   `https://app.rankscale.ai/settings/api`
2. Click **Generate New Key**
3. Copy the key immediately — it is only shown once

Your API key looks like:

```
rk_xxxxxxxx_<brandId>
```

The brand ID is embedded in the key suffix and will be extracted automatically if you do not set `RANKSCALE_BRAND_ID` separately.

### Step 4 — Configure credentials

See [Credential Configuration](#credential-configuration) below.

### Step 5 — Run your first report

```bash
node rankscale-skill.js
```

Or via your AI assistant:

```
Run a Rankscale GEO report
```

---

## Credential Configuration

The skill resolves credentials in this priority order:

1. CLI flags (`--api-key`, `--brand-id`)
2. Environment variables (`RANKSCALE_API_KEY`, `RANKSCALE_BRAND_ID`)
3. Auto-extraction of brand ID from the API key suffix

### Environment variables (recommended)

```bash
export RANKSCALE_API_KEY="rk_xxxxxxxx_<brandId>"
export RANKSCALE_BRAND_ID="<brandId>"
```

To persist across sessions, add to your shell config (`~/.bashrc` or `~/.zshrc`):

```bash
echo 'export RANKSCALE_API_KEY="rk_xxxxxxxx_<brandId>"' >> ~/.zshrc
echo 'export RANKSCALE_BRAND_ID="<brandId>"' >> ~/.zshrc
source ~/.zshrc
```

### `.env` file

```
RANKSCALE_API_KEY=rk_xxxxxxxx_<brandId>
RANKSCALE_BRAND_ID=<brandId>
```

### CLI flags (one-off / testing)

```bash
node rankscale-skill.js \
  --api-key rk_xxxxxxxx_<brandId> \
  --brand-id <brandId>
```

**Never commit credentials to version control.** Add `.env` to `.gitignore`.

---

## Trigger Patterns

The skill activates when your AI assistant detects any of the following patterns:

| Pattern | Example |
|---------|---------|
| `rankscale` | "Run rankscale" |
| `geo analytics [for <brand>]` | "Geo analytics for Acme Corp" |
| `geo report [for <brand>]` | "Give me a geo report" |
| `geo insights [for <brand>]` | "Show geo insights" |
| `geo score` | "What's my geo score?" |
| `show my ai visibility` | "Show my AI visibility" |
| `ai search visibility` | "Check AI search visibility" |
| `citation analysis [for <brand>]` | "Pull citation analysis for Acme" |
| `citation rate` | "What's my citation rate?" |
| `sentiment analysis [for <brand>]` | "Brand sentiment in AI answers" |
| `ai search terms [for <brand>]` | "Show AI search terms for my brand" |
| `show search term report` | "Show search term report" |
| `brand visibility report` | "Run a brand visibility report" |

### Additional natural language invocations

```
How is <brand> performing in AI search?
How often is <brand> cited in AI?
What is my brand score?
Check my AI search rankings
What's my GEO score?
Rankscale report
```

---

## Command-Line Flags

| Flag | Description |
|------|-------------|
| `--api-key <key>` | Rankscale API key (overrides env var) |
| `--brand-id <id>` | Brand ID (overrides env var and auto-extraction) |
| `--brand-name <name>` | Brand display name (used in output header) |
| `--discover-brands` | List all brands on this API key and exit |
| `--help` | Show usage information |

### Examples

```bash
# List all brands on your account
node rankscale-skill.js --discover-brands

# Run report for a specific brand
node rankscale-skill.js --brand-id <brandId> --brand-name "Acme Corp"

# Override credentials inline
node rankscale-skill.js --api-key rk_xxxxxxxx_<brandId> --brand-id <brandId>
```

---

## Example Outputs

### Full GEO Report (healthy brand)

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
  GEO INSIGHTS  [2 of 5]
  [WARN] Citation rate below 40% target.
         Action: Publish 2+ authoritative
         comparison articles this month.
  [INFO] Momentum positive (+3, sentiment 61%).
         Expand into adjacent topic areas.
-------------------------------------------------------
  Full report: https://app.rankscale.ai/brands/xxxxx
=======================================================
```

### Critical brand (low visibility)

```
=======================================================
  RANKSCALE GEO REPORT
  Brand: Example Co | 2026-02-19
=======================================================
  GEO SCORE:     18 / 100   [-9 vs last week]
  CITATION RATE: 11%        [Industry avg: 28%]
  SENTIMENT:     Pos 42% | Neu 28% | Neg 30%
-------------------------------------------------------
  TOP AI SEARCH TERMS
  (none — brand not cited in tracked queries)
-------------------------------------------------------
  GEO INSIGHTS  [4 of 5]
  [CRIT] Citation rate critically low (<20%).
         Immediate content audit required.
         Target: 5+ citations/week.
  [CRIT] Negative sentiment at 30%.
         Audit top 3 negative narratives.
  [CRIT] GEO Score below 40 — brand near-
         invisible in AI search. Full audit
         required across all dimensions.
  [WARN] Score dropped -9 this week.
         Check competitor content activity.
-------------------------------------------------------
  Full report: https://app.rankscale.ai/brands/xxxxx
=======================================================
```

### Brand discovery output

```
=======================================================
  RANKSCALE — YOUR BRANDS
=======================================================
  1. Acme Corp
     ID:     xxxxxxxxxxxxxxx
     Domain: acmecorp.com
     Plan:   Pro
-------------------------------------------------------
  Use --brand-id <id> to select a brand.
=======================================================
```

---

## Understanding Your Report

### GEO Score (0–100)

Composite score from three dimensions:

| Range | Band | Meaning |
|-------|------|---------|
| 0–39 | Critical | Nearly invisible in AI search |
| 40–64 | Growing | Some presence, major gaps |
| 65–79 | Strong | Good visibility, room to improve |
| 80–100 | Leader | Dominant AI search presence |

### Citation Rate

Percentage of tracked queries (relevant to your category) where your brand appears in AI-generated answers. Industry average for SaaS/Tech in 2026 is ~28%. Target: 40%+.

### Sentiment

Tone distribution across all AI-generated mentions of your brand.

- **Healthy target:** Positive > 55%, Negative < 15%
- **Concern threshold:** Negative > 25% triggers a CRIT insight

### Score Change

Week-over-week delta. A drop of -5 or more triggers a WARN insight.

### GEO Insights

The skill surfaces up to **5 insights** per report, prioritised:

1. CRIT (immediate action required)
2. WARN (action within 2–4 weeks)
3. INFO (positive signal or context)

See `references/geo-playbook.md` for all 10 interpretation rules with root causes, recommended actions, and expected timelines.

---

## Troubleshooting

### Authentication errors

**Symptom:** `Auth error — check your API key`

**Causes and fixes:**

- API key is incorrect or expired — regenerate at  
  `https://app.rankscale.ai/settings/api`
- Key was copied with extra whitespace — verify with `echo $RANKSCALE_API_KEY`
- Key format should be `rk_xxxxxxxx_<brandId>` — check for the `rk_` prefix

---

### Brand not found

**Symptom:** `Brand not found. Run --discover-brands to list available brands.`

**Fix:**

```bash
node rankscale-skill.js --discover-brands
```

Use the returned brand ID with `--brand-id <id>` or set `RANKSCALE_BRAND_ID`.

---

### Rate limit (429)

**Symptom:** `Rate limited — retrying in Xs`

The skill automatically retries with exponential backoff (1s, 2s, 4s + jitter, max 3 attempts). If repeated 429s occur:

- You are approaching the 60 req/min limit
- Wait 60 seconds and try again
- Check your plan's daily report quota at `https://app.rankscale.ai/settings`

---

### Network timeout / connection error

**Symptom:** `Connection failed — check your internet connection`

- Verify internet connectivity
- The Rankscale API base URL is `https://app.rankscale.ai/api/v1`
- The skill retries once before failing with partial data or a graceful error

---

### Data not available yet

**Symptom:** Report shows zeroes or "no data"

- Initial GEO data takes **24–48 hours** to populate after brand creation
- Check your dashboard at `https://app.rankscale.ai/brands/<id>` to confirm data is being collected

---

### Credentials not found (onboarding triggered)

**Symptom:** Skill asks for API key on every run

Your credentials are not persisted. Fix:

```bash
# Confirm env vars are set
echo $RANKSCALE_API_KEY
echo $RANKSCALE_BRAND_ID

# If empty, add to shell config
echo 'export RANKSCALE_API_KEY="rk_xxxxxxxx_<brandId>"' >> ~/.zshrc
source ~/.zshrc
```

---

### Getting further help

- **Docs:** https://docs.rankscale.ai
- **Support:** support@rankscale.ai
- **Discord:** https://discord.gg/rankscale
- **Issues:** https://github.com/Mathias-RS/RS-Skill/issues
