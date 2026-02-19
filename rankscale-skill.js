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
const API_BASE = 'https://app.rankscale.ai/api';
const API_VERSION = 'v1';
const WIDTH = 55;
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 1000;

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
function apiRequest(endpoint, apiKey, retries = 0) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}/${API_VERSION}/${endpoint}`;
    const options = {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'openclaw-rs-geo-analytics/1.0.0',
      },
    };

    const parsed = new URL(url);
    const reqOptions = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: options.method,
      headers: options.headers,
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
              apiRequest(endpoint, apiKey, retries + 1)
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
              `Resource not found: ${endpoint} (HTTP 404)`
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
                apiRequest(endpoint, apiKey, retries + 1)
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
        apiRequest(endpoint, apiKey, retries + 1)
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
            apiRequest(endpoint, apiKey, retries + 1)
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

/** GET /v1/metrics/brands — list brands on this account */
async function fetchBrands(apiKey) {
  return apiRequest('metrics/brands', apiKey);
}

/** GET /v1/metrics/report?brandId=<id> — visibility score + rank */
async function fetchReport(apiKey, brandId) {
  return apiRequest(`metrics/report?brandId=${brandId}`, apiKey);
}

/** GET /v1/metrics/citations?brandId=<id> — citation data */
async function fetchCitations(apiKey, brandId) {
  return apiRequest(
    `metrics/citations?brandId=${brandId}`,
    apiKey
  );
}

/** GET /v1/metrics/sentiment?brandId=<id> — sentiment breakdown */
async function fetchSentiment(apiKey, brandId) {
  return apiRequest(
    `metrics/sentiment?brandId=${brandId}`,
    apiKey
  );
}

/** GET /v1/metrics/search-terms-report?brandId=<id> — top queries */
async function fetchSearchTerms(apiKey, brandId) {
  return apiRequest(
    `metrics/search-terms-report?brandId=${brandId}`,
    apiKey
  );
}

// ─── Brand Discovery ─────────────────────────────────────
async function discoverBrandId(apiKey, brandName) {
  const data = await fetchBrands(apiKey);
  const brands = data.brands || data.data || data || [];

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
 * Normalize sentiment — Rankscale returns two formats:
 *   Format A: { positive: 0.61, negative: 0.10, neutral: 0.29 }
 *   Format B: { scores: { pos: 61, neg: 10, neu: 29 } }
 */
function normalizeSentiment(raw) {
  if (!raw) return { positive: 0, negative: 0, neutral: 0 };

  // Format B
  if (raw.scores) {
    const s = raw.scores;
    const pos = s.pos || s.positive || 0;
    const neg = s.neg || s.negative || 0;
    const neu = s.neu || s.neutral || 0;
    const total = pos + neg + neu || 100;
    return {
      positive: +(pos / total * 100).toFixed(1),
      negative: +(neg / total * 100).toFixed(1),
      neutral: +(neu / total * 100).toFixed(1),
    };
  }

  // Format A — may be 0–1 floats or 0–100 integers
  const pos = raw.positive ?? raw.pos ?? 0;
  const neg = raw.negative ?? raw.neg ?? 0;
  const neu = raw.neutral ?? raw.neu ?? 0;

  if (pos <= 1 && neg <= 1 && neu <= 1) {
    // Float format
    return {
      positive: +(pos * 100).toFixed(1),
      negative: +(neg * 100).toFixed(1),
      neutral: +(neu * 100).toFixed(1),
    };
  }

  return {
    positive: +pos.toFixed(1),
    negative: +neg.toFixed(1),
    neutral: +neu.toFixed(1),
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
 * Normalize report response.
 * Handles: { score, rank, change } or { geoScore, rankPosition, weeklyDelta }
 */
function normalizeReport(raw) {
  if (!raw) return { score: 0, rank: null, change: 0 };
  return {
    score:
      raw.score ??
      raw.geoScore ??
      raw.visibilityScore ??
      raw.geo_score ??
      0,
    rank:
      raw.rank ??
      raw.rankPosition ??
      raw.position ??
      null,
    change:
      raw.change ??
      raw.weeklyDelta ??
      raw.delta ??
      raw.scoreChange ??
      0,
    brandName:
      raw.brandName ??
      raw.brand ??
      raw.name ??
      'Your Brand',
  };
}

/**
 * Normalize search terms.
 * Handles: { terms: [{query, mentions}] } or { data: [{term, count}] }
 */
function normalizeSearchTerms(raw) {
  if (!raw) return [];
  const terms =
    raw.terms || raw.data || raw.searchTerms || raw.results || [];
  return terms
    .map((t) => ({
      query: t.query || t.term || t.keyword || t.name || '',
      mentions: t.mentions || t.count || t.frequency || 0,
    }))
    .filter((t) => t.query)
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 10);
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

function renderReport(data, insights, brandId) {
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

  // Search terms
  if (searchTerms.length > 0) {
    lines.push(line('-'));
    lines.push('  TOP AI SEARCH TERMS');
    searchTerms.slice(0, 5).forEach((t, i) => {
      const num = `${i + 1}.`;
      const q = `"${t.query}"`.slice(0, 34);
      const m = `(${t.mentions} mentions)`;
      lines.push(`  ${num} ${q.padEnd(36)} ${m}`);
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
  lines.push(
    `  Full report: https://app.rankscale.ai/brands/${brandId}`
  );
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

// ─── Main Orchestrator ────────────────────────────────────
async function run(args = {}) {
  const { apiKey, brandId: rawBrandId } = resolveCredentials(args);

  if (!apiKey) {
    showOnboarding();
    process.exit(1);
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

  // Parallel fetch (report first, then the rest)
  let reportRaw, citationsRaw, sentimentRaw, searchTermsRaw;

  try {
    reportRaw = await fetchReport(apiKey, brandId);
  } catch (err) {
    handleFetchError(err, 'report');
    reportRaw = {};
  }

  try {
    [citationsRaw, sentimentRaw, searchTermsRaw] = await Promise.all([
      fetchCitations(apiKey, brandId),
      fetchSentiment(apiKey, brandId),
      fetchSearchTerms(apiKey, brandId),
    ]);
  } catch (err) {
    handleFetchError(err, 'supplementary data');
    citationsRaw = {};
    sentimentRaw = {};
    searchTermsRaw = {};
  }

  // Normalize
  const data = {
    report: normalizeReport(reportRaw),
    citations: normalizeCitations(citationsRaw),
    sentiment: normalizeSentiment(sentimentRaw),
    searchTerms: normalizeSearchTerms(searchTermsRaw),
  };

  // Interpret
  const insights = interpretGeoData(data);

  // Render
  const output = renderReport(data, insights, brandId);
  console.log(output);

  return { data, insights };
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
    } else if (arg === '--help' || arg === '-h') {
      console.log([
        'Usage: node rankscale-skill.js [options]',
        '',
        'Options:',
        '  --api-key <key>      Rankscale API key',
        '  --brand-id <id>      Brand ID',
        '  --brand-name <name>  Brand name (for discovery)',
        '  --help               Show this help',
        '',
        'Environment Variables:',
        '  RANKSCALE_API_KEY    API key',
        '  RANKSCALE_BRAND_ID   Brand ID',
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
  fetchBrands,
  fetchReport,
  fetchCitations,
  fetchSentiment,
  fetchSearchTerms,
  normalizeSentiment,
  normalizeCitations,
  normalizeReport,
  normalizeSearchTerms,
  interpretGeoData,
  GEO_RULES,
  AuthError,
  NotFoundError,
  ApiError,
};
