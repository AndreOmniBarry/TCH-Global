// Server-only Sanity client with write access, for publishing from /write.
// Needs SANITY_API_WRITE_TOKEN (Sanity → API → Tokens → "Editor") and
// WRITE_PASSWORD (any passphrase your team will type on /write).
import { createClient, type SanityClient } from '@sanity/client';
import { timingSafeEqual } from 'crypto';

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'kqruklk1';
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
const token = process.env.SANITY_API_WRITE_TOKEN;

export const writeClient: SanityClient | null =
  projectId && token ? createClient({ projectId, dataset, token, apiVersion: '2024-01-01', useCdn: false }) : null;

export function passwordOk(given: string | null): boolean {
  const expected = process.env.WRITE_PASSWORD;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
