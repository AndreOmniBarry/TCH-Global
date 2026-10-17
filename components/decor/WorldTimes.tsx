'use client';

// The next service in the times of the places our family watches from.
// Intl handles each country's daylight saving, so the UK and North America
// shift by themselves in spring and autumn.

const F = { w: 30, h: 20 };
const Flag = ({ c }: { c: string }) => {
  const box = { width: 22, height: 15, viewBox: `0 0 ${F.w} ${F.h}`, 'aria-hidden': true, className: 'hw-flag' } as const;
  switch (c) {
    case 'ng': return <svg {...box}><rect width="10" height="20" fill="#008751" /><rect x="10" width="10" height="20" fill="#fff" /><rect x="20" width="10" height="20" fill="#008751" /></svg>;
    case 'gb': return (
      <svg {...box}>
        <clipPath id="hw-gb"><rect width="30" height="20" /></clipPath>
        <g clipPath="url(#hw-gb)">
          <rect width="30" height="20" fill="#012169" />
          <path d="M0 0L30 20M30 0L0 20" stroke="#fff" strokeWidth="4" />
          <path d="M0 0L30 20M30 0L0 20" stroke="#C8102E" strokeWidth="1.6" />
          <path d="M15 0v20M0 10h30" stroke="#fff" strokeWidth="6" />
          <path d="M15 0v20M0 10h30" stroke="#C8102E" strokeWidth="3.4" />
        </g>
      </svg>
    );
    case 'us': return (
      <svg {...box}>
        <rect width="30" height="20" fill="#fff" />
        {[0, 2, 4, 6, 8, 10, 12].map((i) => <rect key={i} y={i * (20 / 13)} width="30" height={20 / 13} fill="#B22234" />)}
        <rect width="13" height={20 * 7 / 13} fill="#3C3B6E" />
        {[0, 1, 2].map((r) => [0, 1, 2, 3].map((k) => <circle key={`${r}${k}`} cx={2 + k * 3} cy={2 + r * 3.4} r=".7" fill="#fff" />))}
      </svg>
    );
    case 'ca': return (
      <svg {...box}>
        <rect width="30" height="20" fill="#fff" />
        <rect width="7.5" height="20" fill="#D52B1E" /><rect x="22.5" width="7.5" height="20" fill="#D52B1E" />
        <path d="M15 4l1 2.2 1.6-.8-.6 3.4 2-1.8.5 1.3 1.8-.4-.9 2.2.9.4-3.4 2.6.4 1.2-3-.5V17h-.6v-3.2l-3 .5.4-1.2-3.4-2.6.9-.4-.9-2.2 1.8.4.5-1.3 2 1.8-.6-3.4 1.6.8z" fill="#D52B1E" />
      </svg>
    );
    case 'gh': return <svg {...box}><rect width="30" height="6.67" fill="#CE1126" /><rect y="6.67" width="30" height="6.67" fill="#FCD116" /><rect y="13.33" width="30" height="6.67" fill="#006B3F" /><path d="M15 7l.9 2.2h2.4l-1.9 1.4.7 2.3-2.1-1.4-2.1 1.4.7-2.3-1.9-1.4h2.4z" fill="#000" /></svg>;
    case 'ke': return (
      <svg {...box}>
        <rect width="30" height="20" fill="#fff" />
        <rect width="30" height="6" fill="#000" /><rect y="7.2" width="30" height="5.6" fill="#BB0000" /><rect y="14" width="30" height="6" fill="#006600" />
        <ellipse cx="15" cy="10" rx="2.6" ry="5" fill="#BB0000" stroke="#000" strokeWidth=".6" />
        <path d="M15 5.4v9.2" stroke="#fff" strokeWidth=".6" />
      </svg>
    );
    case 'za': return (
      <svg {...box}>
        <rect width="30" height="10" fill="#E03C31" /><rect y="10" width="30" height="10" fill="#001489" />
        <path d="M0 0l13 10L0 20" fill="#fff" /><path d="M13 10h17" stroke="#fff" strokeWidth="6" />
        <path d="M0 2.2l10.2 7.8L0 17.8" fill="#007749" /><path d="M10 10h20" stroke="#007749" strokeWidth="3.6" />
        <path d="M0 0l13 10L0 20" fill="none" stroke="#fff" strokeWidth="0" />
        <path d="M0 4.4l7.4 5.6L0 15.6z" fill="#FFB81C" /><path d="M0 6.2l5.1 3.8L0 13.8z" fill="#000" />
      </svg>
    );
    case 'de': return <svg {...box}><rect width="30" height="6.67" fill="#000" /><rect y="6.67" width="30" height="6.67" fill="#DD0000" /><rect y="13.33" width="30" height="6.67" fill="#FFCE00" /></svg>;
    default: return <svg {...box}><rect width="30" height="20" rx="2" fill="currentColor" opacity=".25" /><circle cx="15" cy="10" r="5" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>;
  }
};

const ZONES = [
  { c: 'ng', label: 'Nigeria', tz: 'Africa/Lagos' },
  { c: 'gh', label: 'Ghana', tz: 'Africa/Accra' },
  { c: 'ke', label: 'Kenya', tz: 'Africa/Nairobi' },
  { c: 'za', label: 'South Africa', tz: 'Africa/Johannesburg' },
  { c: 'gb', label: 'UK', tz: 'Europe/London' },
  { c: 'de', label: 'Germany', tz: 'Europe/Berlin' },
  { c: 'us', label: 'US East', tz: 'America/New_York' },
  { c: 'ca', label: 'Canada', tz: 'America/Toronto' },
  { c: 'us', label: 'US West', tz: 'America/Los_Angeles' },
];

function fmt(ms: number, tz: string, refDay: string) {
  const time = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(ms);
  const day = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(ms);
  return { time, day: day === refDay ? '' : day };
}

export default function WorldTimes({ startMs, live }: { startMs: number; live: boolean }) {
  const mine = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const list = ZONES.some((z) => z.tz === mine) ? ZONES : [...ZONES, { c: 'you', label: 'Your time', tz: mine }];
  const refDay = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Lagos', weekday: 'short' }).format(startMs);
  return (
    <div className="hw" aria-label={live ? 'Live now around the world' : 'Next service around the world'}>
      <span className="hw-lead">{live ? 'Live now in' : 'Starts at'}</span>
      <ul className="hw-list">
        {list.map((z) => {
          const t = fmt(live ? Date.now() : startMs, z.tz, refDay);
          return (
            <li key={z.label} className={z.tz === mine ? 'is-you' : ''}>
              <Flag c={z.c} />
              <span className="hw-place">{z.label}</span>
              <strong>{t.time}</strong>
              {t.day && <span className="hw-day">{t.day}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
