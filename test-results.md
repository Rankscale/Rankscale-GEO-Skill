# ROA-40 GEO Features — Test Results

**Date:** 2026-02-26  
**Tester:** @builder (subagent)  
**Branch:** feature/roa-40-geo-analysis  

---

## Feature A: Engine Strength Profile (`--engine-profile`)

**API calls:** `GET /v1/metrics/report`  
**Function:** `analyzeEngineStrength(reportData)`  
**Status:** ✅ PASS

### Sample output (live API)
```
-------------------------------------------------------
                ENGINE STRENGTH PROFILE
-------------------------------------------------------
  Engine       Visibility            Score
  Average      ──────────────────     69.3
-------------------------------------------------------
  mistral_larg ██████████████████████ 83.2 ✦
  deepseek_cha █████████████████████  79.5 ✦
  chatgpt_gui  ████████████████████   77.5 ✦
  perplexity_s ████████████████████   73.9  
  google_ai_ov ███████████████████      73  
  google_ai_mo ███████████████████    70.8  
  google_gemin ██████████████████     66.2  
  openai_gpt-5 ████████████████       60.1 ▼
  anthropic_cl ███████████████        57.7 ▼
  perplexity_g █████████████          50.7 ▼
-------------------------------------------------------
  ✦ Top-3 engines  ▼ Bottom-3 engines
```

### Edge cases
- Empty `engines` object → "No engine data available." (no crash)
- `null` report → graceful fallback via safeGet

---

## Feature B: Content Gap Analysis (`--gap-analysis`)

**API calls:** `GET /v1/metrics/report`, `GET /v1/metrics/search-terms-report`  
**Function:** `analyzeContentGaps(reportData, searchTermsData)`  
**Status:** ✅ PASS (live shows sparse data — fallback handled correctly)

### Sample output (mock data)
```
-------------------------------------------------------
                 CONTENT GAP ANALYSIS
-------------------------------------------------------
  ENGINE GAPS (vs avg 44.5):
  ▼ grok           score:   15  gap:-29.5
  ▼ gemini         score:   20  gap:-24.5

  LOW-VISIBILITY TERMS (<50%) — 3 found:
  email campaigns        ░                      5%
  sales pipeline         ░░░░                  18%
  marketing automation   ░░░░░░░░              42%

  RECOMMENDATIONS:
  1. Create content targeting top 3 gap terms:
     • "email campaigns"
     • "sales pipeline"
     • "marketing automation"
  2. Optimise for grok: score 15 vs avg 44.5
-------------------------------------------------------
```

### Edge cases
- No search-terms-report data → skips terms section, shows engine gaps only
- Both empty → "No data available for gap analysis."
- `null` inputs → no crash (safeArray / safeGet protect all paths)

---

## Feature C: Reputation Score & Summary (`--reputation`)

**API calls:** `GET /v1/metrics/sentiment`  
**Function:** `computeReputationScore(sentimentData)`  
**Status:** ✅ PASS

### Sample output (mock data with sentiment keywords)
```
-------------------------------------------------------
              REPUTATION SCORE & SUMMARY
-------------------------------------------------------
  Score:  ██████████████████░░░░░░░░░░░░ 61/100
  Status: Good   Trend: ↑ improving

  Sentiment breakdown:
    Positive: 56.2%  Negative: 15.7%  Neutral: 28.1%

  Top positive signals:
    easy to use, great support, powerful

  Risk areas:
    expensive, slow

  Summary: Brand health is good (61/100) and improving.
           Monitor: expensive, slow.
-------------------------------------------------------
```

### Live API output (sparse data — brand without sentiment keywords)
```
  Score:  ███████████████░░░░░░░░░░░░░░░ 50/100
  Status: Fair   Trend: → stable
  Sentiment breakdown:
    Positive: 0%  Negative: 0%  Neutral: 0%
  No positive keywords found.
  No significant risk areas.
  Summary: Brand health is fair (50/100) and stable.
```

### Edge cases
- `null` input → score 50, stable, no keywords (neutral default)
- `{}` empty object → same neutral fallback
- Keywords as strings (not objects) → coerced correctly via `toKwList`
- Missing `engineBreakdown` → engineScore = 0 (skips engine weighting)

---

## Backward Compatibility

All existing flags (`--discover-brands`, standard report) tested and unaffected.
Running without GEO flags → full report renders as before (✅).

---

## Files Modified

| File | Change |
|------|--------|
| `rankscale-skill.js` | +3 new functions, CLI flags, help text, exports |
| `references/geo-constants.js` | NEW — ENGINE_WEIGHTS, GEO_PATTERNS, REPUTATION_SCORE_WEIGHTS |
| `test-results.md` | NEW — this file |
