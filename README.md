# 🚀 Rankscale GEO Analytics for OpenClaw

![Version](https://img.shields.io/badge/version-v1.0.1-blue) ![Status](https://img.shields.io/badge/status-Production%20Ready-brightgreen) ![Platform](https://img.shields.io/badge/platform-OpenClaw-purple)

## The Best AI Rank Tracker & Generative Engine Optimization Tool

**Real-time visibility analytics across ChatGPT, Perplexity, Gemini, Claude, and more.**

Stop guessing where your brand shows up in AI answers. Rankscale GEO Analytics gives you deep, actionable visibility intelligence across every major AI engine — so you can optimize your content, protect your reputation, and dominate the AI-driven search landscape before your competitors even know it exists.

---

## ✨ Features at a Glance

- 📊 **Engine Strength Profile** — Visibility heatmap across 12+ AI engines showing where you're strong and where you're invisible
- 🎯 **Content Gap Analysis** — Identify topics with low AI coverage and get concrete recommendations to fill those gaps
- 🛡️ **Reputation Score** — Brand health score (0–100) with full sentiment analysis across AI-generated responses
- 📈 **Engine Gainers & Losers** — Track visibility changes per engine over time to spot trends early
- ⚠️ **Sentiment Shift Alerts** — Detect emerging sentiment trends and surface risk keyword clusters before they escalate
- 🔗 **Citation Intelligence Hub** — Authority ranking, citation gap analysis, and PR opportunities where your brand should be cited but isn't
- 📋 **Default GEO Report** — Quick, comprehensive visibility overview to baseline your current standing

---

## 💡 Why This Skill?

### What is GEO?

**Generative Engine Optimization (GEO)** is the discipline of optimizing your brand, content, and digital presence so that AI-powered engines — like ChatGPT, Perplexity, Gemini, and Claude — surface you prominently and positively when users ask relevant questions. GEO is the next frontier beyond traditional SEO. As more users turn to AI for answers, your visibility in generated responses directly impacts brand discovery, trust, and revenue.

### Why Rankscale GEO Analytics?

- **Best-in-class GEO analytics** — Purpose-built for the AI era, not bolted onto legacy SEO tooling
- **Full engine coverage** — Track across all major AI engines:
  - ChatGPT (OpenAI)
  - Perplexity AI
  - Google Gemini
  - Anthropic Claude
  - Microsoft Copilot
  - You.com
  - Bing AI
  - Meta AI
  - And 4+ more emerging engines
- **Actionable insights, not just data** — Every report tells you what to do next, not just what's happening
- **Citation intelligence** — Discover the gold nuggets: where your brand *should* be cited but isn't, with direct PR opportunities
- **Brand reputation tracking** — Know your sentiment score before a crisis hits, not after
- **PR opportunity discovery** — Find gaps in your citation profile and turn them into press coverage

---

## 🏁 Getting Started

### Step 1 — Create Your Rankscale Account (PRO account required)

Head to [https://rankscale.ai/dashboard/signup](https://rankscale.ai/dashboard/signup) and create your account. Takes under 2 minutes.

> **⚠️ PRO account required.** Trial accounts do **not** have REST API access and cannot be used with this skill. You must be on a PRO plan (or higher) for API access to function.

### Step 2 — Activate REST API Access

REST API access is required for this skill. Contact [support@rankscale.ai](mailto:support@rankscale.ai) to request API activation for your account. The team is fast and happy to help.

### Step 3 — Configure & Launch

Set your environment variables and run your first report:

```bash
# Set your API key
export RANKSCALE_API_KEY="your_api_key_here"
export RANKSCALE_BRAND="your-brand-name"

# Run your first GEO report
openclaw rs-geo report

# Check engine strength profile
openclaw rs-geo engines --brand "your-brand"

# Get reputation score
openclaw rs-geo reputation
```

📖 Full setup walkthrough: [onboarding.md](./onboarding.md)

---

## 🔍 Usage Examples

### Run a Default GEO Report
```bash
openclaw rs-geo report --brand "acme-corp"
```
**Output:**
```
📋 GEO Visibility Report — acme-corp
Overall Visibility Score: 67/100
Top Engines: ChatGPT (82%), Perplexity (74%), Gemini (61%)
Weakest Engine: Copilot (23%) — action recommended
Content Gaps: 14 identified topics
Reputation Score: 78/100 (Positive)
```

### Analyze Engine Strength Profile
```bash
openclaw rs-geo engines --brand "acme-corp" --heatmap
```
**Output:**
```
📊 Engine Strength Heatmap
  ChatGPT     ████████░░  82%  ↑ +4pts
  Perplexity  ███████░░░  74%  ↑ +2pts
  Gemini      ██████░░░░  61%  → stable
  Claude      █████░░░░░  53%  ↓ -3pts
  Copilot     ██░░░░░░░░  23%  ↓ -8pts  ⚠️
```

### Discover Citation Gaps
```bash
openclaw rs-geo citations --brand "acme-corp" --gaps --opportunities
```
**Output:**
```
🔗 Citation Intelligence Hub
Missing citations in 8 high-authority sources
Top PR Opportunities:
  → TechCrunch article on "Best CRM tools" (DA 94) — not cited
  → Forbes "Top SaaS Platforms 2025" (DA 96) — not cited
  → G2 comparison page (DA 91) — partially cited
Recommended outreach: 3 contacts identified
```

### Run Sentiment Shift Alert Scan
```bash
openclaw rs-geo sentiment --alerts --risk-keywords
```
**Output:**
```
⚠️ Sentiment Shift Alerts
Current Reputation Score: 78/100
Trend: Slightly negative shift detected (last 7 days)
Risk Keywords Emerging:
  → "slow support" (3 mentions, Perplexity)
  → "pricing concerns" (2 mentions, ChatGPT)
Recommendation: Address support perception in content
```

---

## 📚 Features Deep Dive

Want to go deeper on any feature? We've got you covered:

- [FEATURES.md](./FEATURES.md) — Full feature guide with detailed explanations, configuration options, and pro tips for all 7 analytics modules
- [COMMANDS.md](./COMMANDS.md) — Complete CLI command reference with all flags, options, and examples

---

## 📖 Documentation

- [SKILL.md](./SKILL.md) — Main skill documentation and architecture overview
- [FEATURES.md](./FEATURES.md) — Detailed feature guide for all 7 analytics modules
- [COMMANDS.md](./COMMANDS.md) — Full CLI command reference
- [onboarding.md](./onboarding.md) — Step-by-step signup and setup walkthrough

---

## 🤝 Support & Feedback

We're here for you. Seriously.

- **Email:** [support@rankscale.ai](mailto:support@rankscale.ai) — our team responds fast and loves helping users get the most out of GEO analytics
- **Dashboard:** [https://rankscale.ai/dashboard](https://rankscale.ai/dashboard) — manage your account, API keys, and reports

Got a feature request? Found a bug? Just want to share what you built? Reach out — we genuinely want to hear from you.

---

## 🌐 About Rankscale

[Rankscale](https://rankscale.ai) is the leading platform for Generative Engine Optimization analytics. As AI-powered engines become the primary way people discover information, products, and brands, traditional SEO is no longer enough. Rankscale gives you the visibility data, reputation intelligence, and actionable insights you need to thrive in the AI-first world — tracking your brand presence across 12+ engines, surfacing citation gaps, monitoring sentiment shifts, and helping you build a stronger, more authoritative digital footprint where it counts most: inside the AI answers your customers are already reading.

---

## 📄 License & Contributing

This OpenClaw skill is provided as part of the Rankscale ecosystem.

- **License:** MIT — use it, fork it, build on it
- **Contributing:** PRs and improvements welcome. Open an issue or email [support@rankscale.ai](mailto:support@rankscale.ai) to discuss
- **Versioning:** Follows [Semantic Versioning](https://semver.org/) — current release is v1.0.1

---

*Built with ❤️ for the GEO-forward era. Track smarter. Rank better. Win the AI landscape.*
