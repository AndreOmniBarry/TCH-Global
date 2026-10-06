// Member accounts: email + password, stored in the same KV store as the
// rest of the site. Passwords are hashed with scrypt; sessions are random
// tokens in an httpOnly cookie, looked up in KV (30-day expiry).
import { kv } from '@vercel/kv';
import { randomBytes, scrypt as _scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { cookies } from 'next/headers';

const scrypt = promisify(_scrypt) as (pw: string, salt: string, len: number) => Promise<Buffer>;
export const authConfigured = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
export const SESSION_COOKIE = 'tch_sess';
const SESSION_DAYS = 30;

export type Member = { id: string; name: string; email: string; createdAt: string; newsletter: boolean; phone?: string };
type StoredMember = Member & { pw: string };

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const key = (email: string) => `member:${email.trim().toLowerCase()}`;

async function hash(pw: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scrypt(pw, salt, 64);
  return `${salt}:${buf.toString('hex')}`;
}
async function verify(pw: string, stored: string) {
  const [salt, hex] = stored.split(':');
  if (!salt || !hex) return false;
  const buf = await scrypt(pw, salt, 64);
  const want = Buffer.from(hex, 'hex');
  return want.length === buf.length && timingSafeEqual(buf, want);
}
const pub = (m: StoredMember): Member => ({ id: m.id, name: m.name, email: m.email, createdAt: m.createdAt, newsletter: m.newsletter, phone: m.phone });

export async function createMember(input: { name: string; email: string; password: string; newsletter: boolean; phone?: string }) {
  const email = input.email.trim().toLowerCase();
  const exists = await kv.exists(key(email));
  if (exists) return { error: 'An account with that email already exists. Sign in instead.' as const };
  const m: StoredMember = {
    id: `m_${randomBytes(8).toString('hex')}`,
    name: input.name.trim().slice(0, 80),
    email,
    createdAt: new Date().toISOString(),
    newsletter: input.newsletter,
    phone: input.phone?.trim().slice(0, 30) || undefined,
    pw: await hash(input.password),
  };
  await kv.set(key(email), m);
  await kv.set(`memberid:${m.id}`, email);
  await kv.zadd('members', { score: Date.now(), member: email });
  return { member: pub(m) };
}

export async function checkLogin(email: string, password: string) {
  const m = await kv.get<StoredMember>(key(email));
  if (!m || !(await verify(password, m.pw))) return null;
  return pub(m);
}

export async function startSession(memberId: string) {
  const token = randomBytes(32).toString('base64url');
  await kv.set(`sess:${token}`, memberId, { ex: SESSION_DAYS * 86400 });
  cookies().set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: SESSION_DAYS * 86400 });
}

export async function endSession() {
  const t = cookies().get(SESSION_COOKIE)?.value;
  if (t) await kv.del(`sess:${t}`).catch(() => {});
  cookies().delete(SESSION_COOKIE);
}

export async function currentMember(): Promise<Member | null> {
  if (!authConfigured) return null;
  const t = cookies().get(SESSION_COOKIE)?.value;
  if (!t) return null;
  try {
    const id = await kv.get<string>(`sess:${t}`);
    if (!id) return null;
    const email = await kv.get<string>(`memberid:${id}`);
    if (!email) return null;
    const m = await kv.get<StoredMember>(key(email));
    return m ? pub(m) : null;
  } catch {
    return null;
  }
}

export async function updateMember(email: string, patch: Partial<Pick<Member, 'name' | 'newsletter' | 'phone'>>) {
  const m = await kv.get<StoredMember>(key(email));
  if (!m) return null;
  const next = { ...m, ...patch };
  await kv.set(key(email), next);
  return pub(next);
}

export async function listMembers(limit = 500): Promise<Member[]> {
  if (!authConfigured) return [];
  const emails = await kv.zrange<string[]>('members', 0, limit - 1, { rev: true });
  if (!emails.length) return [];
  const rows = await Promise.all(emails.map((e) => kv.get<StoredMember>(key(e))));
  return rows.filter((m): m is StoredMember => Boolean(m)).map(pub);
}

/** Tiny fixed-window rate limit (per key) to slow password guessing/spam. */
export async function limited(bucket: string, max: number, windowSec: number) {
  try {
    const k = `rl:${bucket}`;
    const n = await kv.incr(k);
    if (n === 1) await kv.expire(k, windowSec);
    return n > max;
  } catch {
    return false;
  }
}
