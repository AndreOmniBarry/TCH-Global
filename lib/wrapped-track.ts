import 'server-only';
import { kv } from '@vercel/kv';
import { getLibrary } from '@/lib/library';
import type { Member } from '@/lib/auth';
import type { Wrapped } from '@/lib/wrapped';

// Private per-member activity for "My Year in the Word". Recorded only for
// signed-in members who haven't turned it off, kept per year and per month
// (so the monthly recap and the yearly story come from the same writes),
// and expired after ~13 months. Nobody but the member sees it.

const TTL = 60 * 60 * 24 * 400;
const KV_ON = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

function lagos(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
    .formatToParts(d).reduce<Record<string, string>>((a, p) => { a[p.type] = p.value; return a; }, {});
  return { year: parts.year, month: `${parts.year}-${parts.month}`, day: `${parts.year}-${parts.month}-${parts.day}`, hour: parts.hour };
}

const key = (mid: string, period: string, part = '') => `wr:${mid}:${period}${part ? `:${part}` : ''}`;

export type Activity =
  | { kind: 'listen'; media: string; seconds: number }
  | { kind: 'play'; media: string }
  | { kind: 'read'; slug: string; topic?: string }
  | { kind: 'readDone'; slug: string; topic?: string }
  | { kind: 'pray' }
  | { kind: 'drop' }
  | { kind: 'kidStar'; kid: string };

export async function recordActivity(member: Member & { wrapped?: boolean }, a: Activity) {
  if (!KV_ON || member.wrapped === false) return;
  const t = lagos();
  const secs = a.kind === 'listen' ? Math.max(0, Math.min(60, Math.round(a.seconds))) : 0;
  const m = kv.multi();
  for (const period of [t.year, t.month]) {
    if (a.kind === 'kidStar') {
      // A child's adventures live under the parent, apart from the parent's own days.
      m.hincrby(key(member.id, period, 'kids'), a.kid, 1);
      m.sadd(key(member.id, period, `kd:${a.kid}`), t.day);
      m.expire(key(member.id, period, 'kids'), TTL);
      m.expire(key(member.id, period, `kd:${a.kid}`), TTL);
      continue;
    }
    m.sadd(key(member.id, period, 'days'), t.day);
    m.hincrby(key(member.id, period, 'hours'), t.hour, 1);
    if (a.kind === 'listen') {
      m.hincrby(key(member.id, period), 'secs', secs);
      m.zincrby(key(member.id, period, 'listen'), secs, a.media);
    } else if (a.kind === 'play') {
      m.zincrby(key(member.id, period, 'media'), 1, a.media);
    } else if (a.kind === 'readDone') {
      m.hincrby(key(member.id, period), 'posts', 1);
      if (a.topic) m.zincrby(key(member.id, period, 'topics'), 1, a.topic);
    } else if (a.kind === 'pray') {
      m.hincrby(key(member.id, period), 'prayers', 1);
    } else if (a.kind === 'drop') {
      m.hincrby(key(member.id, period), 'drops', 1);
    }
    for (const part of ['', 'days', 'hours', 'listen', 'media', 'topics']) m.expire(key(member.id, period, part), TTL);
  }
  if (secs) m.zincrby(`wr:rank:${t.year}`, secs, member.id);
  await m.exec().catch((e) => console.error('wrapped record', (e as Error).name));
}

// Week-by-week activity (0-4) from the set of active days.
function weeksFrom(days: string[], period: string): number[] {
  const start = period.length === 4 ? new Date(`${period}-01-01T00:00:00Z`) : new Date(`${period}-01T00:00:00Z`);
  const end = period.length === 4 ? new Date(`${Number(period) + 1}-01-01T00:00:00Z`) : new Date(new Date(start).setUTCMonth(start.getUTCMonth() + 1));
  const n = Math.max(1, Math.ceil((+end - +start) / (7 * 864e5)));
  const counts = new Array(n).fill(0);
  for (const d of days) {
    const i = Math.floor((+new Date(`${d}T00:00:00Z`) - +start) / (7 * 864e5));
    if (i >= 0 && i < n) counts[i]++;
  }
  return counts.map((c) => (c === 0 ? 0 : c <= 1 ? 1 : c <= 3 ? 2 : c <= 5 ? 3 : 4));
}

function longestStreak(days: string[]): number {
  const s = days.map((d) => +new Date(`${d}T00:00:00Z`) / 864e5).sort((a, b) => a - b);
  let best = 0, run = 0, prev = -2;
  for (const d of s) { run = d === prev + 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; }
  return best;
}

function persona(hours: Record<string, number>, secs: number, days: number): Wrapped['persona'] {
  const by = (from: number, to: number) => Object.entries(hours).reduce((a, [h, v]) => (Number(h) >= from && Number(h) < to ? a + Number(v) : a), 0);
  const total = Object.values(hours).reduce((a, v) => a + Number(v), 0) || 1;
  if (by(4, 8) / total > 0.3) return { name: 'The Early Riser', line: 'Most of your time in the Word came before 8am, the first voice you heard each day was His.' };
  if (by(21, 24) / total + by(0, 4) / total > 0.3) return { name: 'The Night Watch', line: 'You kept company with the Word late into the night, when the house was quiet.' };
  if (days > 0 && secs / days > 40 * 60) return { name: 'The Deep Diver', line: 'When you sat with a message, you stayed with it, long, unhurried listening.' };
  return { name: 'The Faithful Friend', line: 'Little and often: you kept coming back to the Word, week after week.' };
}

const VERSES: Record<string, Wrapped['blessing']> = {
  'The Early Riser': { verse: 'In the morning, O Lord, You hear my voice; in the morning I lay my requests before You and wait expectantly.', ref: 'Psalm 5:3', text: '' },
  'The Night Watch': { verse: 'On my bed I remember You; I think of You through the watches of the night.', ref: 'Psalm 63:6', text: '' },
  'The Deep Diver': { verse: 'Blessed is the one whose delight is in the law of the Lord, and who meditates on His law day and night.', ref: 'Psalm 1:2', text: '' },
  'The Faithful Friend': { verse: 'Your word is a lamp to my feet and a light to my path.', ref: 'Psalm 119:105', text: '' },
};

/** Builds the member's story for a year ("2026") or month ("2026-10").
 * Returns null when there isn't enough yet to tell a story. */
export async function buildWrapped(member: Member, period: string): Promise<Wrapped | null> {
  if (!KV_ON) return null;
  const [base, days, hours, listen, media, topics] = await Promise.all([
    kv.hgetall<Record<string, number>>(key(member.id, period)),
    kv.smembers(key(member.id, period, 'days')),
    kv.hgetall<Record<string, number>>(key(member.id, period, 'hours')),
    kv.zrange<string[]>(key(member.id, period, 'listen'), 0, 9, { rev: true, withScores: true }),
    kv.zrange<string[]>(key(member.id, period, 'media'), 0, 9, { rev: true, withScores: true }),
    kv.zrange<string[]>(key(member.id, period, 'topics'), 0, 0, { rev: true }),
  ]);
  const secs = Number(base?.secs || 0);
  const kidStars = (member.kids ?? []).length ? await kv.hgetall<Record<string, number>>(key(member.id, period, 'kids')) : null;
  const family = (member.kids ?? [])
    .map((k) => ({ k, stars: Number(kidStars?.[k.id] || 0) }))
    .filter((x) => x.stars > 0);
  const familyDays = await Promise.all(family.map((x) => kv.scard(key(member.id, period, `kd:${x.k.id}`))));
  if (!days.length && !family.length) return null;

  const { items } = await getLibrary();
  const byId = new Map(items.map((i) => [i.id, i]));
  const pairs = (arr: (string | number)[]) => { const o: [string, number][] = []; for (let i = 0; i < arr.length; i += 2) o.push([String(arr[i]), Number(arr[i + 1])]); return o; };
  const plays = new Map<string, number>(pairs(media));
  for (const [id] of pairs(listen)) if (!plays.has(id)) plays.set(id, 1);
  const top = [...plays.entries()].sort((a, b) => b[1] - a[1])
    .map(([id, n]) => ({ it: byId.get(id.replace(/^(media|yt):/, '')), n }))
    .filter((x) => x.it && x.it.kind !== 'book')
    .slice(0, 5)
    .map((x) => ({ title: x.it!.title, series: x.it!.series ?? undefined, plays: x.n }));
  const book = [...plays.keys()].map((id) => byId.get(id.replace(/^(media|yt):/, ''))).find((it) => it?.kind === 'book')?.title;

  // The series they spent most time in, and how much of it they finished.
  const seriesCount = new Map<string, number>();
  top.forEach((t) => { if (t.series) seriesCount.set(t.series, (seriesCount.get(t.series) || 0) + 1); });
  const seriesName = [...seriesCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const seriesParts = seriesName ? items.filter((i) => i.series === seriesName).length : 0;
  const seriesDone = seriesName ? [...plays.keys()].filter((id) => byId.get(id.replace(/^(media|yt):/, ''))?.series === seriesName).length : 0;

  const year = period.slice(0, 4);
  const [rank, total] = await Promise.all([kv.zrevrank(`wr:rank:${year}`, member.id), kv.zcard(`wr:rank:${year}`)]);
  const topPercent = rank == null || !total ? 50 : Math.max(1, Math.round(((rank + 1) / total) * 100));

  const p = persona(hours || {}, secs, days.length);
  const v = VERSES[p.name];
  const label = period.length === 4 ? period : new Date(`${period}-01T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  return {
    name: member.name.split(' ')[0],
    period: label,
    minutes: Math.round(secs / 60),
    days: days.length,
    streak: longestStreak(days),
    weeks: weeksFrom(days, period),
    topMessages: top.length ? top : [{ title: 'Your first message is waiting in PUDLIB!', plays: 0 }],
    topSeries: { title: seriesName || 'Start a series in PUDLIB!', parts: Math.max(seriesParts, 1), finished: Math.min(seriesDone, Math.max(seriesParts, 1)) },
    reads: { posts: Number(base?.posts || 0), topTopic: topics[0] || 'Faith', book, drops: Number(base?.drops || 0) || undefined },
    family: family.length ? family.map((x, i) => ({ name: x.k.name, stars: x.stars, days: familyDays[i] || 0 })) : undefined,
    prayers: { prayed: Number(base?.prayers || 0), testimonies: 0 },
    persona: p,
    topPercent,
    blessing: { verse: v.verse, ref: v.ref, text: 'May the grace of our Lord Jesus Christ, the love of God, and the fellowship of the Holy Spirit be with you all through the year ahead.' },
  };
}
