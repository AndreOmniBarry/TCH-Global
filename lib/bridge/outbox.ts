import 'server-only';
import { kv } from '@vercel/kv';
import { seal, unseal, signature } from './crypto';
import { encryptionOn } from './crypto';
import { randomUUID } from 'crypto';
import type { Envelope, BridgeType } from './messages';

// Durable outbox for SHEP.HRD (docs/shep-bridge/CONTRACT.md).
// - Every message is sealed and written (item + pending index, atomically)
//   before the visitor is told "sent", so nothing depends on one request.
// - Senders claim an item with a 60s lease, so the inline send, later
//   drains, the cron and "retry now" never double-send at once; SHEP's
//   idempotency on the message id makes any overlap harmless anyway.
// - Only an explicit {status:"accepted"|"duplicate"} removes an item.
//   400/409/413/422 go straight to dead-letter (retrying can't help),
//   401/403 raise an alert and back off, everything else retries with
//   backoff for up to 24h, then dead-letters (Option C: admin is emailed
//   a count, never the content, and exports from /admin/bridge).

const URL_RAW = (process.env.SHEP_BRIDGE_URL || '').trim().replace(/\/+$/, '');
const KEY_ID = (process.env.SHEP_BRIDGE_KEY_ID || '').trim();
const SECRET = (process.env.SHEP_BRIDGE_SECRET || '').trim();
const KV_ON = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

function target(): URL | null {
  try {
    const u = new URL(URL_RAW);
    return u.protocol === 'https:' || (process.env.NODE_ENV !== 'production' && u.hostname === '127.0.0.1') ? u : null;
  } catch {
    return null;
  }
}

export const bridgeKillSwitch = (process.env.BRIDGE_ENABLED || '').trim().toLowerCase() === 'off';
export const bridgeConfigured = Boolean(target() && KEY_ID && SECRET.length >= 32 && encryptionOn && KV_ON);
export const bridgeMissing = (): string[] => [
  !URL_RAW ? 'SHEP_BRIDGE_URL' : !target() ? 'SHEP_BRIDGE_URL (must be https)' : '',
  !KEY_ID ? 'SHEP_BRIDGE_KEY_ID' : '',
  SECRET.length < 32 ? 'SHEP_BRIDGE_SECRET (32+ chars)' : '',
  !encryptionOn ? 'BRIDGE_ENC_KEY (base64 of 32 bytes)' : '',
  !KV_ON ? 'KV database' : '',
].filter(Boolean);

const K = {
  item: (id: string) => `bridge:item:${id}`,
  lock: (id: string) => `bridge:lock:${id}`,
  pending: 'bridge:pending',
  dead: 'bridge:dead',
  log: 'bridge:log',
  delivered: 'bridge:count:delivered',
  lastOk: 'bridge:last:ok',
  lastErr: 'bridge:last:err',
  authAlert: 'bridge:alert:auth',
  notified: 'bridge:dead:notified',
};

const TTL = 60 * 60 * 24 * 30;
const GIVE_UP_MS = 24 * 60 * 60 * 1000;
const BACKOFF = [60, 300, 900, 3600, 3 * 3600, 6 * 3600, 12 * 3600];
const TIMEOUT_MS = 3500;

export type Item = {
  id: string;
  type: BridgeType;
  sealed: string;
  createdAt: number;
  attempts: number;
  lastCode?: number | string;
  held?: string;
};

const aad = (id: string, type: string) => `bridge|${id}|${type}`;

async function log(id: string, type: string, status: string, code?: number | string) {
  // Metadata only: never a name, contact or message.
  await kv.multi().lpush(K.log, { id, type, status, code: code ?? null, at: Date.now() }).ltrim(K.log, 0, 199).exec().catch(() => {});
}

// Write the message durably. `held` parks it in dead-letter for a human
// to release (suspected bot, over the hourly cap) instead of sending it.
export async function enqueue(env: Envelope, held?: string): Promise<boolean> {
  const item: Item = { id: env.id, type: env.type, sealed: seal(JSON.stringify(env), aad(env.id, env.type)), createdAt: Date.now(), attempts: 0, held };
  try {
    const m = kv.multi().set(K.item(env.id), item, { ex: TTL });
    if (held) m.zadd(K.dead, { score: Date.now(), member: env.id });
    else m.zadd(K.pending, { score: Date.now(), member: env.id });
    await m.exec();
    await log(env.id, env.type, held ? `held: ${held}` : 'queued');
    return true;
  } catch (e) {
    console.error('bridge enqueue failed', env.id, env.type, (e as Error).name);
    return false;
  }
}

export function readItem(item: Item): Envelope | null {
  const plain = unseal(item.sealed, aad(item.id, item.type));
  try {
    return plain ? (JSON.parse(plain) as Envelope) : null;
  } catch {
    return null;
  }
}

type Outcome = 'delivered' | 'retry' | 'dead' | 'auth' | 'locked' | 'gone' | 'off';

async function toDead(item: Item, code: number | string) {
  await kv.multi().set(K.item(item.id), { ...item, lastCode: code }, { ex: TTL }).zrem(K.pending, item.id).zadd(K.dead, { score: Date.now(), member: item.id }).exec();
  await kv.set(K.lastErr, { at: Date.now(), code });
  await log(item.id, item.type, 'dead', code);
}

export async function deliver(id: string): Promise<Outcome> {
  if (!bridgeConfigured) return 'off';
  if (bridgeKillSwitch) return 'off';
  const got = await kv.set(K.lock(id), '1', { nx: true, ex: 60 });
  if (got !== 'OK') return 'locked';
  try {
    const item = await kv.get<Item>(K.item(id));
    if (!item) {
      await kv.zrem(K.pending, id);
      return 'gone';
    }
    const env = readItem(item);
    if (!env) {
      await toDead(item, 'unreadable');
      return 'dead';
    }
    const u = target()!;
    const path = '/api/bridge/ingest';
    const body = JSON.stringify(env);
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = signature(SECRET, 'POST', path, u.host, ts, KEY_ID, body);
    let code: number | string = 'network';
    let ok = false;
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
      const res = await fetch(`${u.origin}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Bridge-Key': KEY_ID, 'X-Bridge-Timestamp': ts, 'X-Bridge-Signature': `v1=${sig}` },
        body,
        redirect: 'manual',
        cache: 'no-store',
        signal: ctl.signal,
      }).finally(() => clearTimeout(timer));
      code = res.status;
      if (res.status === 200 || res.status === 202) {
        const j = (await res.json().catch(() => null)) as { status?: string } | null;
        ok = j?.status === 'accepted' || j?.status === 'duplicate';
        if (!ok) code = `${res.status}-badbody`;
      }
    } catch (e) {
      code = (e as Error).name === 'AbortError' ? 'timeout' : 'network';
    }

    if (ok) {
      await kv.multi().del(K.item(id)).zrem(K.pending, id).zrem(K.dead, id).incr(K.delivered).set(K.lastOk, Date.now()).exec();
      await log(id, item.type, 'delivered', code);
      return 'delivered';
    }
    if (code === 400 || code === 409 || code === 413 || code === 422) {
      await toDead(item, code);
      return 'dead';
    }
    const attempts = item.attempts + 1;
    if (Date.now() - item.createdAt > GIVE_UP_MS) {
      await toDead({ ...item, attempts }, code);
      return 'dead';
    }
    const wait = BACKOFF[Math.min(attempts - 1, BACKOFF.length - 1)];
    await kv.multi().set(K.item(id), { ...item, attempts, lastCode: code }, { ex: TTL }).zadd(K.pending, { score: Date.now() + wait * 1000, member: id }).exec();
    await kv.set(K.lastErr, { at: Date.now(), code });
    if (code === 401 || code === 403) {
      await kv.set(K.authAlert, Date.now(), { ex: 60 * 60 * 24 * 7 });
      await log(id, item.type, 'refused: check keys', code);
      return 'auth';
    }
    await log(id, item.type, 'retry', code);
    return 'retry';
  } finally {
    await kv.del(K.lock(id)).catch(() => {});
  }
}

// "Test connection": a correctly signed message whose data is deliberately
// empty. SHEP.HRD checks the signature first and the data second, so it
// can never create a record, and its answer says exactly which part works:
// 422 = keys, address and switch all correct; 401 = keys/address mismatch;
// 503 = BRIDGE_ENABLED not "on" (or not redeployed); 404 = bridge code not live.
export async function probe(): Promise<{ ok: boolean; code: number | string; say: string }> {
  if (!bridgeConfigured) return { ok: false, code: 'setup', say: `Website side not set up: ${bridgeMissing().join(', ')}.` };
  const u = target()!;
  const path = '/api/bridge/ingest';
  const now = new Date().toISOString();
  const body = JSON.stringify({ v: 1, id: randomUUID(), type: 'prayer.request', occurredAt: now, consent: { version: 'probe', at: now }, data: {} });
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = signature(SECRET, 'POST', path, u.host, ts, KEY_ID, body);
  let code: number | string = 'network';
  let detail = '';
  try {
    const res = await fetch(`${u.origin}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Bridge-Key': KEY_ID, 'X-Bridge-Timestamp': ts, 'X-Bridge-Signature': `v1=${sig}` },
      body, redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(8000),
    });
    code = res.status;
    detail = String(((await res.json().catch(() => ({}))) as { error?: string }).error || '');
  } catch (e) {
    code = (e as Error).name === 'TimeoutError' ? 'timeout' : 'network';
  }
  const host = u.host;
  const say: Record<string, string> = {
    422: `Both sides trust each other. ${host} checked the signature and is ready to receive sign-ups.`,
    401: `${host} refused the key. In shepherd-app check that BRIDGE_KEYS has "id":"K1" and exactly the same secret as SHEP_BRIDGE_SECRET here, and that BRIDGE_EXPECTED_HOST is exactly ${host}. Then redeploy shepherd-app.`,
    503: `${host} has the bridge switched off. In shepherd-app set BRIDGE_ENABLED to on, then redeploy shepherd-app.`,
    500: `${host} could not read its bridge settings (usually BRIDGE_KEYS is not valid JSON, or the branch does not belong to the church). Re-check BRIDGE_KEYS and redeploy shepherd-app.`,
    404: `${host} does not have the bridge yet. Redeploy shepherd-app from main.`,
    timeout: `${host} did not answer within 8 seconds. Try again; if it repeats, check shepherd-app is online.`,
    network: `Could not reach ${host}. Check SHEP_BRIDGE_URL is https://${host} and the site is online.`,
  };
  const fallback = typeof code === 'number' && code >= 300 && code < 400
    ? `${host} redirects to another address. Use the final address in SHEP_BRIDGE_URL and BRIDGE_EXPECTED_HOST.`
    : `Unexpected answer ${code}${detail ? ` (${detail})` : ''}.`;
  await log('probe', 'test', code === 422 ? 'test ok' : 'test failed', code);
  return { ok: code === 422, code, say: say[String(code)] || fallback };
}

// Send whatever is due, oldest first, within a time budget.
export async function drain(limit = 25, budgetMs = 20000): Promise<{ delivered: number; tried: number }> {
  if (!bridgeConfigured || bridgeKillSwitch) return { delivered: 0, tried: 0 };
  const start = Date.now();
  const ids = await kv.zrange<string[]>(K.pending, 0, Date.now(), { byScore: true, offset: 0, count: limit });
  let delivered = 0;
  let tried = 0;
  for (const id of ids) {
    if (Date.now() - start > budgetMs) break;
    tried++;
    if ((await deliver(id)) === 'delivered') delivered++;
  }
  return { delivered, tried };
}

// Admin: release held / dead items back into the queue.
export async function requeue(ids: string[]) {
  for (const id of ids) {
    const item = await kv.get<Item>(K.item(id));
    if (!item) {
      await kv.zrem(K.dead, id);
      continue;
    }
    await kv.multi().set(K.item(id), { ...item, held: undefined, attempts: 0, createdAt: Date.now() }, { ex: TTL }).zrem(K.dead, id).zadd(K.pending, { score: Date.now(), member: id }).exec();
    await log(id, item.type, 'released by admin');
  }
}

export async function discard(ids: string[]) {
  for (const id of ids) {
    await kv.multi().del(K.item(id)).zrem(K.dead, id).zrem(K.pending, id).exec();
    await log(id, '-', 'removed by admin');
  }
}

export async function listItems(which: 'pending' | 'dead', limit = 200): Promise<Item[]> {
  const ids = await kv.zrange<string[]>(which === 'pending' ? K.pending : K.dead, 0, limit - 1);
  if (!ids.length) return [];
  const items = await Promise.all(ids.map((id) => kv.get<Item>(K.item(id))));
  return items.filter(Boolean) as Item[];
}

export async function stats() {
  const [pending, dead, delivered, lastOk, lastErr, authAlert, log] = await Promise.all([
    kv.zcard(K.pending), kv.zcard(K.dead), kv.get<number>(K.delivered), kv.get<number>(K.lastOk),
    kv.get<{ at: number; code: number | string }>(K.lastErr), kv.get<number>(K.authAlert),
    kv.lrange<{ id: string; type: string; status: string; code: number | string | null; at: number }>(K.log, 0, 49),
  ]);
  return { pending, dead, delivered: delivered ?? 0, lastOk, lastErr, authAlert, log };
}

export async function clearAuthAlert() {
  await kv.del(K.authAlert);
}

// Dead-letter items not yet reported in a digest (ids/types only).
export async function unreportedDead(): Promise<{ id: string; type: string; code?: number | string; held?: string }[]> {
  const since = (await kv.get<number>(K.notified)) ?? 0;
  const ids = await kv.zrange<string[]>(K.dead, since + 1, '+inf', { byScore: true });
  const items = await Promise.all(ids.map((id) => kv.get<Item>(K.item(id))));
  return items.filter(Boolean).map((i) => ({ id: i!.id, type: i!.type, code: i!.lastCode, held: i!.held }));
}

export async function markReported() {
  await kv.set(K.notified, Date.now());
}

// Dead items that will expire within 5 days (30-day TTL).
export async function expiringDead(): Promise<number> {
  return kv.zcount(K.dead, 0, Date.now() - 25 * 24 * 3600 * 1000);
}
