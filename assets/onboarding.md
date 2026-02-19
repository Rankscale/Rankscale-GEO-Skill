# Rankscale GEO Analytics — Onboarding Guide

Welcome to Rankscale! This guide walks you through setting up the
GEO Analytics skill so your AI assistant can pull live brand data.

---------------------------------------------------------------
  STEP 1: CREATE YOUR RANKSCALE ACCOUNT
---------------------------------------------------------------

Visit: https://app.rankscale.ai/signup

  • Click "Start Free Trial" (14 days, no credit card required)
  • Enter your work email and set a password
  • Verify your email address
  • You'll land on the Rankscale dashboard

---------------------------------------------------------------
  STEP 2: ADD YOUR BRAND
---------------------------------------------------------------

From the dashboard:

  1. Click "Add Brand" (top right)
  2. Enter your brand name (e.g., "Acme Corp")
  3. Enter your primary domain (e.g., "acmecorp.com")
  4. Select your category (e.g., "SaaS / Productivity")
  5. Add 3–5 key competitors to benchmark against
  6. Click "Create Brand"

Rankscale will begin collecting your GEO data. Initial report
takes 24–48 hours to populate.

Your Brand ID will appear in the URL:
  https://app.rankscale.ai/brands/<YOUR_BRAND_ID>

---------------------------------------------------------------
  STEP 3: GET YOUR API KEY
---------------------------------------------------------------

  1. Go to Settings → API Keys
     https://app.rankscale.ai/settings/api

  2. Click "Generate New Key"

  3. Copy your API key — it looks like:
     rk_xxxxxxxx_<brandId>

  ⚠️  The key is shown once. Save it immediately.

---------------------------------------------------------------
  STEP 4: CONFIGURE YOUR AI ASSISTANT
---------------------------------------------------------------

Set these environment variables in your shell or .env file:

  export RANKSCALE_API_KEY="rk_xxxxxxxx_<brandId>"
  export RANKSCALE_BRAND_ID="<brandId>"

Or pass directly when running the skill:

  node rankscale-skill.js \
    --api-key rk_xxxxxxxx_<brandId> \
    --brand-id <brandId>

To persist in your shell config (e.g., ~/.bashrc or ~/.zshrc):

  echo 'export RANKSCALE_API_KEY="rk_xxxxx"' >> ~/.zshrc
  echo 'export RANKSCALE_BRAND_ID="yyyyy"' >> ~/.zshrc
  source ~/.zshrc

---------------------------------------------------------------
  STEP 5: RUN YOUR FIRST REPORT
---------------------------------------------------------------

Once credentials are set, ask your AI assistant:

  "Run a Rankscale GEO report"
  "Show my AI search visibility"
  "What's my GEO score?"

Or run directly:

  node rankscale-skill.js

You'll see a full GEO Analytics report with:
  • GEO Score (0–100)
  • Citation Rate vs. industry average
  • Sentiment breakdown
  • Top AI search terms
  • 3–5 actionable GEO insights

---------------------------------------------------------------
  PLANS & PRICING
---------------------------------------------------------------

| Plan       | Brands | Terms Tracked | Reports/day |
|------------|--------|---------------|-------------|
| Free Trial | 1      | 50            | 3           |
| Starter    | 1      | 200           | 10          |
| Pro        | 5      | 1,000         | 50          |
| Enterprise | ∞      | Custom        | Unlimited   |

See full pricing: https://app.rankscale.ai/pricing

---------------------------------------------------------------
  NEED HELP?
---------------------------------------------------------------

  • Docs:    https://docs.rankscale.ai
  • Support: support@rankscale.ai
  • Discord: https://discord.gg/rankscale
  • Twitter: @rankscale

---------------------------------------------------------------

Once you've completed setup, your AI assistant can retrieve
live GEO analytics on demand. Just ask!
