# Security Considerations for Rankscale GEO Analytics Skill

## Credential Management

### ⚠️ DO NOT Store API Keys in Shell Config

While the SKILL.md mentions shell rc files (`~/.zshrc`, `~/.bashrc`), **this is NOT recommended for production use**.

**Why:** Shell rc files are persistent, plaintext, and world-readable on many systems.

### ✅ Recommended Practices

**Option 1: Per-Session Environment Variables (Best)**
```bash
export RANKSCALE_API_KEY="rk_..."
node rankscale-skill.js
unset RANKSCALE_API_KEY
```

**Option 2: .env File (Development Only)**
```bash
# .env (add to .gitignore!)
RANKSCALE_API_KEY=rk_...
```
Load with: `source .env && node rankscale-skill.js`

**Option 3: Secrets Manager (Production)**
- Use OpenClaw Gateway config (encrypted at rest)
- Use `aws-vault`, `1password-cli`, `bitwarden-cli`, or similar
- Use Kubernetes secrets (if deployed in K8s)

**Option 4: Limited-Scope API Key**
- Request a read-only or scoped API key from Rankscale
- If Rankscale supports API key restrictions, use the narrowest scope

## API Key Security

1. **Never commit keys to version control** — Even deleted commits can be recovered from git history
2. **Rotate keys regularly** — Generate new keys and retire old ones every 90 days
3. **Use read-only keys if available** — Rankscale may offer keys with limited permissions
4. **Audit access** — Check your Rankscale dashboard for unusual API activity
5. **Revoke immediately if compromised** — Go to Settings → Integrations → API Keys → Delete

## API Endpoint Verification

The skill calls:
```
https://rankscale.ai/api/v1
```

This is the **official Rankscale Metrics API backend**. Verify with Rankscale support if unsure.

## Safe Testing

Before providing production credentials:
1. Create a test Rankscale account
2. Generate a limited-scope or test API key
3. Run the skill in an isolated environment first
4. Confirm the endpoints and behavior match expectations
5. Only then provide production credentials

## Reporting Security Issues

If you find a security issue in this skill:
1. **DO NOT** disclose it publicly
2. Email: `security@rankscale.ai` or `support@rankscale.ai`
3. Include details about the issue and reproduction steps
4. Allow time for a fix before public disclosure

## Autonomous Invocation Warning

If you enable this skill for autonomous agent invocation:
- The skill can call Rankscale API endpoints using your API key **without additional confirmation**
- Only enable if you fully trust the skill and the endpoint
- Consider using a limited-scope or separate API key just for this skill
- Monitor for unusual activity in your Rankscale dashboard

---

For more information, see [`API_ENDPOINT_CLARIFICATION.md`](API_ENDPOINT_CLARIFICATION.md).
