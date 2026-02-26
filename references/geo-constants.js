'use strict';
/**
 * geo-constants.js
 * GEO Analysis constants derived from @architect's research (ROA-40).
 * Used by analyzeEngineStrength, analyzeContentGaps,
 * and computeReputationScore in rankscale-skill.js.
 */

// Engine visibility weights (sum ≈ 1.0)
// Source: Engine Intelligence Matrix from research doc
const ENGINE_WEIGHTS = {
  chatgpt:     0.30,
  perplexity:  0.20,
  gemini:      0.18,
  claude:      0.12,
  deepseek:    0.05,
  ai_overview: 0.05,
  grok:        0.04,
  mistral:     0.03,
  ai_mode:     0.03,
};

// Default weight for unknown engines
const ENGINE_WEIGHT_DEFAULT = 0.02;

// GEO Pattern detection thresholds
const GEO_PATTERNS = {
  // Pattern 1: Content Gap
  // Flag terms visible on <40% of engines
  CONTENT_GAP_PRESENT_RATIO: 0.4,
  // Engine drops >20pts vs avg = engine-specific weakness flag
  CONTENT_GAP_ENGINE_DROP_PTS: 20,

  // Pattern 2: Authority Gap
  // citations.total / report.mentions < 0.3
  AUTHORITY_GAP_RATIO: 0.3,

  // Pattern 3: Negative Sentiment
  // negativeKeywords.length > positiveKeywords.length * 0.5
  SENTIMENT_RISK_RATIO: 0.5,

  // Pattern 4: Engine-Specific Weakness
  // engine avgScore < overall_avg * 0.4
  ENGINE_WEAKNESS_RATIO: 0.4,

  // Pattern 5: Topic/Query Imbalance
  // generic_avg < branded_avg * 0.3
  TOPIC_IMBALANCE_RATIO: 0.3,

  // Pattern 6: Mention-to-Visibility Drop
  MENTION_MIN: 10,
  VISIBILITY_DROP_MAX: 30,

  // Pattern 7: Trending Decline
  TREND_DECLINE_PCT: -15,
};

// Reputation score algorithm weights (must sum to 1.0)
// Source: §4 Reputation Summary Algorithm from research doc
const REPUTATION_SCORE_WEIGHTS = {
  BASE_RATIO: 0.60,        // Weight for (pos - 2*neg) / total ratio
  ENGINE_SCORE: 0.20,      // Weight for engine-weighted sentiment
  SEVERITY_PENALTY: 0.20,  // Penalty for high-frequency negative kw

  // Trend thresholds (score delta points)
  TREND_IMPROVING_DELTA: 5,
  TREND_DECLINING_DELTA: -5,

  // Top risk keyword count
  TOP_RISK_KEYWORDS: 5,

  // Score normalisation formula: (raw + 1) * 50, clamp 0-100
  NORM_OFFSET: 1,
  NORM_SCALE: 50,
};

module.exports = {
  ENGINE_WEIGHTS,
  ENGINE_WEIGHT_DEFAULT,
  GEO_PATTERNS,
  REPUTATION_SCORE_WEIGHTS,
};
