# Switching on the SHEP.HRD bridge (step by step)

Until these are set, every form works exactly as before (email + saved copy).

## 1. Make the secrets (once)
On any computer with a terminal (or ask Claude to generate them):
- Bridge signing secret:  `openssl rand -hex 32`
- Encryption key:          `openssl rand -base64 32`
- Flush secret:            `openssl rand -hex 32`
- Cron secret:             `openssl rand -hex 24`
Keep them in a password manager. Never paste them into chat, email or WhatsApp.

## 2. Vercel → TCH-Global project → Settings → Environment Variables (Production)
| Name | Value |
|---|---|
| SHEP_BRIDGE_URL | the SHEP.HRD address, e.g. https://shep-hrd.vercel.app |
| SHEP_BRIDGE_KEY_ID | K1 |
| SHEP_BRIDGE_SECRET | the bridge signing secret |
| BRIDGE_ENC_KEY | the encryption key |
| BRIDGE_ENC_KEY_ID | 1 |
| BRIDGE_FLUSH_KEYS | F1:<flush secret> |
| CRON_SECRET | the cron secret |
| BRIDGE_ALERT_EMAILS | (optional) unit heads who get the "needs a look" email, comma-separated |
| TURNSTILE_SECRET_KEY + NEXT_PUBLIC_TURNSTILE_SITE_KEY | (optional, recommended) from Cloudflare → Turnstile → Add site. Set both or neither. |
Then Deployments → ⋯ → Redeploy.

Important: once BRIDGE_ENC_KEY is set, new form copies are stored encrypted.
Never delete or change it without telling Claude: a lost key means old saved
copies can't be read (the emailed copies are unaffected).

## 3. SHEP.HRD → Vercel → Environment Variables
| Name | Value |
|---|---|
| BRIDGE_KEYS | [{"id":"K1","secret":"<same bridge signing secret>","church_id":"<TCH church_id>","branch_id":null}] |
| BRIDGE_EXPECTED_HOST | the SHEP host without https://, e.g. shep-hrd.vercel.app |
| BRIDGE_ENABLED | on |
| BRIDGE_DAILY_CAP | 300 |
| BRIDGE_FLUSH_URL | https://tch-global.vercel.app/api/bridge/flush |
| BRIDGE_FLUSH_KEY_ID | F1 |
| BRIDGE_FLUSH_SECRET | the flush secret |
Run the bridge SQL file in Supabase → SQL editor (see the SHEP.HRD branch claude/tch-website-bridge, docs/TCH_WEBSITE_BRIDGE.md). Redeploy.

## 4. Every-10-minutes retry (free)
cron-job.org → Create cronjob → URL https://tch-global.vercel.app/api/bridge/flush,
every 10 minutes, Advanced → Headers: `Authorization: Bearer <cron secret>`.
(The site also retries on every new submission and once a day by itself.)

## Live values (27 Oct 2026)
SHEP host is **www.justshephrd.com** (justshephrd.com redirects there with a 308, and the bridge
never follows redirects). Church id 00000000-0000-0000-0000-000000000001, all branches (branch_id null).
Use /admin/bridge → Test connection after any change: it names the address, key and secret ending in use.

## 5. Check
/admin/status shows "SHEP.HRD bridge: Working". /admin/bridge shows deliveries,
anything waiting, anything needing a person, and lets you export or erase.

## Emergency stop
Add BRIDGE_ENABLED=off in Vercel and redeploy: sign-ups keep queueing safely and
send when you remove it.

## Key rotation (yearly, or if a secret may have leaked)
Add K2 to SHEP BRIDGE_KEYS → set the site to K2 → after 48 h remove K1.
