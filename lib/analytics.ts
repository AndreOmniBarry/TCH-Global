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
// - views:{slug}                 -> integer, all-time view count
// - views:trending:{YYYY-MM-DD}  -> sorted set, slug -> views that day
//   (used to compute "trending this week" without scanning everything)
// - views:daily:{slug}:{YYYY-MM-DD} -> integer, per-day views for a single
//   slug, feeds the admin dashboard's trend chart
// - uniques:{slug}               -> HyperLogLog, approximate unique visitors
//   for a post/video, all time (no personal data — just an anonymous,
//   random per-browser ID; HLL means we don't even store the raw list,
//   just a probabilistic count)
// - shares:{slug}                -> integer, share-button clicks
// - reads:complete:{slug}        -> integer, readers who scrolled to the end

import { kv } from '@vercel/kv';

const KV_CONFIGURED = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function todayKey(date = new Date()) {
  return `views:trending:${dateKey(date)}`;
}

function lastNDayDates(n: number): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d);
  }
  return dates;
}

function last7DayKeys(): string[] {
  return lastNDayDates(7).map((d) => todayKey(d));
}

/** Call once per real page view of a post or video watch. `visitorId` is
 * an anonymous, random per-browser ID (see lib/visitor-id.ts) — used only
 * to approximate unique visitors via a HyperLogLog, never stored as a
 * list, never tied to any personal data. Safe to call from a client
 * component via a fetch to /api/track-view — never call directly from the
 * browser bundle (this file imports the KV write token). */
export async function recordView(slug: string, visitorId?: string): Promise<void> {
  if (!KV_CONFIGURED) return;
  try {
    const today = dateKey(new Date());
    const ops: Promise<unknown>[] = [
      kv.incr(`views:${slug}`),
      kv.zincrby(todayKey(), 1, slug),
      // Let each day's trending set expire itself after 14 days so old
      // buckets don't accumulate forever.
      kv.expire(todayKey(), 60 * 60 * 24 * 14),
      kv.incr(`views:daily:${slug}:${today}`),
      kv.expire(`views:daily:${slug}:${today}`, 60 * 60 * 24 * 30),
    ];
    if (visitorId) ops.push(kv.pfadd(`uniques:${slug}`, visitorId));
    await Promise.all(ops);
  } catch (err) {
    console.error('recordView failed (non-fatal, view just goes uncounted):', err);
  }
}

/** Approximate unique visitors, all time, for one slug. */
export async function getUniqueViewCount(slug: string): Promise<number | null> {
  if (!KV_CONFIGURED) return null;
  try {
    return await kv.pfcount(`uniques:${slug}`);
  } catch (err) {
    console.error('getUniqueViewCount failed:', err);
    return null;
  }
}

/** Daily view counts for one slug over the last `days` days, oldest
 * first — feeds the admin dashboard's trend chart. */
export async function getDailyViews(slug: string, days = 14): Promise<{ date: string; views: number }[] | null> {
  if (!KV_CONFIGURED) return null;
  try {
    const dates = lastNDayDates(days).reverse();
    const counts = await Promise.all(dates.map((d) => kv.get<number>(`views:daily:${slug}:${dateKey(d)}`)));
    return dates.map((d, i) => ({ date: dateKey(d), views: counts[i] || 0 }));
  } catch (err) {
    console.error('getDailyViews failed:', err);
    return null;
  }
}

/** Site-wide daily views (summed across every known slug) over the last
 * `days` days, oldest first. */
export async function getSiteDailyViews(allSlugs: string[], days = 14): Promise<{ date: string; views: number }[] | null> {
  if (!KV_CONFIGURED) return null;
  try {
    const dates = lastNDayDates(days).reverse();
    const perSlug = await Promise.all(allSlugs.map((slug) => getDailyViews(slug, days)));
    return dates.map((d, i) => ({
      date: dateKey(d),
      views: perSlug.reduce((sum, series) => sum + (series?.[i]?.views || 0), 0),
    }));
  } catch (err) {
    console.error('getSiteDailyViews failed:', err);
    return null;
  }
}

/** Week-over-week growth: (this 7-day window vs the previous 7-day
 * window) across every known slug, as a percentage. Null if there's no
 * prior-week data to compare against (avoids a misleading "+Infinity%"). */
export async function getWeekOverWeekGrowth(allSlugs: string[]): Promise<number | null> {
  if (!KV_CONFIGURED) return null;
  try {
    const thisWeek = lastNDayDates(7);
    const lastWeek = lastNDayDates(14).slice(7);

    async function sumWindow(dates: Date[]) {
      let total = 0;
      for (const slug of allSlugs) {
        const counts = await Promise.all(dates.map((d) => kv.get<number>(`views:daily:${slug}:${dateKey(d)}`)));
        total += counts.reduce<number>((s, c) => s + (c || 0), 0);
      }
      return total;
    }

    const [thisTotal, lastTotal] = await Promise.all([sumWindow(thisWeek), sumWindow(lastWeek)]);
    if (lastTotal === 0) return null;
    return Math.round(((thisTotal - lastTotal) / lastTotal) * 100);
  } catch (err) {
    console.error('getWeekOverWeekGrowth failed:', err);
    return null;
  }
}

/** Call when a reader taps a share button. */
export async function recordShare(slug: string): Promise<void> {
  if (!KV_CONFIGURED) return;
  try {
    await kv.incr(`shares:${slug}`);
  } catch (err) {
    console.error('recordShare failed (non-fatal):', err);
  }
}

export async function getShareCount(slug: string): Promise<number | null> {
  if (!KV_CONFIGURED) return null;
  try {
    return (await kv.get<number>(`shares:${slug}`)) ?? 0;
  } catch (err) {
    console.error('getShareCount failed:', err);
    return null;
  }
}

/** Call when a reader scrolls a post to (roughly) its end. */
export async function recordReadComplete(slug: string): Promise<void> {
  if (!KV_CONFIGURED) return;
  try {
    await kv.incr(`reads:complete:${slug}`);
  } catch (err) {
    console.error('recordReadComplete failed (non-fatal):', err);
  }
}

export async function getReadCompleteCount(slug: string): Promise<number | null> {
  if (!KV_CONFIGURED) return null;
  try {
    return (await kv.get<number>(`reads:complete:${slug}`)) ?? 0;
  } catch (err) {
    console.error('getReadCompleteCount failed:', err);
    return null;
  }
}

// A manual on/off flag for "we're live right now" — there's no automatic
// live-stream detection yet (see streaming/README.md), so this is set by
// hand via POST /api/live-status right before/after a service, and read
// by the favicon's status dot. Defaults to false / not-live if KV isn't
// configured or the key was never set.
export async function isLiveNow(): Promise<boolean> {
  if (!KV_CONFIGURED) return false;
  try {
    return Boolean(await kv.get<boolean>('site:live'));
  } catch (err) {
    console.error('isLiveNow failed:', err);
    return false;
  }
}

export async function setLiveNow(live: boolean): Promise<void> {
  if (!KV_CONFIGURED) return;
  try {
    await kv.set('site:live', live);
  } catch (err) {
    console.error('setLiveNow failed:', err);
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
