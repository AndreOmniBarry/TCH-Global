// Church calendar helpers. Everything is shown in Lagos time (WAT, UTC+1,
// no daylight saving) so a visitor abroad sees the same times as the
// church notice board.

export const LAGOS_OFFSET_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;
export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const CHURCH_ADDRESS = 'The Comforters House Global, 45 Edosomwan Street, Ikpoba Hill, Benin City';

export const WEEKLY = [
  { day: 0, h: 7, m: 30, mins: 105, name: 'First Service' },
  { day: 0, h: 9, m: 15, mins: 120, name: 'Second Service' },
  { day: 1, h: 17, m: 30, mins: 90, name: 'Prayer Meeting' },
  { day: 3, h: 17, m: 30, mins: 120, name: 'Midweek Service' },
];

/** Parts of an instant as seen on a Lagos wall clock. */
export function lagosParts(ms: number) {
  const d = new Date(ms + LAGOS_OFFSET_MS);
  return { y: d.getUTCFullYear(), mo: d.getUTCMonth(), d: d.getUTCDate(), wd: d.getUTCDay(), h: d.getUTCHours(), mi: d.getUTCMinutes() };
}

/** The instant for a Lagos wall-clock time. */
export function lagosToMs(y: number, mo: number, d: number, h = 0, mi = 0) {
  return Date.UTC(y, mo, d, h, mi) - LAGOS_OFFSET_MS;
}

/** "2026-10-04T09:15" (as typed in a datetime-local box) read as Lagos time. */
export function parseLagosLocal(v: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v);
  if (!m) return NaN;
  return lagosToMs(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
}

export function fmtTime(ms: number) {
  const { h, mi } = lagosParts(ms);
  return `${((h + 11) % 12) + 1}:${String(mi).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export function fmtDate(ms: number, withWeekday = true) {
  const p = lagosParts(ms);
  return `${withWeekday ? `${DAYS[p.wd]} ` : ''}${p.d} ${MONTHS[p.mo]}${p.y !== lagosParts(Date.now()).y ? ` ${p.y}` : ''}`;
}

export type CalItem = {
  id: string;
  title: string;
  start: number;
  end: number;
  location?: string | null;
  description?: string | null;
  link?: string | null;
  flyer?: string | null;
  weekly: boolean;
};

/** Weekly services expanded between two instants. */
export function weeklyBetween(from: number, to: number): CalItem[] {
  const out: CalItem[] = [];
  const p = lagosParts(from);
  for (let day = lagosToMs(p.y, p.mo, p.d); day < to; day += DAY_MS) {
    const wd = lagosParts(day).wd;
    for (const g of WEEKLY) {
      if (g.day !== wd) continue;
      const q = lagosParts(day);
      const start = lagosToMs(q.y, q.mo, q.d, g.h, g.m);
      const end = start + g.mins * 60_000;
      if (end > from && start < to) out.push({ id: `w-${g.name}-${start}`, title: g.name, start, end, location: 'Grace Dome Church', weekly: true });
    }
  }
  return out;
}

const icsStamp = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

export function googleCalUrl(it: CalItem) {
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: it.title,
    dates: `${icsStamp(it.start)}/${icsStamp(it.end)}`,
    details: [it.description, it.link].filter(Boolean).join('\n\n') || 'The Comforters House Global',
    location: it.location ? `${it.location}, Benin City` : CHURCH_ADDRESS,
    ctz: 'Africa/Lagos',
  });
  if (it.weekly) {
    const byday = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][lagosParts(it.start).wd];
    q.set('recur', `RRULE:FREQ=WEEKLY;BYDAY=${byday}`);
  }
  return `https://calendar.google.com/calendar/render?${q}`;
}

/** An .ics file for Apple Calendar / Outlook. */
export function icsFile(it: CalItem) {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (c) => `\\${c}`);
  const byday = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][lagosParts(it.start).wd];
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TCH Global//Calendar//EN', 'BEGIN:VEVENT',
    `UID:${it.id}@tch-global`, `DTSTAMP:${icsStamp(Date.now())}`, `DTSTART:${icsStamp(it.start)}`, `DTEND:${icsStamp(it.end)}`,
    ...(it.weekly ? [`RRULE:FREQ=WEEKLY;BYDAY=${byday}`] : []),
    `SUMMARY:${esc(it.title)}`,
    `LOCATION:${esc(it.location ? `${it.location}, Benin City` : CHURCH_ADDRESS)}`,
    ...(it.description || it.link ? [`DESCRIPTION:${esc([it.description, it.link].filter(Boolean).join('\n\n'))}`] : []),
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}
