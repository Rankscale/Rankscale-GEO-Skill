# API Endpoint Clarification

## Official API Base

The skill connects to Rankscale's official API backend:
```
https://us-central1-rankscale-2e08e.cloudfunctions.net
```

This Google Cloud Functions endpoint is the **authoritative API backend** for Rankscale metrics queries. It is maintained and operated by Rankscale and is documented in the official Rankscale API integration guide.

## Dashboard URL

For user-facing operations (signup, API key generation, brand management), use:
```
https://rankscale.ai/dashboard
```

## Why CloudFunctions?

The CloudFunctions domain is the official API backend — this is a standard practice for SaaS APIs to separate frontend (dashboard) from backend services. The skill correctly targets this endpoint.

## Verification

To verify this endpoint is official:
1. Contact support@rankscale.ai
2. Check your Rankscale account API documentation
3. Review the official Rankscale API reference

Both endpoints are official and safe to use with valid Rankscale API credentials.
