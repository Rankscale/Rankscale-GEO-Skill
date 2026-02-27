# API Endpoint Clarification

## Canonical Base URL

**Base:** `https://rankscale.ai`

All Rankscale Metrics API endpoints are served from `https://rankscale.ai` under the `/v1/metrics/` path prefix.

> ⚠️ The Cloud Functions URL (`https://us-central1-rankscale-2e08e.cloudfunctions.net`) is deprecated and must **not** be used. All integrations must use `https://rankscale.ai`.

---

## Endpoint Reference

| Resource | Method | Path |
|---|---|---|
| Brands | GET | `v1/metrics/brands` |
| GEO Report | GET | `v1/metrics/report` |
| Citations | GET | `v1/metrics/citations` |
| Sentiment | GET | `v1/metrics/sentiment` |
| Search Terms | GET | `v1/metrics/search-terms-report` |

### Notes

- Paths have **no leading slash** when appended to `API_BASE` (e.g. `${API_BASE}/v1/metrics/brands`)
- Authentication: `Authorization: Bearer <RANKSCALE_API_KEY>`
- All responses are JSON

---

## Example

```bash
curl -H "Authorization: Bearer $RANKSCALE_API_KEY" \
  https://rankscale.ai/v1/metrics/brands
```

```js
const API_BASE = 'https://rankscale.ai';
const res = await fetch(`${API_BASE}/v1/metrics/brands`, {
  headers: { Authorization: `Bearer ${process.env.RANKSCALE_API_KEY}` }
});
```
