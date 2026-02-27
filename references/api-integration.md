# Rankscale API Integration Reference

## Overview

This skill integrates with the Rankscale Metrics API to fetch GEO (Generative Engine Optimization) analytics data.

**Base URL:** `https://rankscale.ai`

**Auth:** `Authorization: Bearer <RANKSCALE_API_KEY>`

**Format:** JSON request/response

## Endpoints

All endpoints require Bearer token authentication.

### Reporting Endpoints

#### POST /report
**Get GEO visibility report for a brand**

```bash
curl -X POST "https://rankscale.ai/v1/metrics/report" \
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
  "engines": { "chatgpt": 82, "perplexity": 74 }
}
```

#### POST /search-terms-report
**Get search terms with detection metrics**

```bash
curl -X POST "https://rankscale.ai/v1/metrics/search-terms-report" \
  -H "Authorization: Bearer rk_YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"brandId": "YOUR_BRAND_ID"}'
```

#### POST /sentiment
**Get sentiment analysis for the brand**

```bash
curl -X POST "https://rankscale.ai/v1/metrics/sentiment" \
  -H "Authorization: Bearer rk_YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"brandId": "YOUR_BRAND_ID"}'
```

Response:
```json
{
  "positive": 0.617,
  "neutral": 0.284,
  "negative": 0.099,
  "sampleSize": 412
}
```

#### POST /citations
**Get citation metrics and sources**

```bash
curl -X POST "https://rankscale.ai/v1/metrics/citations" \
  -H "Authorization: Bearer rk_YOUR_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"brandId": "YOUR_BRAND_ID"}'
```

### Utility Endpoints

#### GET /brands
**List all tracked brands**

```bash
curl -X GET "https://rankscale.ai/v1/metrics/brands" \
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

#### GET /search-terms
**Get raw search terms tracked for the brand**

```bash
curl -X GET "https://rankscale.ai/v1/metrics/search-terms?brandId=YOUR_BRAND_ID" \
  -H "Authorization: Bearer rk_YOUR_API_KEY_HERE"
```

Query Parameters:
- `brandId` (required) — Brand ID to fetch search terms for

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
const base = 'https://rankscale.ai';

async function fetch_api(path, method = 'GET', body = null) {
  const res = await fetch(`${base}/v1/metrics/${path}`, {
    method,
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: body ? JSON.stringify(body) : null
  });
  return res.json();
}

// Fetch brands
const brands = await fetch_api('/v1/metrics/brands');

// Fetch report
const report = await fetch_api('/v1/metrics/report', 'POST', { brandId });

// Fetch search terms
const searchTerms = await fetch_api(`/v1/metrics/search-terms?brandId=${brandId}`);
```

## Support

For API questions or issues:
- Email: support@rankscale.ai
- Docs: https://rankscale.ai
- Dashboard: https://rankscale.ai/dashboard
