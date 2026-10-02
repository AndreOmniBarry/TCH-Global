// PUDLIB! — Pastor Uzor Digital Library. One normalised list of videos
// (YouTube API), audio and books (Sanity), each with a base score that
// blends recency and popularity. The client re-ranks per visitor from
// their own listening/watching history (see components/pudlib/).
import { kv } from '@vercel/kv';
import { getLatestVideos } from '@/lib/youtube';
import { sanityClient } from '@/lib/sanity';

export type LibKind = 'video' | 'audio' | 'book';
export type LibItem = {
  id: string;
  kind: LibKind;
  title: string;
  image: string;
  date: string | null;
  series: string | null;
  description: string | null;
  youtubeId?: string;
  audioSrc?: string;
  price?: string | null;
  orderHref?: string;
  featured?: boolean;
  views: number;
  score: number;
};

const KV_CONFIGURED = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

const FALLBACK_BOOKS: Omit<LibItem, 'views' | 'score'>[] = [
  { id: 'book-faith-life', kind: 'book', title: 'Understanding the Faith Life', image: '/images/book-faith-life.webp', date: null, series: null, description: 'A practical guide to living by faith every day.', price: null, featured: true },
  { id: 'book-daily-inspiration', kind: 'book', title: 'Daily Inspiration', image: '/images/book-daily-inspiration.webp', date: null, series: null, description: 'Short daily words of comfort and strength.', price: null, featured: true },
];

// "Faith That Moves Mountains | Part 2" or "... - Series Name" -> series.
function seriesFromTitle(title: string): string | null {
  const m = title.match(/^(.*?)\s*(?:\||[-–—]\s*part|\bpt\.?)\s*\d+/i) || title.match(/^(.+?)\s+\|\s+/);
  return m ? m[1].trim() : null;
}

function orderHref(title: string, link?: string | null) {
  return link || `mailto:info@tchglobal.org?subject=${encodeURIComponent(`Book order: ${title}`)}`;
}

async function viewsFor(ids: string[]): Promise<Record<string, number>> {
  if (!KV_CONFIGURED || !ids.length) return {};
  try {
    const vals = await kv.mget<(number | null)[]>(...ids.map((id) => `views:media:${id}`));
    return Object.fromEntries(ids.map((id, i) => [id, Number(vals[i]) || 0]));
  } catch {
    return {};
  }
}

function score(item: Omit<LibItem, 'score'>) {
  const ageDays = item.date ? (Date.now() - new Date(item.date).getTime()) / 86400000 : 120;
  const recency = Math.exp(-Math.max(0, ageDays) / 45);
  const popularity = Math.min(1, Math.log10(1 + item.views) / 3);
  return 0.6 * recency + 0.4 * popularity + (item.featured ? 0.25 : 0);
}

export async function getLibrary(): Promise<{ items: LibItem[]; videosConnected: boolean }> {
  const [videos, sanityData] = await Promise.all([
    getLatestVideos(50),
    sanityClient
      ? sanityClient
          .fetch(`{
            "audio": *[_type == "audioMessage"] | order(publishedAt desc) { _id, title, series, description, publishedAt, "src": coalesce(audioFile.asset->url, audioUrl), "image": cover.asset->url },
            "books": *[_type == "book"] | order(publishedAt desc) { _id, title, description, price, orderLink, featured, publishedAt, "image": cover.asset->url }
          }`)
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  const base: Omit<LibItem, 'views' | 'score'>[] = [];
  for (const v of videos ?? []) {
    base.push({ id: `yt-${v.id}`, kind: 'video', title: v.title, image: v.thumbnail, date: v.publishedAt, series: seriesFromTitle(v.title), description: null, youtubeId: v.id });
  }
  for (const a of sanityData?.audio ?? []) {
    if (!a.src) continue;
    base.push({ id: `au-${a._id}`, kind: 'audio', title: a.title, image: a.image || '/images/pastor-mic.webp', date: a.publishedAt, series: a.series || seriesFromTitle(a.title), description: a.description, audioSrc: a.src });
  }
  const books = sanityData?.books?.length
    ? sanityData.books.map((b: any) => ({ id: `bk-${b._id}`, kind: 'book' as const, title: b.title, image: b.image || '/images/book-faith-life.webp', date: b.publishedAt, series: null, description: b.description, price: b.price, featured: !!b.featured, orderHref: orderHref(b.title, b.orderLink) }))
    : FALLBACK_BOOKS.map((b) => ({ ...b, orderHref: orderHref(b.title) }));
  base.push(...books);

  const views = await viewsFor(base.map((b) => b.id));
  const items = base
    .map((b) => {
      const withViews = { ...b, views: views[b.id] ?? 0 };
      return { ...withViews, score: score(withViews) };
    })
    .sort((a, b) => b.score - a.score);
  return { items, videosConnected: videos !== null };
}

// Homepage preview: a small, balanced, high-scoring mix — never the
// whole catalogue.
export function pickPreview(items: LibItem[], size = 6): LibItem[] {
  const want: Record<LibKind, number> = { video: 3, audio: 1, book: 2 };
  const out: LibItem[] = [];
  for (const it of items) {
    if (want[it.kind] > 0) { out.push(it); want[it.kind] -= 1; }
    if (out.length >= size) break;
  }
  for (const it of items) { if (out.length >= size) break; if (!out.includes(it)) out.push(it); }
  return out;
}
