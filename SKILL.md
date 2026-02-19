# rs-geo-analytics — Rankscale GEO Analytics Skill

**Skill ID:** rs-geo-analytics  
**Version:** 1.0.0  
**Brand:** Rankscale  
**Ticket:** RS-126

---

## Overview

This skill connects to the Rankscale API to retrieve and interpret GEO (Generative Engine Optimization) analytics data for a brand. It fetches visibility reports, citation analysis, sentiment breakdowns, and top search terms — then transforms raw metrics into actionable recommendations using the GEO Interpretation Module.

---

## Trigger Patterns

The assistant should invoke this skill when a user says anything matching:

```
rankscale [show|get|pull|fetch|run|check|analyze|report]?
geo analytics [for <brand>]?
geo report [for <brand>]?
show my ai visibility
check ai search rankings
how is <brand> performing in ai search
what's my geo score
rankscale report
brand visibility report
citation analysis [for <brand>]?
sentiment analysis [for <brand>]? [ai|geo]?
ai search terms [for <brand>]?
show search term report
geo insights [for <brand>]?
what is my brand score
how often is [<brand>] cited in ai
```

### Example Invocations

- "Run a Rankscale GEO report for Acme Corp"
- "Show my AI search visibility"
- "What's my geo score?"
- "Pull a citation analysis"
- "How is Rankscale performing in AI search?"
- "Give me GEO insights"
- "Check my brand sentiment in AI answers"

---

## Credentials

| Variable | Source | Description |
|---|---|---|
| `RANKSCALE_API_KEY` | env / user config | API key (format: `rk_<hash>_<brandid>`) |
| `RANKSCALE_BRAND_ID` | env / user config | Brand ID string |

If missing, trigger onboarding (see `/assets/onboarding.md`).

---

## Skill Flow

```
1. Validate credentials
2. If missing → onboarding prompt
3. If brand ID unknown → brand discovery (/v1/metrics/brands)
4. Sequential API calls:
   a. /v1/metrics/report        → visibility score + rank
   b. /v1/metrics/citations     → citation count + sources
   c. /v1/metrics/sentiment     → positive/negative/neutral %
   d. /v1/metrics/search-terms-report → top queries where brand appears
5. Normalize + transform data
6. Run GEO Interpretation Module
7. Render ASCII output (55-char width, mobile-compatible)
```

---

## File References

| File | Purpose |
|---|---|
| `rankscale-skill.js` | Main skill logic + GEO Interpretation Module |
| `references/api-integration.md` | API endpoint specs, schemas, request examples |
| `references/geo-playbook.md` | GEO interpretation rules + recommendation patterns |
| `assets/onboarding.md` | Onboarding copy for new Rankscale users |
| `scripts/validate-skill.js` | ClawhHub validation script |
| `.skill` | ClawhHub metadata |

---

## Output Format

All output is ASCII, max 55 chars wide, mobile-compatible.  
No markdown tables. Sections separated by `-------`.

Example:
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

## Error Handling

| Scenario | Behavior |
|---|---|
| Invalid API key | Show auth error + link to settings |
| Rate limited (429) | Exponential backoff, max 3 retries |
| Brand not found | Trigger brand discovery or onboarding |
| Network timeout | Retry once, then show partial data |
| API 5xx | Show graceful error + cached data if available |
