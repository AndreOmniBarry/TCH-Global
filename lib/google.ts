import 'server-only';
import { createPublicKey, verify, type JsonWebKey } from 'crypto';

// Continue with Google: verifies a Google Identity Services ID token
// (RS256 JWT) against Google's published keys. No extra packages.
export const GOOGLE_CLIENT_ID = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '').trim();
export const googleConfigured = Boolean(GOOGLE_CLIENT_ID);

type Jwk = JsonWebKey & { kid: string };
let cache: { keys: Jwk[]; until: number } | null = null;

async function keys(): Promise<Jwk[]> {
  if (cache && Date.now() < cache.until) return cache.keys;
  const r = await fetch('https://www.googleapis.com/oauth2/v3/certs', { cache: 'no-store' });
  if (!r.ok) throw new Error(`google certs ${r.status}`);
  const age = Number(/max-age=(\d+)/.exec(r.headers.get('cache-control') || '')?.[1] || 3600);
  const { keys: k } = (await r.json()) as { keys: Jwk[] };
  cache = { keys: k, until: Date.now() + Math.min(age, 6 * 3600) * 1000 };
  return k;
}

const b64 = (s: string) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

export type GoogleProfile = { sub: string; email: string; name: string };

export async function verifyGoogleIdToken(token: string): Promise<GoogleProfile | null> {
  if (!googleConfigured || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(b64(parts[0]).toString('utf8')) as { alg: string; kid: string };
    if (header.alg !== 'RS256') return null;
    let jwk = (await keys()).find((k) => k.kid === header.kid);
    if (!jwk) { cache = null; jwk = (await keys()).find((k) => k.kid === header.kid); } // keys rotated
    if (!jwk) return null;
    const ok = verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), createPublicKey({ key: jwk, format: 'jwk' }), b64(parts[2]));
    if (!ok) return null;
    const c = JSON.parse(b64(parts[1]).toString('utf8')) as Record<string, unknown>;
    const now = Math.floor(Date.now() / 1000);
    if (c.aud !== GOOGLE_CLIENT_ID) return null;
    if (c.iss !== 'accounts.google.com' && c.iss !== 'https://accounts.google.com') return null;
    if (typeof c.exp !== 'number' || c.exp < now - 60) return null;
    if (c.email_verified !== true || typeof c.email !== 'string' || typeof c.sub !== 'string') return null;
    return { sub: c.sub, email: c.email, name: typeof c.name === 'string' ? c.name : '' };
  } catch {
    return null;
  }
}
