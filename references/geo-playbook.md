# GEO Analytics Playbook — Interpretation Rules & Recommendation Patterns

**Version:** 1.0.0  
**Scope:** Rankscale GEO Analytics Skill (RS-126)  
**Audience:** Skill developers + AI assistants using this skill

---

## What is GEO?

**Generative Engine Optimization (GEO)** is the practice of optimizing a brand's presence in AI-generated search answers (ChatGPT, Perplexity, Gemini, Claude, etc.).

Unlike traditional SEO (ranking in Google's blue links), GEO measures:
- **Citation Rate** — how often your brand is mentioned in AI answers
- **GEO Score** — composite visibility score (0–100)
- **Sentiment** — tone of AI-generated mentions (positive/neutral/negative)
- **Search Terms** — which queries produce brand mentions

---

## Metric Definitions

### GEO Score (0–100)

Composite score derived from:
- Citation presence (40%)
- Sentiment quality (30%)
- Search term coverage (30%)

**Bands:**

| Range | Label | Meaning |
|-------|-------|---------|
| 0–39 | Critical | Brand nearly invisible in AI search |
| 40–64 | Growing | Some presence, major gaps |
| 65–79 | Strong | Good visibility, room to improve |
| 80–100 | Leader | Dominant AI search presence |

### Citation Rate (%)

Percentage of tracked queries (relevant to your category) where the brand appears in AI-generated answers.

**Benchmarks (SaaS/Tech category, 2026):**
- Industry average: ~28%
- Top quartile: >45%
- Leader benchmark: >60%

### Sentiment

Distribution of tone across all AI-generated mentions containing the brand.

**Interpretation:**
- Positive: Brand positioned favorably, solutions praised
- Neutral: Factual mentions, comparisons, informational
- Negative: Criticism, complaints, comparison losses

Healthy target: Positive > 55%, Negative < 15%

### Score Change (Delta)

Week-over-week GEO score change.
- Positive delta (+): brand gaining AI visibility
- Negative delta (-): brand losing AI visibility
- Threshold for concern: -5 or worse

---

## Interpretation Rules

The GEO Interpretation Module applies 7 rules to generate actionable insights. Rules are checked in order. Severity levels: **CRIT**, **WARN**, **INFO**.

---

### Rule R1 — Low Citation Rate (WARN)

**Condition:** `citations.rate < 40%`

**Why it matters:** Citation rate below 40% means your brand is missing from the majority of relevant AI answers. AI models are primarily trained on and cite the most authoritative, well-linked sources.

**Root causes:**
- Insufficient authoritative content
- Low external backlink profile
- No brand mentions in AI training data sources (Reddit, news, blogs)
- Competitor dominance in answer slots

**Recommended Actions:**
1. Publish 2+ long-form comparison/review articles targeting category keywords
2. Issue press releases on major milestones (citations from news sites are high-value)
3. Submit brand to 3–5 AI-indexed business directories (G2, Capterra, Product Hunt)
4. Build relationships with relevant journalists and bloggers

**Expected Timeline:** 4–8 weeks to see citation rate movement

---

### Rule R2 — Critical Citation Rate (CRIT)

**Condition:** `citations.rate < 20%`

**Why it matters:** Sub-20% citation rate indicates near-invisibility in AI search. At this level, competitors are capturing answer slots that should belong to your brand.

**Supersedes:** R1 (only one fires for citation rate)

**Recommended Actions:**
1. Immediate content audit — identify top 10 category queries; create dedicated pages for each
2. Structured data / schema markup on all key pages (FAQ, Product, Organization)
3. Wikipedia / Wikidata brand page (if eligible) — major AI training signal
4. Launch outreach campaign to 10+ relevant review/comparison sites
5. Consider a coordinated PR push to earn news mentions

**Expected Timeline:** 6–12 weeks for meaningful improvement

---

### Rule R3 — Negative Sentiment Spike (CRIT)

**Condition:** `sentiment.negative > 25%`

**Why it matters:** When >25% of AI-generated brand mentions carry negative tone, AI models are effectively spreading negative narratives at scale. Every query in your category may produce a subtly unfavorable brand association.

**Root causes:**
- Unresolved customer complaints going viral
- Negative comparison content (competitors outperforming in reviews)
- Known product issues widely discussed on forums
- Pricing concerns dominating the conversation

**Recommended Actions:**
1. Query audit: identify which search terms produce negative mentions
2. Create rebuttal/FAQ content addressing the top 3 negative narratives
3. Respond to and resolve negative reviews on G2, Trustpilot, Reddit
4. Publish case studies showing successful customer outcomes
5. Monitor weekly — sentiment changes lag 2–4 weeks after content interventions

**Expected Timeline:** 8–16 weeks (sentiment is slow to change)

---

### Rule R4 — Low GEO Score (CRIT)

**Condition:** `report.score < 40`

**Why it matters:** GEO score below 40 indicates the brand is essentially invisible across all three visibility dimensions. This requires a comprehensive GEO strategy, not tactical fixes.

**Recommended Actions:**
1. Full GEO audit — baseline all 4 metric dimensions
2. Competitor analysis — identify who is winning the answer slots you're missing
3. Technical fixes: add schema markup, improve content depth and comprehensiveness
4. Citation velocity program: target 5+ new citations per week
5. Set up weekly monitoring to track progress

**Note:** At this level, all other rules likely also fire. Fix R4 conditions first.

**Expected Timeline:** 12–24 weeks for score to reach 65+

---

### Rule R5 — Medium GEO Score / Growth Zone (WARN)

**Condition:** `40 ≤ report.score < 65`

**Why it matters:** Brand is in the growth zone — visible but not dominant. Focus on converting "sometimes cited" queries into "always cited" ones.

**Recommended Actions:**
1. Identify top 3 high-volume search terms from the search terms report
2. Create or upgrade dedicated content pages for each of those 3 terms
3. Add structured FAQ sections targeting question-format queries
4. Analyze top-performing citations — identify which content types drive the most
5. Set a 90-day target: score 65+

**Expected Timeline:** 6–10 weeks to move into Strong band

---

### Rule R6 — Negative Score Trend (WARN)

**Condition:** `report.change < -5`

**Why it matters:** A score drop of more than 5 points week-over-week signals that competitors are outpacing the brand or that existing content is becoming less relevant to AI models.

**Root causes:**
- Competitor launched new content that captured your citation slots
- AI model update changed how your category is answered
- Content freshness decay (AI favors recent, updated content)
- Loss of key citation source (site went offline, article deleted)

**Recommended Actions:**
1. Run a competitor citation analysis — who gained where you lost?
2. Identify the top 3 queries where your rank dropped
3. Update and expand existing content on those queries (freshness signal)
4. Check if any major citation sources are no longer linking/mentioning you
5. Consider a content refresh sprint (update 5+ key pages this week)

**Expected Timeline:** 2–4 weeks to stabilize; 4–8 weeks to recover

---

### Rule R7 — Positive Momentum (INFO)

**Condition:** `report.change >= +3 AND sentiment.positive > 55%`

**Why it matters:** The brand is growing in both visibility and positive sentiment. This is the optimal GEO state — momentum should be accelerated, not just maintained.

**Recommended Actions:**
1. Double down on content formats that are generating citations (identify them)
2. Expand into adjacent topic areas your brand could own
3. Increase publishing cadence by 20–30% while momentum holds
4. Amplify winning content: promote on social, pitch to additional publications
5. Set stretch goal: what would it take to reach the Leader band (80+)?

**Expected Timeline:** This is a maintenance + acceleration play, not a fix.

---

## Severity Reference

| Level | Badge | When to Use |
|-------|-------|-------------|
| CRIT | `[CRIT]` | Immediate action required; significant brand risk |
| WARN | `[WARN]` | Action recommended within 2–4 weeks |
| INFO | `[INFO]` | Positive signal or informational context |

---

## Rule Deduplication Logic

When multiple rules fire on the same dimension:
- R2 (CRIT citation) **supersedes** R1 (WARN citation) — don't show both
- R4 (CRIT score) will often co-occur with R1/R2/R6 — show all
- R7 (positive momentum) can co-occur with R5 (growth zone) — show both

Max insights surfaced per report: **5**

Priority order: CRIT → WARN → INFO

---

## Benchmark Data (Reference)

*SaaS/Tech brands, Rankscale 2026 aggregate data*

| Metric | Bottom 25% | Median | Top 25% | Leaders |
|--------|-----------|--------|---------|---------|
| GEO Score | <35 | 52 | 71 | 85+ |
| Citation Rate | <18% | 28% | 45% | 62%+ |
| Positive Sentiment | <45% | 58% | 68% | 75%+ |
| Negative Sentiment | >20% | 11% | 7% | <5% |

---

## Content Types That Drive GEO Citations

**Highest impact (AI models cite these most):**
1. Comparison articles ("X vs Y" format)
2. Category listicles ("Best [category] tools")
3. Reviews on G2, Capterra, Trustpilot, Product Hunt
4. Official documentation and help center content
5. News / PR coverage on authoritative domains

**Medium impact:**
- LinkedIn articles
- Twitter/X threads with engagement
- YouTube review videos
- Podcast appearances

**Low impact (but important for breadth):**
- Blog posts on owned domain
- Social media mentions
- Forum discussions (Reddit, Hacker News)

---

## Glossary

| Term | Definition |
|------|------------|
| GEO | Generative Engine Optimization — optimizing brand presence in AI-generated answers |
| Citation | An AI model's reference to your brand in a generated response |
| Citation Rate | % of tracked queries where your brand is cited |
| GEO Score | Composite visibility score (0–100) |
| Answer Slot | The position/mention a brand occupies within an AI-generated answer |
| Query Coverage | How many of the relevant queries produce brand citations |
| Sentiment Drift | Week-over-week change in sentiment distribution |
| Citation Velocity | Rate of new citations earned per week |
