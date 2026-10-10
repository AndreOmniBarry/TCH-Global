import { GENERAL, NATIVITY, PASSION, type Story } from './stories';

// Day 0 of the daily stories.
const EPOCH = Date.UTC(2026, 9, 10);
const DAY = 86400000;

/** Easter Sunday (Gregorian), anonymous algorithm. */
export function easter(y: number) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return Date.UTC(y, month - 1, day);
}

/** Today's date in Lagos as a UTC-midnight timestamp. */
export function lagosDay(now = Date.now()) {
  const d = new Date(now + 3600000);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function seasonal(day: number): Story | null {
  const d = new Date(day);
  const y = d.getUTCFullYear();
  const dec14 = Date.UTC(y, 11, 14);
  if (day >= dec14 && day <= Date.UTC(y, 11, 25)) return NATIVITY[Math.round((day - dec14) / DAY)] ?? null;
  const palm = easter(y) - 7 * DAY;
  if (day >= palm && day <= palm + 8 * DAY) return PASSION[Math.round((day - palm) / DAY)] ?? null;
  return null;
}

export type Daily = { story: Story; season: 'christmas' | 'easter' | null; dayNo: number; round: number };

/** The story for a given day. Seasonal series take their dates; everyday
 * stories run in order on the remaining days with no repeats until the
 * whole library has been told. */
export function storyFor(day = lagosDay()): Daily {
  const s = seasonal(day);
  const dayNo = Math.max(0, Math.round((day - EPOCH) / DAY));
  if (s) return { story: s, season: NATIVITY.includes(s) ? 'christmas' : 'easter', dayNo, round: 1 };
  let n = 0;
  for (let t = EPOCH; t < day; t += DAY) if (!seasonal(t)) n += 1;
  return { story: GENERAL[n % GENERAL.length], season: null, dayNo, round: Math.floor(n / GENERAL.length) + 1 };
}

/** Small deterministic random generator (same puzzle for everyone today). */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
}
