# Rankscale API Integration Reference

## Overview

This skill integrates with the Rankscale Metrics API to fetch GEO (Generative Engine Optimization) analytics data.

**Base URL:** `https://rankscale.ai/api/v1`

**Auth:** `Authorization: Bearer <RANKSCALE_API_KEY>`

**Format:** JSON request/response

## Endpoints

All endpoints require Bearer token authentication and accept JSON payloads.

### 1. GET /metrics/brands
**List all tracked brands**

```bash
curl -X GET "https://rankscale.ai/api/v1/metrics/brands" \
  -H "Authorization: Bearer rk_YOUR_API_KEY_HERE"
```

Response:
```json
{
  "success": true,
  "data": {
    "brands": [
      { "id": "brand-1", "name": "Brand Name", "domain": "example.com" }
    ]
  }
}
```

### 2. POST /metrics/report
**Get GEO visibility report for a brand**

```bash
curl -X POST "https://rankscale.ai/api/v1/metrics/report" \
  -H "Authorization: Bearer rk_YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"brandId": "YOUR_BRAND_ID"}'
```

Response:
```json
{
  "score": 72,
  "change": 5,
  "citationRate": 0.555,
  "sentiment": { "positive": 0.617, "neutral": 0.284, "negative": 0.099 },
  "engines": { "chatgpt": 82, "perplexity": 74, ... }
}
```

### 3. POST /metrics/search-terms-report
**Get search terms with detection metrics**

```bash
curl -X POST "https://rankscale.ai/api/v1/metrics/search-terms-report" \
  -H "Authorization: Bearer rk_YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"brandId": "YOUR_BRAND_ID"}'
```

### 4. POST /metrics/search-terms
**Get raw search terms tracked for the brand**

### 5. POST /metrics/citations
**Get citation metrics and sources**

```bash
curl -X POST "https://rankscale.ai/api/v1/metrics/citations" \
  -H "Authorization: Bearer rk_YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"brandId": "YOUR_BRAND_ID"}'
```

### 6. POST /metrics/sentiment
**Get sentiment analysis for the brand**

```bash
curl -X POST "https://rankscale.ai/api/v1/metrics/sentiment" \
  -H "Authorization: Bearer rk_YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"brandId": "YOUR_BRAND_ID"}'
```

## Authentication

All requests require a Bearer token in the Authorization header:

```bash
Authorization: Bearer rk_<hash>_<brandId>
```

Obtain your API key from: https://rankscale.ai/dashboard/settings

## Error Handling

The API returns standard HTTP status codes:

- **200** — Success
- **400** — Bad request (invalid payload)
- **401** — Unauthorized (invalid or missing API key)
- **403** — Forbidden (insufficient permissions)
- **429** — Rate limited (retry after delay)
- **500+** — Server error (retry with exponential backoff)

## Rate Limits

- 10 requests per second
- 1000 requests per hour
- Respect `Retry-After` header on 429 responses

## Examples

JavaScript/Node.js:

```javascript
const apiKey = process.env.RANKSCALE_API_KEY;
const brandId = process.env.RANKSCALE_BRAND_ID;
const base = 'https://rankscale.ai/api/v1';

async function get(path) {
  const res = await fetch(`${base}/${path}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` }
  });
  return res.json();
}

// Fetch report
const report = await get(`metrics/report`);
```

## Support

For API questions or issues:
- Email: support@rankscale.ai
- Docs: https://rankscale.ai
- Dashboard: https://rankscale.ai/dashboard
