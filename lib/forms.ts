// Backend for the site's forms (Volunteer, Prayer, Join/Membership,
// Give-intent) — previously these just hid the form and showed a fake
// "thank you" with nothing actually saved anywhere. Backed by the same
// Vercel KV store as lib/analytics.ts (a Redis list per form type),
// gated the same way: if KV isn't configured, submitForm fails loudly
// with a real error instead of pretending to succeed.

import { kv } from '@vercel/kv';

const KV_CONFIGURED = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

export type FormType = 'volunteer' | 'prayer' | 'join' | 'give';

export type FormSubmission = {
  fields: Record<string, string>;
  submittedAt: string;
};

const MAX_STORED = 500;

export async function submitForm(type: FormType, fields: Record<string, string>): Promise<{ ok: boolean; error?: string }> {
  if (!KV_CONFIGURED) {
    return { ok: false, error: "This form isn't connected yet — please email info@tchglobal.org directly for now." };
  }
  try {
    const entry: FormSubmission = { fields, submittedAt: new Date().toISOString() };
    const key = `forms:${type}`;
    await kv.lpush(key, entry);
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
    return await kv.lrange<FormSubmission>(`forms:${type}`, 0, limit - 1);
  } catch (err) {
    console.error(`listSubmissions(${type}) failed:`, err);
    return null;
  }
}

export const formsConfigured = KV_CONFIGURED;
