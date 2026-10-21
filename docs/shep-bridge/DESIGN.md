# TCH website ⇄ SHEP.HRD bridge — design (draft v0, pre security review)

Scope: The Comforters House (TCH) only. Additive service: the website keeps
its current behaviour (email + KV copy of every form). The bridge only adds
delivery into SHEP.HRD; if the bridge is unconfigured or down, nothing the
visitor sees changes.

## Message types (website → SHEP.HRD)
| type                 | website source                 | SHEP target                          |
|----------------------|--------------------------------|--------------------------------------|
| member.join          | Join us form                   | members pending approval             |
| care.salvation       | Salvation section              | care lead, auto-assigned             |
| care.first_timer     | Plan a visit                   | first_timers (assignToLeastLoaded…)  |
| prayer.request       | Prayer form                    | prayer_requests (+ prayer dept head) |
| workforce.volunteer  | Volunteer form                 | department head notification         |
| youth.squad          | Teens squad sign-up            | youth department                     |
| event.registration   | Event RSVP                     | event_registrations                  |
Never sent: teens private questions, passwords, analytics, giving.

## Envelope
{ v:1, id:<uuid v4 idempotency key>, type, occurredAt:<ISO>, consent:{given:true, version:"2026-10"}, data:{…typed, minimal} }

## Option A — signed push
POST {SHEP_BRIDGE_URL}/api/bridge/ingest
Headers: X-Bridge-Key: <keyId>, X-Bridge-Timestamp: <unix s>,
X-Bridge-Signature: v1=hex(HMAC-SHA256(secret, ts + "." + keyId + "." + rawBody))
SHEP: constant-time verify, |now-ts| ≤ 300s, keyId → {church_id, branch_id}
from server env (never from body), strict per-type schema, insert into
bridge_inbox(id PK) first (duplicate → 200 duplicate), then route, 202 receipt.

## Safety net — durable outbox (website)
Persist before send: KV bridge:item:<id> = AES-256-GCM(payload) with separate
BRIDGE_ENC_KEY, TTL 30d; bridge:pending zset (score = next attempt).
Backoff 1m,5m,15m,1h,3h,6h,12h (≤24h). Drained: inline after each form,
opportunistically on later submissions, daily cron, admin "retry now".
Metadata-only log (id, type, status, ts) for /admin/status.

## Option B — SHEP pulls
GET {site}/api/bridge/outbox (signed by SHEP with a different secret,
direction-separated), returns ≤ 25 pending envelopes; POST /api/bridge/ack
(signed) with delivered ids. Delivered ids removed from outbox.

## Option C — human fallback
Items pending > 24h → moved to dead-letter + email digest (admin + unit head)
with a CSV attachment matching SHEP's import format. Never silently dropped.

## SHEP → website
GET {SHEP}/api/bridge/events (signed) → upcoming public events for TCH's
church_id; cached 5 min on the site; failure → site shows its own calendar.

## Controls
consent tick box per form; data minimisation; NDPA; audit logs both sides;
key rotation (two active keyIds); rate limit on ingest; kill switch env.
