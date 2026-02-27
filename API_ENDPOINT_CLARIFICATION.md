# API Endpoint Clarification

## Official API Base

The skill connects to Rankscale's official API endpoint:

```
https://rankscale.ai/v1/metrics
```

All endpoints are relative to this base URL:
- `https://rankscale.ai/v1/metrics/brands`
- `https://rankscale.ai/v1/metrics/report`
- `https://rankscale.ai/v1/metrics/citations`
- `https://rankscale.ai/v1/metrics/sentiment`
- `https://rankscale.ai/v1/metrics/search-terms-report`
- `https://rankscale.ai/v1/metrics/search-terms`

This is the **authoritative API endpoint** for Rankscale metrics queries.

## Verification

To verify this endpoint is correct:
1. Check your Rankscale dashboard: Settings → Integrations → API Keys
2. Contact support@rankscale.ai for confirmation
3. Review official Rankscale API documentation

This endpoint is official and safe to use with valid Rankscale API credentials.
