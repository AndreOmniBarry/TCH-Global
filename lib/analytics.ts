// Reader analytics — "how many people read this, what's trending" for
// the church admin. Backed by Vercel KV (a hosted Redis), gated the
// same way Sanity/YouTube are: if the KV env vars aren't set, every
// function here is a safe no-op and the site works exactly as it does
// today, just without view counts. The moment you provision a KV store
// in the Vercel dashboard (a few clicks, no code), this activates.
//
// Setup: see /analytics/README.md.
//
// Data model (all simple Redis primitives, nothing exotic):
// - views:{slug}                -> integer, all-time view count for a post
// - views:trending:{YYYY-MM-DD} -> sorted set, slug -> views that day
//   (used to compute "trending this week" without scanning everything)

import { kv } from '@vercel/kv';

const KV_CONFIGURED = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

function todayKey(date = new Date()) {
  return `views:trending:${date.toISOString().slice(0, 10)}`;
}

function last7DayKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(todayKey(d));
  }
  return keys;
}

/** Call once per real page view of a post. Safe to call from a client
 * component via a fetch to /api/track-view — never call directly from
 * the browser bundle (this file imports the KV write token). */
export async function recordView(slug: string): Promise<void> {
  if (!KV_CONFIGURED) return;
  try {
    await Promise.all([
      kv.incr(`views:${slug}`),
      kv.zincrby(todayKey(), 1, slug),
      // Let each day's trending set expire itself after 14 days so old
      // buckets don't accumulate forever.
      kv.expire(todayKey(), 60 * 60 * 24 * 14),
    ]);
  } catch (err) {
    console.error('recordView failed (non-fatal, view just goes uncounted):', err);
  }
}

/** All-time view count for one post. Returns null if KV isn't configured
 * (distinct from 0, which means "configured but genuinely no views yet"). */
export async function getViewCount(slug: string): Promise<number | null> {
  if (!KV_CONFIGURED) return null;
  try {
    const count = await kv.get<number>(`views:${slug}`);
    return count ?? 0;
  } catch (err) {
    console.error('getViewCount failed:', err);
    return null;
  }
}

/** Slugs ranked by views in the last 7 days — "Trending". */
export async function getTrendingSlugs(limit = 5): Promise<string[] | null> {
  if (!KV_CONFIGURED) return null;
  try {
    const keys = last7DayKeys();
    const totals = new Map<string, number>();
    for (const key of keys) {
      const entries = await kv.zrange<string[]>(key, 0, -1, { withScores: true });
      // zrange with withScores returns a flat [member, score, member, score, ...] array
      for (let i = 0; i < entries.length; i += 2) {
        const slug = entries[i];
        const score = Number(entries[i + 1]);
        totals.set(slug, (totals.get(slug) || 0) + score);
      }
    }
    return [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([slug]) => slug);
  } catch (err) {
    console.error('getTrendingSlugs failed:', err);
    return null;
  }
}

/** Slugs ranked by all-time views — "Most Watched". Requires scanning
 * known slugs since Redis doesn't index by value; callers pass the
 * full slug list (cheap — it's just the post list you already fetched). */
export async function getMostWatchedSlugs(allSlugs: string[], limit = 5): Promise<string[] | null> {
  if (!KV_CONFIGURED) return null;
  try {
    const counts = await Promise.all(allSlugs.map((slug) => kv.get<number>(`views:${slug}`)));
    return allSlugs
      .map((slug, i) => [slug, counts[i] || 0] as const)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([slug]) => slug);
  } catch (err) {
    console.error('getMostWatchedSlugs failed:', err);
    return null;
  }
}

export const analyticsConfigured = KV_CONFIGURED;
