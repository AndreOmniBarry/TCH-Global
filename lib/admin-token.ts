// Admin session token: an HMAC of a fixed label keyed by WRITE_PASSWORD.
// Works in both middleware (edge) and route handlers via Web Crypto, and
// changing WRITE_PASSWORD signs everyone out automatically.
export const ADMIN_COOKIE = 'tch_admin';

export async function adminToken(): Promise<string | null> {
  const secret = process.env.WRITE_PASSWORD;
  if (!secret) return null;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode('tch-admin-v1'));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
