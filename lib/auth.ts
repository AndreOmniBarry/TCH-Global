// Member accounts: email + password, stored in the same KV store as the
// rest of the site. Passwords are hashed with scrypt; sessions are random
// tokens in an httpOnly cookie, looked up in KV (30-day expiry).
import { kv } from '@vercel/kv';
import { createHash, randomBytes, scrypt as _scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { cookies } from 'next/headers';

const scrypt = promisify(_scrypt) as (pw: string, salt: string, len: number) => Promise<Buffer>;
export const authConfigured = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
export const SESSION_COOKIE = 'tch_sess';
// Sessions roll: every visit (at most once a day) pushes expiry 90 days out,
// so a member who comes back at least once a quarter never signs in again.
const SESSION_DAYS = 90;
const TOUCH_COOKIE = 'tch_touch';

/** A child "explorer" on a family account: first name and a buddy avatar only. */
export type Kid = { id: string; name: string; avatar?: string; age?: number };
export const KID_ID_RE = /^k_[a-f0-9]{10}$/;
export const AVATARS = ['lion', 'lamb', 'dove', 'fish', 'bear', 'owl'] as const;
export type Member = {
  id: string; name: string; email: string; createdAt: string; newsletter: boolean; phone?: string;
  /** "My Year in the Word" tracking; on unless turned off. */ wrapped?: boolean;
  /** Children (first name + age only) the parent added; their Bible-adventure stars count toward the family story. */ kids?: Kid[];
  /** TCH Loveforce (teens): the parent/guardian they asked us to connect with. */ teen?: { guardianEmail: string; birthYear?: number };
  /** Google account id when they use Continue with Google. */ google?: string;
};
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
const pub = (m: StoredMember): Member => ({ id: m.id, name: m.name, email: m.email, createdAt: m.createdAt, newsletter: m.newsletter, phone: m.phone, wrapped: m.wrapped !== false, kids: m.kids ?? [], teen: m.teen, google: m.google ? 'linked' : undefined });

export async function createMember(input: { name: string; email: string; password: string; newsletter: boolean; phone?: string; teen?: Member['teen'] }) {
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
    teen: input.teen,
    pw: await hash(input.password),
  };
  await kv.set(key(email), m);
  await kv.set(`memberid:${m.id}`, email);
  await kv.zadd('members', { score: Date.now(), member: email });
  return { member: pub(m) };
}

/** Continue with Google: signs in the account with that email (linking it
 * the first time), or creates one. Google has already verified the email. */
export async function googleMember(p: { sub: string; email: string; name: string }) {
  const email = p.email.trim().toLowerCase();
  const m = await kv.get<StoredMember>(key(email));
  if (m) {
    if (m.google !== p.sub) await kv.set(key(email), { ...m, google: p.sub });
    return { member: pub({ ...m, google: p.sub }), created: false };
  }
  const r = await createMember({ name: p.name || email.split('@')[0], email, password: randomBytes(24).toString('base64url'), newsletter: true });
  if ('error' in r) return null;
  const stored = await kv.get<StoredMember>(key(email));
  if (stored) await kv.set(key(email), { ...stored, google: p.sub });
  return { member: r.member, created: true };
}

export async function checkLogin(email: string, password: string) {
  const m = await kv.get<StoredMember>(key(email));
  if (!m || !(await verify(password, m.pw))) return null;
  return pub(m);
}

export async function startSession(memberId: string) {
  const token = randomBytes(32).toString('base64url');
  await kv.set(`sess:${token}`, memberId, { ex: SESSION_DAYS * 86400 });
  // Index the member's sessions so a password reset can sign out everywhere.
  await kv.sadd(`sessions:${memberId}`, token).catch(() => {});
  await kv.expire(`sessions:${memberId}`, SESSION_DAYS * 86400).catch(() => {});
  cookies().set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: SESSION_DAYS * 86400 });
}

/** Pushes the current session a year out; cheap, and at most once a day
 * per browser (a small marker cookie). Called from /api/auth/me. */
export async function touchSession(memberId: string) {
  const jar = cookies();
  const t = jar.get(SESSION_COOKIE)?.value;
  if (!t || jar.get(TOUCH_COOKIE)) return;
  await kv.expire(`sess:${t}`, SESSION_DAYS * 86400).catch(() => {});
  await kv.expire(`sessions:${memberId}`, SESSION_DAYS * 86400).catch(() => {});
  const secure = process.env.NODE_ENV === 'production';
  jar.set(SESSION_COOKIE, t, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: SESSION_DAYS * 86400 });
  jar.set(TOUCH_COOKIE, '1', { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge: 86400 });
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

export async function updateMember(email: string, patch: Partial<Pick<Member, 'name' | 'newsletter' | 'phone' | 'wrapped' | 'kids'>>) {
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

// Password reset. The emailed token is random; only its SHA-256 is stored,
// it lasts an hour and works once.
const RESET_TTL = 60 * 60;
const resetKey = (token: string) => `pwreset:${createHash('sha256').update(token).digest('hex')}`;

/** Returns a token (to email) when the account exists, otherwise null. */
export async function createPasswordReset(email: string): Promise<{ token: string; name: string; email: string } | null> {
  const m = await kv.get<StoredMember>(key(email));
  if (!m) return null;
  const token = randomBytes(32).toString('base64url');
  await kv.set(resetKey(token), m.email, { ex: RESET_TTL });
  return { token, name: m.name, email: m.email };
}

export async function resetIsValid(token: string) {
  return Boolean(token) && Boolean(await kv.get<string>(resetKey(token)));
}

/** Sets the new password, burns the token and signs out every old session. */
export async function completePasswordReset(token: string, password: string): Promise<Member | null> {
  const k = resetKey(token);
  const email = await kv.getdel<string>(k);
  if (!email) return null;
  const m = await kv.get<StoredMember>(key(email));
  if (!m) return null;
  const next = { ...m, pw: await hash(password) };
  await kv.set(key(email), next);
  const old = await kv.smembers(`sessions:${m.id}`).catch(() => [] as string[]);
  if (old.length) await kv.del(...old.map((t) => `sess:${t}`), `sessions:${m.id}`).catch(() => {});
  return pub(next);
}

/** Removes an account completely (sign-ins, profile, story data keys expire on their own). */
export async function deleteMember(email: string) {
  const m = await kv.get<StoredMember>(key(email));
  if (!m) return false;
  const sess = await kv.smembers(`sessions:${m.id}`).catch(() => [] as string[]);
  await kv.del(key(email), `memberid:${m.id}`, `sessions:${m.id}`, ...sess.map((t) => `sess:${t}`));
  await kv.zrem('members', m.email).catch(() => {});
  return true;
}

// Guardian notice for 13-17s: the parent/guardian gets a link that lets
// them remove the account in one tap. Only the token's hash is stored.
const guardianKey = (token: string) => `guardian:${createHash('sha256').update(token).digest('hex')}`;
export async function createGuardianLink(email: string) {
  const token = randomBytes(24).toString('base64url');
  await kv.set(guardianKey(token), email.trim().toLowerCase(), { ex: 400 * 86400 });
  return token;
}
export async function guardianLookup(token: string): Promise<Member | null> {
  if (!token) return null;
  const email = await kv.get<string>(guardianKey(token));
  if (!email) return null;
  const m = await kv.get<StoredMember>(key(email));
  return m ? pub(m) : null;
}
export async function guardianRemove(token: string) {
  const email = token ? await kv.getdel<string>(guardianKey(token)) : null;
  return email ? deleteMember(email) : false;
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
