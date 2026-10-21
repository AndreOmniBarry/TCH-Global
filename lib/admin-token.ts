// Admin session token: "<expiry>.<HMAC(WRITE_PASSWORD, 'tch-admin-v2.<expiry>')>".
// Works in both middleware (edge) and route handlers via Web Crypto. It
// expires on its own (SESSION_HOURS), and changing WRITE_PASSWORD signs
// everyone out immediately.
export const ADMIN_COOKIE = 'tch_admin';
export const SESSION_HOURS = 72;

async function mac(secret: string, msg: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function issueAdminToken(): Promise<string | null> {
  const secret = process.env.WRITE_PASSWORD;
  if (!secret) return null;
  const exp = Math.floor(Date.now() / 1000) + SESSION_HOURS * 3600;
  return `${exp}.${await mac(secret, `tch-admin-v2.${exp}`)}`;
}

export async function adminTokenValid(token: string | undefined): Promise<boolean> {
  const secret = process.env.WRITE_PASSWORD;
  if (!secret || !token) return false;
  const [exp, sig] = token.split('.');
  if (!/^\d{10}$/.test(exp || '') || !sig || Number(exp) < Date.now() / 1000) return false;
  const want = await mac(secret, `tch-admin-v2.${exp}`);
  // Constant-time compare (no timingSafeEqual on the edge runtime).
  if (sig.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= sig.charCodeAt(i) ^ want.charCodeAt(i);
  return diff === 0;
}
