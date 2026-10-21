// Backend for the site's forms (Volunteer, Prayer, Join/Membership,
// Give-intent) — previously these just hid the form and showed a fake
// "thank you" with nothing actually saved anywhere. Backed by the same
// Vercel KV store as lib/analytics.ts (a Redis list per form type),
// gated the same way: if KV isn't configured, submitForm fails loudly
// with a real error instead of pretending to succeed.

import { kv } from '@vercel/kv';
import { seal, unseal, encryptionOn } from '@/lib/bridge/crypto';

const KV_CONFIGURED = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

export type FormType = 'volunteer' | 'prayer' | 'join' | 'give' | 'testimony' | 'newsletter' | 'salvation' | 'teens';

export type FormSubmission = {
  fields: Record<string, string>;
  submittedAt: string;
};

const MAX_STORED = 500;

// Personal submissions are encrypted at rest once BRIDGE_ENC_KEY is set.
// Testimonies stay readable: they are written to be published.
type Stored = FormSubmission | { enc: string };
const aad = (type: FormType) => `forms|${type}`;

function pack(type: FormType, entry: FormSubmission): Stored {
  return encryptionOn && type !== 'testimony' ? { enc: seal(JSON.stringify(entry), aad(type)) } : entry;
}

function unpack(type: FormType, e: Stored): FormSubmission | null {
  if (!e || typeof e !== 'object') return null;
  if ('enc' in e) {
    const plain = unseal(e.enc, aad(type));
    try { return plain ? JSON.parse(plain) : null; } catch { return null; }
  }
  return e;
}

export async function submitForm(type: FormType, fields: Record<string, string>): Promise<{ ok: boolean; error?: string }> {
  if (!KV_CONFIGURED) {
    return { ok: false, error: "This form isn't connected yet — please email info@tchglobal.org directly for now." };
  }
  try {
    const entry: FormSubmission = { fields, submittedAt: new Date().toISOString() };
    const key = `forms:${type}`;
    await kv.lpush(key, pack(type, entry));
    await kv.ltrim(key, 0, MAX_STORED - 1);
    return { ok: true };
  } catch (err) {
    console.error(`submitForm(${type}) failed:`, err);
    return { ok: false, error: 'Could not save your submission right now — please try again in a moment.' };
  }
}

export async function listSubmissions(type: FormType, limit = 100): Promise<FormSubmission[] | null> {
  if (!KV_CONFIGURED) return null;
  try {
    const raw = await kv.lrange<Stored>(`forms:${type}`, 0, limit - 1);
    return raw.map((e) => unpack(type, e)).filter(Boolean) as FormSubmission[];
  } catch (err) {
    console.error(`listSubmissions(${type}) failed:`, err);
    return null;
  }
}

export const formsConfigured = KV_CONFIGURED;

// Right to erasure: remove every stored submission (any form) whose email
// or phone matches. Returns how many were removed.
export async function eraseSubmissions(match: (f: Record<string, string>) => boolean): Promise<number> {
  if (!KV_CONFIGURED) return 0;
  const types: FormType[] = ['volunteer', 'prayer', 'join', 'give', 'testimony', 'newsletter', 'salvation', 'teens'];
  let n = 0;
  for (const type of types) {
    const key = `forms:${type}`;
    const raw = (await kv.lrange<Stored>(key, 0, MAX_STORED)) ?? [];
    for (const e of raw) {
      const sub = unpack(type, e);
      if (sub && match(sub.fields || {})) {
        n += await kv.lrem(key, 1, e);
      }
    }
  }
  return n;
}
