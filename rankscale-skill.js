#!/usr/bin/env node
/**
 * rankscale-skill.js
 * RS-126 — Rankscale GEO Analytics Skill
 *
 * Main skill logic for fetching and interpreting Rankscale
 * GEO (Generative Engine Optimization) analytics data.
 *
 * Usage:
 *   node rankscale-skill.js [--brand-id <id>] [--api-key <key>]
 *   RANKSCALE_API_KEY=rk_xxx RANKSCALE_BRAND_ID=xxx node rankscale-skill.js
 */

'use strict';

const https = require('https');
const path = require('path');
const fs = require('fs');

// ─── Config ──────────────────────────────────────────────
const API_BASE =
  'https://us-central1-rankscale-2e08e.cloudfunctions.net';
const WIDTH = 55;
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 1000;

// ─── Safe Accessor Helpers ───────────────────────────────

/**
 * Safely get a nested property by dot-path.
 * Returns defaultVal if any part of the path is null/undefined
 * or if obj itself is falsy.
 *
 * @param {object} obj
 * @param {string} path  - e.g. 'data.ownBrandMetrics.visibilityScore'
 * @param {*}      [defaultVal=null]
 * @returns {*}
 * @example safeGet(raw, 'data.ownBrandMetrics.visibilityScore', 0)
 */
function safeGet(obj, path, defaultVal = null) {
  if (!obj) return defaultVal;
  const keys = path.split('.');
  let cur = obj;
  for (const key of keys) {
    if (cur == null || typeof cur !== 'object') return defaultVal;
    cur = cur[key];
  }
  return cur ?? defaultVal;
}

/**
 * Safe numeric coercion.
 * Returns defaultVal when val is null, undefined, NaN, or non-finite.
 *
 * @param {*}      val
 * @param {number} [defaultVal=0]
 * @returns {number}
 */
function safeNum(val, defaultVal = 0) {
  if (val == null) return defaultVal;
  const n = Number(val);
  return Number.isFinite(n) ? n : defaultVal;
}

/**
 * Safe toFixed that handles null/undefined/NaN.
 * Returns a rounded number (not a string).
 *
 * @param {*}      val
 * @param {number} [decimals=1]
 * @param {number} [defaultVal=0]
 * @returns {number}
 */
function safeFixed(val, decimals = 1, defaultVal = 0) {
  const n = safeNum(val, defaultVal);
  return +n.toFixed(decimals);
}

/**
 * Safe array — always returns an array regardless of input.
 *
 * @param {*} val
 * @returns {Array}
 */
function safeArray(val) {
  return Array.isArray(val) ? val : [];
}

// ─── Credential Resolution ───────────────────────────────
function resolveCredentials(args = {}) {
  const apiKey =
    args.apiKey ||
    process.env.RANKSCALE_API_KEY ||
    null;

  const brandId =
    args.brandId ||
    process.env.RANKSCALE_BRAND_ID ||
    extractBrandIdFromKey(apiKey) ||
    null;

  return { apiKey, brandId };
}

/**
 * Rankscale API keys encode the brand ID:
 *   rk_<hash>_<brandId>
 */
function extractBrandIdFromKey(apiKey) {
  if (!apiKey) return null;
  const parts = apiKey.split('_');
  return parts.length >= 3 ? parts[parts.length - 1] : null;
}

// ─── HTTP Client ─────────────────────────────────────────
/**
 * @param {string} endpoint  - function name e.g. 'metricsV1Report'
 * @param {string} apiKey
 * @param {string} method    - 'GET' or 'POST'
 * @param {object|null} body - POST body (will be JSON-encoded)
 * @param {number} retries
 */
function apiRequest(endpoint, apiKey, method = 'GET', body = null, retries = 0) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}/${endpoint}`;
    const bodyStr = body ? JSON.stringify(body) : null;
    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'openclaw-rs-geo-analytics/1.0.0',
    };
    if (bodyStr) {
      headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const parsed = new URL(url);
    const reqOptions = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method,
      headers,
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        // Rate limit: exponential backoff
        if (res.statusCode === 429 && retries < MAX_RETRIES) {
          const delay =
            BACKOFF_BASE_MS * Math.pow(2, retries) +
            Math.random() * 500;
          setTimeout(
            () =>
              apiRequest(endpoint, apiKey, method, body, retries + 1)
                .then(resolve)
                .catch(reject),
            delay
          );
          return;
        }

        if (res.statusCode === 401 || res.statusCode === 403) {
          reject(
            new AuthError(
              `Authentication failed (HTTP ${res.statusCode}). ` +
                'Check your RANKSCALE_API_KEY.'
            )
          );
          return;
        }

        if (res.statusCode === 404) {
          reject(
            new NotFoundError(
              `Brand ID not found (HTTP 404). ` +
                `Run brand discovery to find valid IDs:\n` +
                `  RANKSCALE_API_KEY=xxx ` +
                `node rankscale-skill.js --discover-brands`
            )
          );
          return;
        }

        if (res.statusCode >= 500) {
          if (retries < MAX_RETRIES) {
            const delay =
              BACKOFF_BASE_MS * Math.pow(2, retries);
            setTimeout(
              () =>
                apiRequest(endpoint, apiKey, method, body, retries + 1)
                  .then(resolve)
                  .catch(reject),
              delay
            );
            return;
          }
          reject(
            new ApiError(
              `Server error on ${endpoint} (HTTP ${res.statusCode})`
            )
          );
          return;
        }

        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(
            new ApiError(
              `Invalid JSON response from ${endpoint}: ${e.message}`
            )
          );
        }
      });
    });

    req.setTimeout(15000, () => {
      req.destroy();
      if (retries < MAX_RETRIES) {
        apiRequest(endpoint, apiKey, method, body, retries + 1)
          .then(resolve)
          .catch(reject);
      } else {
        reject(new ApiError(`Timeout on ${endpoint}`));
      }
    });

    req.on('error', (err) => {
      if (retries < MAX_RETRIES) {
        const delay = BACKOFF_BASE_MS * Math.pow(2, retries);
        setTimeout(
          () =>
            apiRequest(endpoint, apiKey, method, body, retries + 1)
              .then(resolve)
              .catch(reject),
          delay
        );
      } else {
        reject(
          new ApiError(`Network error on ${endpoint}: ${err.message}`)
        );
      }
    });

    if (bodyStr) {
      req.write(bodyStr);
    }
    req.end();
  });
}

// ─── Custom Errors ────────────────────────────────────────
class AuthError extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'AuthError';
  }
}
class NotFoundError extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'NotFoundError';
  }
}
class ApiError extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'ApiError';
  }
}

// ─── API Calls ────────────────────────────────────────────

/** GET /metricsV1Brands — list brands on this account */
async function fetchBrands(apiKey) {
  return apiRequest('metricsV1Brands', apiKey, 'GET');
}

/** POST /metricsV1Report — visibility score, rank, competitors */
async function fetchReport(apiKey, brandId) {
  return apiRequest('metricsV1Report', apiKey, 'POST', { brandId });
}

/** POST /metricsV1SearchTermsReport — top queries with detection */
async function fetchSearchTermsReport(apiKey, brandId) {
  return apiRequest('metricsV1SearchTermsReport', apiKey, 'POST', { brandId });
}

/** POST /metricsV1SearchTerms — raw search terms */
async function fetchSearchTerms(apiKey, brandId) {
  return apiRequest('metricsV1SearchTerms', apiKey, 'POST', { brandId });
}

/**
 * POST /metricsV1Citations — standalone citation metrics.
 * Response shapes:
 *   Format A: { brandId, count, rate, industryAvg, sources: [...] }
 *   Format B: { total, citationRate, benchmarkRate, topSources: [...] }
 *
 * @param {string} apiKey
 * @param {string} brandId
 * @returns {Promise<object>}
 */
async function fetchCitations(apiKey, brandId) {
  return apiRequest('metricsV1Citations', apiKey, 'POST', { brandId });
}

/**
 * POST /metricsV1Sentiment — standalone sentiment metrics.
 * Response shapes:
 *   Format A: { positive: 0.61, neutral: 0.29, negative: 0.10, sampleSize: 412 }
 *   Format B: { scores: { pos: 61, neu: 29, neg: 10 }, sampleSize: 412 }
 *   Format C: { positive: 61, neutral: 29, negative: 10 }
 *
 * @param {string} apiKey
 * @param {string} brandId
 * @returns {Promise<object>}
 */
async function fetchSentiment(apiKey, brandId) {
  return apiRequest('metricsV1Sentiment', apiKey, 'POST', { brandId });
}

// ─── Brands Normalization ─────────────────────────────────
/** Extract brands array from API response (handles envelope) */
function normalizeBrands(raw) {
  if (!raw) return [];
  // Real API: { success: true, data: { brands: [...] } }
  const d = raw.data || raw;
  if (d.brands) return d.brands;
  if (Array.isArray(d)) return d;
  // Fallback: maybe data itself is the brands array
  return [];
}

// ─── Brand Discovery ─────────────────────────────────────
async function discoverBrandId(apiKey, brandName) {
  const raw = await fetchBrands(apiKey);
  const brands = normalizeBrands(raw);

  if (!Array.isArray(brands) || brands.length === 0) {
    throw new NotFoundError(
      'No brands found on this account. ' +
        'Please set up a brand at https://app.rankscale.ai'
    );
  }

  if (brands.length === 1) {
    return brands[0].id || brands[0].brandId;
  }

  // Try to match by name if provided
  if (brandName) {
    const match = brands.find(
      (b) =>
        (b.name || b.brandName || '')
          .toLowerCase()
          .includes(brandName.toLowerCase())
    );
    if (match) return match.id || match.brandId;
  }

  // Return first brand + log available
  console.error(
    `Multiple brands found. Using: ${brands[0].name || brands[0].id}`
  );
  console.error(
    'Set RANKSCALE_BRAND_ID to specify: ' +
      brands.map((b) => `${b.name || '?'} (${b.id})`).join(', ')
  );
  return brands[0].id || brands[0].brandId;
}

// ─── Data Normalization ───────────────────────────────────

/**
 * Normalize sentiment — Rankscale returns three formats:
 *   Format A: { positive: 0.61, negative: 0.10, neutral: 0.29 }  (floats 0–1)
 *   Format B: { scores: { pos: 61, neg: 10, neu: 29 } }           (integers 0–100)
 *   Format C: { positive: 61, neutral: 29, negative: 10 }         (percentages)
 *
 * Fixes F5: operator precedence bug — (pos + neg + neu) || 100
 */
function normalizeSentiment(raw) {
  if (!raw) return { positive: 0, negative: 0, neutral: 0 };

  // Format B: nested scores object
  if (raw.scores) {
    const s = raw.scores;
    const pos = safeNum(s.pos ?? s.positive);
    const neg = safeNum(s.neg ?? s.negative);
    const neu = safeNum(s.neu ?? s.neutral);
    const total = (pos + neg + neu) || 100;  // explicit parentheses to fix precedence
    return {
      positive: safeFixed(pos / total * 100),
      negative: safeFixed(neg / total * 100),
      neutral: safeFixed(neu / total * 100),
    };
  }

  // Format A / C: flat fields — may be 0–1 floats or 0–100 integers
  const pos = safeNum(raw.positive ?? raw.pos);
  const neg = safeNum(raw.negative ?? raw.neg);
  const neu = safeNum(raw.neutral ?? raw.neu);

  // Detect float (0–1) vs percentage (0–100)
  if (pos <= 1 && neg <= 1 && neu <= 1 && (pos + neg + neu) <= 3) {
    return {
      positive: safeFixed(pos * 100),
      negative: safeFixed(neg * 100),
      neutral: safeFixed(neu * 100),
    };
  }

  return {
    positive: safeFixed(pos),
    negative: safeFixed(neg),
    neutral: safeFixed(neu),
  };
}

/**
 * Normalize citations response.
 * Handles: { count, rate, sources } or { total, citationRate, topSources }
 */
function normalizeCitations(raw) {
  if (!raw) return { count: 0, rate: 0, sources: [] };
  return {
    count: raw.count ?? raw.total ?? raw.citationCount ?? 0,
    rate: raw.rate ?? raw.citationRate ?? raw.percentage ?? 0,
    sources: raw.sources || raw.topSources || [],
    industryAvg: raw.industryAvg ?? raw.benchmarkRate ?? null,
  };
}

/**
 * Return a canonical empty report object used when the API fails or
 * the response cannot be parsed.
 *
 * @returns {object}
 */
function emptyReport() {
  return {
    score: 0,
    rank: null,
    change: 0,
    brandName: 'Your Brand',
    detectionRate: null,
    engines: {},
    competitors: [],
    _citationsRaw: { count: 0, rate: 0 },
    _sentimentRaw: null,
  };
}

/**
 * Normalize report response.
 *
 * Real API response shape (metricsV1Report):
 *   { data: {
 *       ownBrandMetrics: {
 *         visibilityScore, detectionRate, sentiment, citations,
 *         trends: { visibilityScore },
 *         engineMetricsData: { daily: [{engineId, engineName, visibilityScore:[...]}] }
 *       },
 *       competitorMetrics: [{name, visibilityScore, latestValue}]
 *     }
 *   }
 *
 * Also handles legacy flat format: { score, rank, change }
 *
 * Fixes F1: safeFixed(detectionRate) — no more .toFixed() on undefined
 * Fixes F2: (own.trends || {}).visibilityScore — guard against undefined trends
 */
function normalizeReport(raw) {
  if (!raw) return emptyReport();

  // Unwrap API envelope if present
  const d = raw.data || raw;
  const own = d.ownBrandMetrics || d;
  const competitorsRaw = safeArray(d.competitorMetrics || raw.competitors);

  // Score change from trends — guard own.trends being undefined (F2)
  const trends = own.trends || {};
  const change = safeNum(
    trends.visibilityScore ?? raw.change ?? raw.weeklyDelta ?? raw.delta,
    0
  );

  // Build per-engine map using the most recent value of each engine
  const engineEntries = own.engineMetricsData || {};
  const engineDaily = safeArray(engineEntries.daily || engineEntries.weekly);
  const engines = {};
  engineDaily.forEach((e) => {
    const scores = safeArray(e.visibilityScore);
    if (scores.length > 0) {
      const label = e.engineName || e.engineId || 'unknown';
      // Use the last (most recent) score
      engines[label] = safeNum(scores[scores.length - 1]);
    }
  });

  // Detection rate — use safeNum to avoid .toFixed() crash (F1)
  const detectionRate = safeNum(
    own.detectionRate ?? raw.detectionRate,
    null
  );

  // Sentiment — API returns a single composite number (0–100)
  // We synthesize positive/negative from it for compatibility
  const sentimentScore = safeNum(own.sentiment ?? raw.sentiment, null);

  return {
    score: safeNum(
      own.visibilityScore ?? own.score ?? raw.score ?? raw.geoScore,
      0
    ),
    rank: own.rank ?? raw.rank ?? null,
    change: safeFixed(change),
    brandName: own.brandName ?? raw.brandName ?? raw.brand ?? 'Your Brand',
    detectionRate: detectionRate != null ? safeFixed(detectionRate) : null,
    engines,
    competitors: competitorsRaw,
    // Stash raw citation + sentiment values for downstream normalization
    _citationsRaw: {
      count: safeNum(own.citations, 0),
      // Use detectionRate as the citation rate proxy (both measure presence)
      rate: safeNum(own.detectionRate ?? own.citations, 0),
    },
    _sentimentRaw:
      sentimentScore != null
        ? buildSentimentFromScore(sentimentScore)
        : null,
  };
}

/**
 * Convert a composite sentiment score (0–100) to pos/neu/neg breakdown.
 * High sentiment → more positive; low → more negative.
 *
 * Uses safeNum() to handle string scores gracefully (F3).
 *
 * @param {number|string} score  - composite sentiment score 0–100
 * @returns {{ positive: number, negative: number, neutral: number }}
 */
function buildSentimentFromScore(score) {
  // Coerce safely — handles strings like "65" without arithmetic errors
  const positive = Math.min(100, Math.max(0, safeFixed(safeNum(score))));
  // Model: pos + neu + neg = 100, neg is roughly (100 - score) * 0.3
  const negative = Math.max(0, safeFixed((100 - positive) * 0.3));
  const neutral = safeFixed(100 - positive - negative);
  return { positive, negative, neutral };
}

/**
 * Normalize search terms.
 *
 * Real API response shape (metricsV1SearchTermsReport):
 *   { data: { timeFrame, searchTerms: [{searchTermId, query, ...}] } }
 *
 * Also handles:
 *   Legacy: { terms: [{query, mentions}] }
 *   Bare array: [{query, count}]
 *
 * Fixes F9: guards t.aiSearchEngines with Array.isArray() before .length
 */
function normalizeSearchTerms(raw) {
  if (!raw) return [];

  // Unwrap API envelope
  const d = raw.data || raw;

  // Resolve terms array from any known field name, including bare-array response
  const terms = safeArray(
    d.searchTerms ||
    d.terms ||
    d.results ||
    (Array.isArray(d) ? d : [])
  );

  // Deduplicate by query, summing mentions
  const seen = new Map();
  terms.forEach((t) => {
    if (!t) return;  // null guard
    const q = t.query || t.term || t.keyword || t.name || '';
    if (!q) return;
    // Use Array.isArray() guard to prevent .length crash (F9)
    const m = safeNum(
      t.mentions ?? t.count ?? t.frequency ??
      (Array.isArray(t.aiSearchEngines) ? t.aiSearchEngines.length : 0)
    );
    seen.set(q, (seen.get(q) || 0) + m);
  });

  return Array.from(seen.entries())
    .map(([query, mentions]) => ({ query, mentions }))
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 10);
}

/**
 * Normalize competitors array from report.
 * Returns top 3 with delta vs brand visibility.
 *
 * Format: "CompetitorName: Score [±X% vs us]"
 *
 * Fixes F4: guards against Infinity delta when score or brandScore is 0.
 */
function normalizeCompetitors(competitorsRaw, brandScore) {
  if (!Array.isArray(competitorsRaw) || competitorsRaw.length === 0) {
    return [];
  }

  return competitorsRaw
    .filter((c) => c && !c.isOwnBrand)  // null guard + exclude own brand
    .map((c) => {
      const name = c.name || c.brandName || c.competitor || 'Unknown';
      const score = safeNum(
        c.latestValue ?? c.visibilityScore ?? c.score ?? c.geoScore ?? c.visibility
      );
      // Delta: how much AHEAD (+) or BEHIND (-) we are vs competitor
      // (brand - competitor) / competitor * 100
      // Guard: skip if either side is 0 or null to avoid Infinity/NaN (F4)
      let delta = null;
      if (score > 0 && brandScore != null && brandScore > 0) {
        delta = Math.round(((brandScore - score) / score) * 100);
      }
      return { name, score, delta };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// ─── GEO Interpretation Module ───────────────────────────

const GEO_RULES = [
  {
    id: 'R1',
    name: 'Low Citation Rate',
    severity: 'WARN',
    check: (data) => data.citations.rate < 40,
    recommendation:
      'Citation rate below 40% target.\n' +
      '  Action: Publish 2+ authoritative comparison\n' +
      '  articles and press releases this month.\n' +
      '  Target sources: industry blogs, news sites.',
  },
  {
    id: 'R2',
    name: 'Critical Citation Rate',
    severity: 'CRIT',
    check: (data) => data.citations.rate < 20,
    recommendation:
      'Citation rate critically low (<20%).\n' +
      '  Action: Immediate content blitz needed.\n' +
      '  Submit brand to 5+ AI-indexed directories.\n' +
      '  Build backlinks from authoritative sources.',
  },
  {
    id: 'R3',
    name: 'Negative Sentiment Spike',
    severity: 'CRIT',
    check: (data) => data.sentiment.negative > 25,
    recommendation:
      'Negative sentiment exceeds 25%.\n' +
      '  Action: Audit top negative queries.\n' +
      '  Create rebuttal/FAQ content addressing\n' +
      '  negative narratives. Monitor weekly.',
  },
  {
    id: 'R4',
    name: 'Low GEO Score',
    severity: 'CRIT',
    check: (data) => data.report.score < 40,
    recommendation:
      'GEO score critically low (<40).\n' +
      '  Action: Comprehensive GEO audit needed.\n' +
      '  Add schema markup, improve content depth,\n' +
      '  and increase citation velocity.',
  },
  {
    id: 'R5',
    name: 'Medium GEO Score',
    severity: 'WARN',
    check: (data) =>
      data.report.score >= 40 && data.report.score < 65,
    recommendation:
      'GEO score in growth zone (40–64).\n' +
      '  Action: Focus on 3 high-volume search terms.\n' +
      '  Create dedicated landing pages optimized\n' +
      '  for AI answer inclusion.',
  },
  {
    id: 'R6',
    name: 'Negative Score Trend',
    severity: 'WARN',
    check: (data) => data.report.change < -5,
    recommendation:
      'GEO score declining (>' + Math.abs(-5) + ' pts drop).\n' +
      '  Action: Identify content gaps causing drop.\n' +
      '  Review which competitors gained citations\n' +
      '  and match their content strategy.',
  },
  {
    id: 'R7',
    name: 'Positive Momentum',
    severity: 'INFO',
    check: (data) =>
      data.report.change >= 3 && data.sentiment.positive > 55,
    recommendation:
      'Strong positive momentum detected.\n' +
      '  Action: Maintain current content cadence.\n' +
      '  Double down on formats producing citations.\n' +
      '  Consider expanding to adjacent topics.',
  },
  {
    id: 'R8',
    name: 'Content Gap Investigation',
    severity: 'WARN',
    check: (data) =>
      data.report.detectionRate != null &&
      data.report.detectionRate < 70,
    recommendation:
      'Detection rate below 70% — brand not cited\n' +
      '  in AI results for many queries.\n' +
      '  Action: Research underrepresented topics;\n' +
      '  create content targeting those gaps.\n' +
      '  Timeline: 2–4 weeks to improve detection.',
  },
  {
    id: 'R9',
    name: 'Competitive Benchmark',
    severity: 'WARN',
    check: (data) => {
      const comps = data.report.competitors || [];
      if (comps.length === 0) return false;
      const topScore = Math.max(...comps.map(
        (c) => c.score ?? c.visibilityScore ?? c.geoScore ?? 0
      ));
      return topScore - data.report.score > 15;
    },
    recommendation:
      'A top competitor is >15 pts ahead in\n' +
      '  visibility. Root cause: better content,\n' +
      '  more citations, or stronger authority.\n' +
      '  Action: Analyze competitor content strategy;\n' +
      '  identify differentiation opportunities.\n' +
      '  Timeline: 4–8 weeks to close the gap.',
  },
  {
    id: 'R10',
    name: 'Engine-Specific Optimization',
    severity: 'WARN',
    check: (data) => {
      const engines = data.report.engines || {};
      const scores = Object.values(engines).filter(
        (v) => typeof v === 'number'
      );
      if (scores.length < 2) return false;
      return Math.max(...scores) - Math.min(...scores) > 30;
    },
    recommendation:
      'Engine visibility spread >30 pts detected.\n' +
      '  Root cause: Engines (e.g., ChatGPT) favor\n' +
      '  different content signals than others.\n' +
      '  Action: Audit top engine\'s citations/\n' +
      '  keywords; optimize for those signals.\n' +
      '  Timeline: 3–6 weeks.',
  },
];

/**
 * Run interpretation rules and return top 3–5 insights.
 */
function interpretGeoData(data) {
  const triggered = GEO_RULES.filter((rule) => {
    try {
      return rule.check(data);
    } catch {
      return false;
    }
  });

  // Deduplicate: if CRIT for R2 fires, skip WARN R1 (same dimension)
  const deduplicated = triggered.filter((rule, idx, arr) => {
    if (rule.id === 'R1') {
      return !arr.find((r) => r.id === 'R2');
    }
    return true;
  });

  // Sort: CRIT > WARN > INFO
  const order = { CRIT: 0, WARN: 1, INFO: 2 };
  deduplicated.sort(
    (a, b) => (order[a.severity] ?? 3) - (order[b.severity] ?? 3)
  );

  return deduplicated.slice(0, 5);
}

// ─── GEO Constants ───────────────────────────────────────
const {
  ENGINE_WEIGHTS,
  ENGINE_WEIGHT_DEFAULT,
  GEO_PATTERNS,
  REPUTATION_SCORE_WEIGHTS,
} = require('./references/geo-constants.js');

// ─── Feature A: Engine Strength Profile ──────────────────
/**
 * Produces an ASCII heatmap of visibility by engine.
 * Highlights top-3 (✦) and bottom-3 (▼) engines.
 *
 * @param {object} reportData  - normalizeReport() output
 * @returns {string}           - formatted ASCII block
 */
function analyzeEngineStrength(reportData) {
  const engines = safeGet(reportData, 'engines', {});
  const entries = Object.entries(engines)
    .map(([name, score]) => ({ name, score: safeNum(score) }))
    .filter((e) => e.score > 0 || Object.keys(engines).length > 0)
    .sort((a, b) => b.score - a.score);

  if (entries.length === 0) {
    return line() + '\n ENGINE STRENGTH PROFILE\n' +
      line() + '\n  No engine data available.\n' + line();
  }

  const scores = entries.map((e) => e.score);
  const avg = scores.reduce((a, b) => a + b, 0) / (scores.length || 1);
  const max = Math.max(...scores, 1);

  const BAR_WIDTH = 22;
  const topSet = new Set(entries.slice(0, 3).map((e) => e.name));
  const botSet = new Set(entries.slice(-3).map((e) => e.name));

  const rows = entries.map(({ name, score }) => {
    const barLen = Math.round((score / max) * BAR_WIDTH);
    const bar = '█'.repeat(barLen).padEnd(BAR_WIDTH);
    const tag = topSet.has(name) ? ' ✦' : botSet.has(name) ? ' ▼' : '  ';
    const label = name.padEnd(12).slice(0, 12);
    const pct = String(safeFixed(score, 1)).padStart(5);
    return `  ${label} ${bar}${pct}${tag}`;
  });

  const avgLine = `  ${'Average'.padEnd(12)} ${
    '─'.repeat(Math.round((avg / max) * BAR_WIDTH)).padEnd(BAR_WIDTH)
  }${String(safeFixed(avg, 1)).padStart(5)}`;

  return [
    line(),
    center('ENGINE STRENGTH PROFILE'),
    line(),
    `  ${'Engine'.padEnd(12)} ${'Visibility'.padEnd(BAR_WIDTH)}Score`,
    avgLine,
    line('-'),
    ...rows,
    line(),
    `  ✦ Top-3 engines  ▼ Bottom-3 engines`,
  ].join('\n');
}

// ─── Feature B: Content Gap Analysis ─────────────────────
/**
 * Identifies content gaps across engines and search terms.
 * Cross-references visibility with engine averages to surface
 * terms/engines needing attention.
 *
 * @param {object} reportData      - normalizeReport() output
 * @param {object} searchTermsData - normalizeSearchTerms() output
 * @returns {string}               - formatted gap analysis block
 */
function analyzeContentGaps(reportData, searchTermsData) {
  const engineBreakdown = safeArray(
    safeGet(reportData, 'engineBreakdown')
  );
  const terms = safeArray(
    safeGet(searchTermsData, 'terms') ||
    safeGet(searchTermsData, 'searchTerms') ||
    safeGet(searchTermsData, 'data')
  );

  const lines = [
    line(),
    center('CONTENT GAP ANALYSIS'),
    line(),
  ];

  // ── Engine-level gaps ──────────────────────────────────
  if (engineBreakdown.length > 0) {
    const scores = engineBreakdown.map((e) =>
      safeNum(e.score ?? e.visibility ?? e.visibilityScore)
    );
    const overallAvg = scores.reduce((a, b) => a + b, 0) /
      (scores.length || 1);

    const weakEngines = engineBreakdown
      .map((e) => ({
        engine: safeGet(e, 'engine', 'unknown'),
        score: safeNum(e.score ?? e.visibility ?? e.visibilityScore),
      }))
      .filter(
        (e) =>
          overallAvg - e.score >
          GEO_PATTERNS.CONTENT_GAP_ENGINE_DROP_PTS
      )
      .sort((a, b) => a.score - b.score);

    lines.push('  ENGINE GAPS (vs avg ' +
      safeFixed(overallAvg, 1) + '):');

    if (weakEngines.length === 0) {
      lines.push('  No significant engine gaps detected.');
    } else {
      weakEngines.slice(0, 5).forEach(({ engine, score }) => {
        const drop = safeFixed(overallAvg - score, 1);
        lines.push(
          `  ▼ ${engine.padEnd(14)} score:${
            String(safeFixed(score, 1)).padStart(5)
          }  gap:-${drop}`
        );
      });
    }
    lines.push('');
  }

  // ── Term-level gaps ────────────────────────────────────
  if (terms.length > 0) {
    // Identify low-visibility terms (<50% visibility)
    const lowVis = terms
      .map((t) => ({
        term: String(safeGet(t, 'term', safeGet(t, 'query', '?'))),
        visibility: safeNum(
          t.visibility ?? t.visibilityScore ?? t.score
        ),
      }))
      .filter((t) => t.visibility < 50)
      .sort((a, b) => a.visibility - b.visibility);

    lines.push(
      `  LOW-VISIBILITY TERMS (<50%) — ${lowVis.length} found:`
    );

    if (lowVis.length === 0) {
      lines.push('  All terms above 50% visibility. ✓');
    } else {
      lowVis.slice(0, 8).forEach(({ term, visibility }) => {
        const bar = '░'.repeat(Math.round(visibility / 5)).padEnd(20);
        lines.push(
          `  ${term.slice(0, 22).padEnd(22)} ${bar}${
            String(safeFixed(visibility, 0)).padStart(4)}%`
        );
      });
      if (lowVis.length > 8) {
        lines.push(`  … and ${lowVis.length - 8} more gaps`);
      }
    }
    lines.push('');

    // Priority recommendations
    lines.push('  RECOMMENDATIONS:');
    if (lowVis.length > 0) {
      lines.push(
        `  1. Create content targeting top ${
          Math.min(lowVis.length, 3)
        } gap terms:`
      );
      lowVis.slice(0, 3).forEach(({ term }) => {
        lines.push(`     • "${term}"`);
      });
    }
    if (engineBreakdown.length > 0) {
      const scores = engineBreakdown.map((e) =>
        safeNum(e.score ?? e.visibility ?? e.visibilityScore)
      );
      const avg = scores.reduce((a, b) => a + b, 0) /
        (scores.length || 1);
      const weakest = engineBreakdown
        .sort(
          (a, b) =>
            safeNum(a.score ?? a.visibility) -
            safeNum(b.score ?? b.visibility)
        )
        .slice(0, 1);
      if (weakest.length) {
        const e = weakest[0];
        const eName = safeGet(e, 'engine', 'unknown');
        lines.push(
          `  2. Optimise for ${eName}: score ` +
          `${safeFixed(
            safeNum(e.score ?? e.visibility ?? e.visibilityScore), 1
          )} vs avg ${safeFixed(avg, 1)}`
        );
      }
    }
  } else if (engineBreakdown.length === 0) {
    lines.push('  No data available for gap analysis.');
  }

  lines.push(line());
  return lines.join('\n');
}

// ─── Feature C: Reputation Score & Summary ───────────────
/**
 * Computes a 0-100 brand reputation score from sentiment data.
 * Algorithm: 60% base ratio + 20% engine score - 20% severity penalty.
 *
 * @param {object} sentimentData - normalizeSentiment() output
 * @returns {string}             - formatted reputation block
 */
function computeReputationScore(sentimentData) {
  const W = REPUTATION_SCORE_WEIGHTS;

  // Flatten keyword lists — handles both [{keyword,count}] and [string]
  const toKwList = (arr) =>
    safeArray(arr).map((k) =>
      typeof k === 'object' && k !== null
        ? { keyword: String(k.keyword || k.text || k), count: safeNum(k.count || k.frequency, 1) }
        : { keyword: String(k), count: 1 }
    );

  const posKws = toKwList(safeGet(sentimentData, 'positiveKeywords'));
  const negKws = toKwList(safeGet(sentimentData, 'negativeKeywords'));
  const neuKws = toKwList(safeGet(sentimentData, 'neutralKeywords'));

  const posCount = posKws.reduce((s, k) => s + k.count, 0);
  const negCount = negKws.reduce((s, k) => s + k.count, 0);
  const neuCount = neuKws.reduce((s, k) => s + k.count, 0);
  const total = posCount + negCount + neuCount || 1;

  // Step A: Base ratio (-1 to +1)
  const baseRatio = (posCount - 2 * negCount) / total;

  // Step B: Severity penalty — high-frequency negatives penalise more
  const severityPenalty = negKws.reduce(
    (sum, k) => sum + (k.count / total) ** 2,
    0
  );

  // Step C: Engine-weighted sentiment score
  const engineBreakdown = safeArray(
    safeGet(sentimentData, 'engineBreakdown')
  );
  const totalEngineWeight = Object.values(ENGINE_WEIGHTS).reduce(
    (a, b) => a + b,
    0
  );
  const engineScore =
    engineBreakdown.length > 0
      ? engineBreakdown.reduce((acc, e) => {
          const wt =
            ENGINE_WEIGHTS[String(e.engine).toLowerCase()] ||
            ENGINE_WEIGHT_DEFAULT;
          return acc + safeNum(e.sentiment) * wt;
        }, 0) / totalEngineWeight
      : 0;

  // Combine
  const raw =
    baseRatio * W.BASE_RATIO +
    engineScore * W.ENGINE_SCORE -
    severityPenalty * W.SEVERITY_PENALTY;

  const score = Math.round(
    Math.max(0, Math.min(100, (raw + W.NORM_OFFSET) * W.NORM_SCALE))
  );

  // Trend: use report change or sentiment trend if available
  const sentimentTrend = safeGet(sentimentData, 'trend', null);
  let trend = 'stable';
  if (sentimentTrend === 'up' || sentimentTrend === 'improving') {
    trend = 'improving';
  } else if (sentimentTrend === 'down' || sentimentTrend === 'declining') {
    trend = 'declining';
  }

  // Risk areas: top negative keywords by count
  const riskAreas = negKws
    .sort((a, b) => b.count - a.count)
    .slice(0, W.TOP_RISK_KEYWORDS)
    .map((k) => k.keyword);

  // Top positive keywords
  const topPos = posKws
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((k) => k.keyword);

  // Score label
  const scoreLabel =
    score >= 75 ? 'Excellent' :
    score >= 60 ? 'Good' :
    score >= 45 ? 'Fair' :
    score >= 30 ? 'Poor' : 'Critical';

  // Trend arrow
  const trendArrow =
    trend === 'improving' ? '↑' :
    trend === 'declining' ? '↓' : '→';

  // Summary sentence
  const summary =
    `Brand health is ${scoreLabel.toLowerCase()} (${score}/100) ` +
    `and ${trend}.` +
    (riskAreas.length
      ? ` Monitor: ${riskAreas.slice(0, 2).join(', ')}.`
      : '');

  // Score bar
  const barLen = Math.round(score / 100 * 30);
  const scoreBar = '█'.repeat(barLen) + '░'.repeat(30 - barLen);

  return [
    line(),
    center('REPUTATION SCORE & SUMMARY'),
    line(),
    `  Score:  ${scoreBar} ${score}/100`,
    `  Status: ${scoreLabel}   Trend: ${trendArrow} ${trend}`,
    '',
    `  Sentiment breakdown:`,
    `    Positive: ${safeFixed(posCount / total * 100, 1)}%` +
      `  Negative: ${safeFixed(negCount / total * 100, 1)}%` +
      `  Neutral: ${safeFixed(neuCount / total * 100, 1)}%`,
    '',
    topPos.length
      ? `  Top positive signals:\n    ${topPos.join(', ')}`
      : '  No positive keywords found.',
    '',
    riskAreas.length
      ? `  Risk areas:\n    ${riskAreas.join(', ')}`
      : '  No significant risk areas.',
    '',
    `  Summary: ${summary}`,
    line(),
  ].join('\n');
}

// ─── ASCII Renderer ───────────────────────────────────────
function pad(str, width) {
  const s = String(str);
  return s.padEnd(width).slice(0, width);
}

function line(char = '-') {
  return char.repeat(WIDTH);
}

function center(str) {
  const s = String(str).slice(0, WIDTH - 2);
  const total = WIDTH - s.length;
  const left = Math.floor(total / 2);
  return ' '.repeat(left) + s;
}

function renderCompetitors(competitors, brandScore) {
  if (!competitors || competitors.length === 0) return [];
  const lines = [];
  lines.push(line('-'));
  lines.push('  COMPETITOR COMPARISON');
  competitors.forEach((c) => {
    const name = String(c.name).slice(0, 20);
    const score = String(c.score).padStart(3);
    let deltaStr = '';
    if (c.delta != null) {
      const sign = c.delta >= 0 ? '+' : '';
      const flag = c.delta >= 0 ? '🟢' : '🔴';
      deltaStr = ` ${flag} [${sign}${c.delta}% vs us]`;
    }
    // "  CompetitorName:  72 [+15% vs us]"
    const row = `  ${name.padEnd(20)}: ${score}${deltaStr}`;
    lines.push(row.slice(0, WIDTH));
  });
  return lines;
}

function renderReport(data, insights, brandId, competitors) {
  const { report, citations, sentiment, searchTerms } = data;
  const lines = [];
  const ts = new Date().toISOString().slice(0, 10);

  lines.push(line('='));
  lines.push(center('RANKSCALE GEO REPORT'));
  lines.push(
    center(`Brand: ${report.brandName} | ${ts}`)
  );
  lines.push(line('='));

  // Score block
  const changeStr =
    report.change > 0
      ? `+${report.change}`
      : String(report.change);
  lines.push(
    `  GEO SCORE:     ${String(report.score).padStart(3)} / 100` +
      `   [${changeStr} vs last week]`
  );

  const rateStr = `${citations.rate}%`;
  const avgStr = citations.industryAvg
    ? `[Industry avg: ${citations.industryAvg}%]`
    : '';
  lines.push(
    `  CITATION RATE: ${rateStr.padEnd(10)}${avgStr}`
  );

  lines.push(
    `  SENTIMENT:     Pos ${sentiment.positive}%` +
      ` | Neu ${sentiment.neutral}%` +
      ` | Neg ${sentiment.negative}%`
  );

  if (report.detectionRate != null) {
    lines.push(
      `  DETECTION RATE:${String(report.detectionRate).padStart(4)}%`
    );
  }

  // Engine breakdown
  const engineEntries = Object.entries(report.engines || {});
  if (engineEntries.length > 0) {
    const engStr = engineEntries
      .map(([k, v]) => `${k}:${v}`)
      .join(' | ');
    lines.push(`  ENGINES:       ${engStr.slice(0, WIDTH - 17)}`);
  }

  // Competitor comparison
  if (competitors && competitors.length > 0) {
    renderCompetitors(competitors, report.score).forEach((l) =>
      lines.push(l)
    );
  }

  // Search terms
  if (searchTerms.length > 0) {
    lines.push(line('-'));
    lines.push('  TOP AI SEARCH TERMS');
    searchTerms.slice(0, 5).forEach((t, i) => {
      const num = `${i + 1}.`;
      // trim to fit in 55 chars: "  N. "query"  (X mentions)"
      // "  1. " = 5, num+space=3, quotes=2, mentions col needs ~15
      // Total row: 5 + term + mentions
      const q = `"${t.query}"`.slice(0, 30);
      const m = `(${t.mentions} mentions)`;
      const row = `  ${num} ${q.padEnd(32)} ${m}`;
      lines.push(row.slice(0, WIDTH));
    });
  }

  // Insights
  if (insights.length > 0) {
    lines.push(line('-'));
    lines.push(
      `  GEO INSIGHTS  [${insights.length} action${insights.length !== 1 ? 's' : ''}]`
    );
    insights.forEach((insight) => {
      lines.push(`  [${insight.severity}] ${insight.recommendation}`);
      lines.push('');
    });
  }

  lines.push(line('-'));
  // Footer: "  Full report: " = 15 chars; URL max 40 chars → total 55
  const footerUrl =
    `https://rankscale.ai/brands/${brandId}`.slice(0, 40);
  lines.push(`  Full report: ${footerUrl}`);
  lines.push(line('='));

  return lines.join('\n');
}

// ─── Onboarding Prompt ────────────────────────────────────
function showOnboarding() {
  const onboardingPath = path.join(
    __dirname,
    'assets',
    'onboarding.md'
  );
  if (fs.existsSync(onboardingPath)) {
    const content = fs.readFileSync(onboardingPath, 'utf8');
    console.log(content);
  } else {
    console.log(
      [
        line('='),
        center('RANKSCALE SETUP REQUIRED'),
        line('='),
        '',
        '  To use GEO Analytics, you need a Rankscale account.',
        '',
        '  1. Sign up at: https://app.rankscale.ai/signup',
        '  2. Create your brand profile',
        '  3. Copy your API key from Settings > API',
        '  4. Set environment variables:',
        '',
        '     export RANKSCALE_API_KEY=rk_xxxxx_yyyyy',
        '     export RANKSCALE_BRAND_ID=yyyyy',
        '',
        '  Or pass as flags:',
        '     node rankscale-skill.js \\',
        '       --api-key rk_xxxxx \\',
        '       --brand-id yyyyy',
        '',
        line('='),
      ].join('\n')
    );
  }
}

// ─── Brand Discovery CLI Mode ─────────────────────────────
async function runDiscoverBrands(apiKey) {
  console.log('  Fetching brands from Rankscale...\n');
  try {
    const raw = await fetchBrands(apiKey);
    const brands = normalizeBrands(raw);
    if (!Array.isArray(brands) || brands.length === 0) {
      console.log('  No brands found on this account.');
      return;
    }
    console.log(line('='));
    console.log(center('AVAILABLE BRANDS'));
    console.log(line('='));
    brands.forEach((b, i) => {
      const name = b.name || b.brandName || '(unnamed)';
      const id = b.id || b.brandId || '?';
      console.log(`  ${i + 1}. ${name}`);
      console.log(`     ID: ${id}`);
    });
    console.log(line('-'));
    console.log(
      '  Set: export RANKSCALE_BRAND_ID=<id>'
    );
    console.log(line('='));
  } catch (err) {
    console.error(`  Error: ${err.message}`);
    process.exit(1);
  }
}

// ─── Main Orchestrator ────────────────────────────────────
/**
 * Main entry point — resolves credentials, fetches all 4 endpoints
 * in parallel with individual error handling, normalizes responses,
 * interprets insights, and renders the report.
 *
 * Fixes F7/F8: standalone citations + sentiment fetches with fallback
 * to report-embedded values when the dedicated endpoints fail.
 *
 * @param {object} [args={}]
 * @param {string} [args.apiKey]
 * @param {string} [args.brandId]
 * @param {string} [args.brandName]
 * @param {boolean} [args.discoverBrands]
 * @returns {Promise<{data: object, insights: object[], competitors: object[]}>}
 */
async function run(args = {}) {
  const { apiKey, brandId: rawBrandId } = resolveCredentials(args);

  if (!apiKey) {
    showOnboarding();
    process.exit(1);
  }

  // Brand discovery CLI mode
  if (args.discoverBrands) {
    await runDiscoverBrands(apiKey);
    return;
  }

  let brandId = rawBrandId;

  // Brand discovery if no ID
  if (!brandId) {
    console.error(
      '  RANKSCALE_BRAND_ID not set. Discovering brands...'
    );
    try {
      brandId = await discoverBrandId(apiKey, args.brandName);
    } catch (err) {
      console.error(`  Error: ${err.message}`);
      if (err instanceof AuthError) {
        console.error(
          '  Check your API key at https://app.rankscale.ai/settings'
        );
      }
      process.exit(1);
    }
  }

  // Fetch all 4 endpoints in parallel with individual error handling.
  // Report errors still call handleFetchError() for auth/not-found handling.
  // Citations and sentiment silently fall back to null (report-embedded values used).
  // Search terms fall back to the raw endpoint, then null.
  const [reportRaw, citationsRaw, sentimentRaw, searchTermsRaw] =
    await Promise.all([
      fetchReport(apiKey, brandId).catch((err) => {
        handleFetchError(err, 'report');
        if (err instanceof NotFoundError) {
          console.error(
            '\n  Tip: Run brand discovery to find valid brand IDs:'
          );
          console.error(
            `  RANKSCALE_API_KEY=${apiKey} ` +
              'node rankscale-skill.js --discover-brands'
          );
        }
        return null;
      }),
      fetchCitations(apiKey, brandId).catch(() => null),
      fetchSentiment(apiKey, brandId).catch(() => null),
      fetchSearchTermsReport(apiKey, brandId)
        .catch(() =>
          fetchSearchTerms(apiKey, brandId).catch(() => null)
        ),
    ]);

  // Normalize report (may contain bundled citations/sentiment as fallback)
  const reportNorm = normalizeReport(reportRaw);

  // Citations: prefer standalone endpoint, fallback to report-embedded
  const citationsData = citationsRaw || reportNorm._citationsRaw || {};

  // Sentiment: prefer standalone endpoint, fallback to report-embedded synthetic
  const sentimentData = sentimentRaw || reportNorm._sentimentRaw || {};

  // Normalize competitors
  const competitors = normalizeCompetitors(
    reportNorm.competitors,
    reportNorm.score
  );

  // Compose normalized data object
  const data = {
    report: reportNorm,
    citations: normalizeCitations(citationsData),
    sentiment: normalizeSentiment(sentimentData),
    searchTerms: normalizeSearchTerms(searchTermsRaw),
  };

  // Interpret
  const insights = interpretGeoData(data);

  // ── GEO feature flags ─────────────────────────────────
  const geoMode =
    args.engineProfile || args.gapAnalysis || args.reputation;

  if (geoMode) {
    if (args.engineProfile) {
      console.log(analyzeEngineStrength(data.report));
    }
    if (args.gapAnalysis) {
      console.log(analyzeContentGaps(data.report, data.searchTerms));
    }
    if (args.reputation) {
      console.log(computeReputationScore(data.sentiment));
    }
  } else {
    // Default: full report
    const output = renderReport(data, insights, brandId, competitors);
    console.log(output);
  }

  return { data, insights, competitors };
}

function handleFetchError(err, context) {
  if (err instanceof AuthError) {
    console.error(`  Auth error fetching ${context}: ${err.message}`);
    console.error(
      '  Verify your key at https://app.rankscale.ai/settings/api'
    );
    process.exit(1);
  } else if (err instanceof NotFoundError) {
    console.error(
      `  Not found (${context}): ${err.message}`
    );
  } else {
    console.error(
      `  Error fetching ${context}: ${err.message}`
    );
  }
}

// ─── CLI Entry Point ──────────────────────────────────────
if (require.main === module) {
  const args = {};

  // Parse CLI flags
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg === '--api-key' || arg === '--apiKey') {
      args.apiKey = process.argv[++i];
    } else if (arg === '--brand-id' || arg === '--brandId') {
      args.brandId = process.argv[++i];
    } else if (arg === '--brand-name' || arg === '--brandName') {
      args.brandName = process.argv[++i];
    } else if (arg === '--discover-brands') {
      args.discoverBrands = true;
    } else if (arg === '--engine-profile') {
      args.engineProfile = true;
    } else if (arg === '--gap-analysis') {
      args.gapAnalysis = true;
    } else if (arg === '--reputation') {
      args.reputation = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log([
        'Usage: node rankscale-skill.js [options]',
        '',
        'Options:',
        '  --api-key <key>      Rankscale API key',
        '  --brand-id <id>      Brand ID',
        '  --brand-name <name>  Brand name (for discovery)',
        '  --discover-brands    List all brands on account',
        '  --engine-profile     Engine strength heatmap',
        '  --gap-analysis       Content gap analysis',
        '  --reputation         Reputation score & summary',
        '  --help               Show this help',
        '',
        'Environment Variables:',
        '  RANKSCALE_API_KEY    API key',
        '  RANKSCALE_BRAND_ID   Brand ID',
        '',
        'Examples:',
        '  RANKSCALE_API_KEY=xxx node rankscale-skill.js \\',
        '    --discover-brands',
        '  RANKSCALE_API_KEY=xxx RANKSCALE_BRAND_ID=yyy \\',
        '    node rankscale-skill.js',
      ].join('\n'));
      process.exit(0);
    }
  }

  run(args).catch((err) => {
    console.error(`Fatal: ${err.message}`);
    process.exit(1);
  });
}

// ─── Exports ──────────────────────────────────────────────
module.exports = {
  run,
  resolveCredentials,
  // API calls
  fetchBrands,
  fetchReport,
  fetchCitations,
  fetchSentiment,
  fetchSearchTermsReport,
  fetchSearchTerms,
  // Normalizers
  normalizeSentiment,
  normalizeCitations,
  normalizeReport,
  normalizeSearchTerms,
  normalizeCompetitors,
  emptyReport,
  // Helpers
  safeGet,
  safeNum,
  safeFixed,
  safeArray,
  // Interpretation
  interpretGeoData,
  GEO_RULES,
  // GEO Analysis Features (ROA-40)
  analyzeEngineStrength,
  analyzeContentGaps,
  computeReputationScore,
  // Errors
  AuthError,
  NotFoundError,
  ApiError,
};
