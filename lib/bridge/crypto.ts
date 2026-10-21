import 'server-only';
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto';

// Encryption at rest for anything personal the site keeps in KV (the
// SHEP.HRD outbox and the forms:* lists). AES-256-GCM, a fresh 96-bit IV
// per item, and the item's id/type bound in as AAD so a ciphertext can't
// be moved onto another record. Keys are 32 random bytes (base64), never
// a passphrase. Format: <keyId>.<iv>.<ciphertext>.<tag> (base64url).
//   BRIDGE_ENC_KEY       base64 of 32 random bytes  (openssl rand -base64 32)
//   BRIDGE_ENC_KEY_ID    short label, e.g. "1"
//   BRIDGE_ENC_KEY_PREV  "<id>:<base64>" — the previous key, kept until
//                        everything sealed with it has expired (30 days)

function parseKey(b64: string | undefined): Buffer | null {
  if (!b64) return null;
  try {
    const k = Buffer.from(b64.trim(), 'base64');
    return k.length === 32 ? k : null;
  } catch {
    return null;
  }
}

const CURRENT_ID = (process.env.BRIDGE_ENC_KEY_ID || '1').trim();
const CURRENT = parseKey(process.env.BRIDGE_ENC_KEY);
const KEYS = new Map<string, Buffer>();
if (CURRENT) KEYS.set(CURRENT_ID, CURRENT);
{
  const prev = process.env.BRIDGE_ENC_KEY_PREV || '';
  const i = prev.indexOf(':');
  const k = i > 0 ? parseKey(prev.slice(i + 1)) : null;
  if (k && !KEYS.has(prev.slice(0, i))) KEYS.set(prev.slice(0, i), k);
}

export const encryptionOn = Boolean(CURRENT);
export const encryptionKeyBad = Boolean(process.env.BRIDGE_ENC_KEY) && !CURRENT;

export function seal(plain: string, aad: string): string {
  if (!CURRENT) throw new Error('encryption key not configured');
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', CURRENT, iv);
  c.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return [CURRENT_ID, iv.toString('base64url'), ct.toString('base64url'), c.getAuthTag().toString('base64url')].join('.');
}

export function unseal(sealed: string, aad: string): string | null {
  const [id, iv, ct, tag] = sealed.split('.');
  const key = KEYS.get(id);
  if (!key || !iv || !ct || !tag) return null;
  try {
    const d = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
    d.setAAD(Buffer.from(aad));
    d.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([d.update(Buffer.from(ct, 'base64url')), d.final()]).toString('utf8');
  } catch {
    return null;
  }
}

export const sha256hex = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex');

// Wire signature, docs/shep-bridge/CONTRACT.md §1. Binds method, path and
// host as well as the body, so a captured request can't be replayed at
// another endpoint.
export function signature(secret: string, method: string, path: string, host: string, ts: string, keyId: string, body: string): string {
  const canonical = ['v1', method, path, host.toLowerCase(), ts, keyId, sha256hex(body)].join('\n');
  return createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');
}

export function hexEqual(a: string, b: string): boolean {
  if (!/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b)) return false;
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && timingSafeEqual(x, y);
}

// Verify an incoming signed request against "id:secret,id:secret".
// Unknown key ids still pay for an HMAC so timing doesn't reveal which
// ids exist.
export function verifySigned(keys: string, req: { method: string; path: string; host: string; keyId: string | null; ts: string | null; sig: string | null; body: string }): boolean {
  const { keyId, ts, sig } = req;
  if (!keyId || !ts || !sig || !/^\d{9,11}$/.test(ts) || !sig.startsWith('v1=')) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(ts)) > 300) return false;
  const pair = keys.split(',').map((p) => p.trim()).find((p) => p.slice(0, p.indexOf(':')) === keyId);
  const secret = pair ? pair.slice(pair.indexOf(':') + 1) : 'unknown-key-dummy-secret-0000000000000000';
  const want = signature(secret, req.method, req.path, req.host, ts, keyId, req.body);
  return hexEqual(sig.slice(3), want) && Boolean(pair);
}
