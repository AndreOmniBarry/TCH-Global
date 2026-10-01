'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Africa/Lagos is UTC+1 year-round (no DST).
const LAGOS_OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const GATHERINGS = [
  { day: 0, h: 7, m: 30, mins: 105, name: 'First Service' },
  { day: 0, h: 9, m: 15, mins: 120, name: 'Second Service' },
  { day: 1, h: 17, m: 30, mins: 90, name: 'Prayer Meeting' },
  { day: 3, h: 17, m: 30, mins: 120, name: 'Midweek Service' },
];

type Next = { name: string; label: string; msUntil: number; inProgress: boolean; href: string };

export type HeroEvent = { title: string; startsAt: string; endsAt: string | null; location: string | null };
type Props = {
  latestPost: { title: string; slug: string; meta: string } | null;
  events: HeroEvent[];
  testimony: { name: string; quote: string } | null;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function lagosLabel(ms: number, withDate: boolean) {
  const d = new Date(ms + LAGOS_OFFSET_MS);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const time = `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  return withDate ? `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} · ${time} WAT` : `${DAYS[d.getUTCDay()]} ${time} WAT`;
}

function nextGathering(nowMs: number, events: HeroEvent[]): Next {
  const lagos = new Date(nowMs + LAGOS_OFFSET_MS);
  const dayStart = Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), lagos.getUTCDate());
  const nowLagos = nowMs + LAGOS_OFFSET_MS;
  let best: Next | null = null;
  for (const g of GATHERINGS) {
    const delta = (g.day - lagos.getUTCDay() + 7) % 7;
    let start = dayStart + delta * DAY_MS + (g.h * 60 + g.m) * 60 * 1000;
    const end = start + g.mins * 60 * 1000;
    if (nowLagos >= start && nowLagos < end) {
      return { name: g.name, label: '', msUntil: 0, inProgress: true, href: '#media' };
    }
    if (start <= nowLagos) start += 7 * DAY_MS;
    const msUntil = start - nowLagos;
    if (!best || msUntil < best.msUntil) {
      const h12 = ((g.h + 11) % 12) + 1;
      const label = `${DAYS[g.day]} ${h12}:${String(g.m).padStart(2, '0')} ${g.h < 12 ? 'AM' : 'PM'} WAT`;
      best = { name: g.name, label, msUntil, inProgress: false, href: '#service' };
    }
  }
  for (const e of events) {
    const start = new Date(e.startsAt).getTime();
    if (!Number.isFinite(start)) continue;
    const end = e.endsAt ? new Date(e.endsAt).getTime() : start + 3 * 60 * 60 * 1000;
    if (nowMs >= start && nowMs < end) return { name: e.title, label: '', msUntil: 0, inProgress: true, href: '#events' };
    const msUntil = start - nowMs;
    if (msUntil > 0 && (!best || msUntil < best.msUntil)) {
      best = { name: e.title, label: lagosLabel(start, true), msUntil, inProgress: false, href: '#events' };
    }
  }
  return best!;
}

function formatCountdown(ms: number) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return d > 0 ? `${d}d ${pad(h)}h ${pad(m)}m` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

function NextGatheringChip({ events }: { events: HeroEvent[] }) {
  const [now, setNow] = useState<number | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    fetch('/api/live-status')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setLive(Boolean(d?.live)))
      .catch(() => {});
    return () => window.clearInterval(id);
  }, []);

  if (now === null) return <span className="hero-chip hero-chip--placeholder">&nbsp;</span>;
  const next = nextGathering(now, events);
  const isLive = live || next.inProgress;

  if (isLive) {
    return (
      <a href="/live" className="hero-chip hero-chip--live">
        <span className="hero-chip-dot" aria-hidden="true" />
        <strong>Live now</strong>
        <span className="hero-chip-sep" aria-hidden="true">·</span>
        <span>{next.inProgress ? next.name : 'Join the stream'}</span>
      </a>
    );
  }
  return (
    <a href="#service" className="hero-chip">
      <span className="hero-chip-dot" aria-hidden="true" />
      <span className="hero-chip-muted">Next</span>
      <strong>{next.name}</strong>
      <span className="hero-chip-sep" aria-hidden="true">·</span>
      <span className="hero-chip-muted hero-chip-when">{next.label}</span>
      <span className="hero-chip-count" aria-label={`starts in ${formatCountdown(next.msUntil)}`}>{formatCountdown(next.msUntil)}</span>
    </a>
  );
}

function HeroCards({ latestPost, events, testimony }: Props) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
  const upcoming = now === null ? events[0] : events.find((e) => new Date(e.endsAt ?? e.startsAt).getTime() > now);

  let cardA: React.ReactNode;
  if (upcoming) {
    cardA = (
      <a href="#events" className="hero-card hero-card--a" style={{ ['--depth' as string]: 1.6 }}>
        <span className="hero-card-eyebrow">Upcoming event</span>
        <strong className="hero-card-title">{upcoming.title}</strong>
        <span className="hero-card-ref">{lagosLabel(new Date(upcoming.startsAt).getTime(), true)}</span>
        {upcoming.location && <span className="hero-card-ref">{upcoming.location}</span>}
      </a>
    );
  } else if (testimony) {
    const q = testimony.quote.length > 110 ? `${testimony.quote.slice(0, 107).trimEnd()}…` : testimony.quote;
    cardA = (
      <a href="#testimonies" className="hero-card hero-card--a" style={{ ['--depth' as string]: 1.6 }}>
        <span className="hero-card-eyebrow">Recent testimony</span>
        <p>&ldquo;{q}&rdquo;</p>
        <span className="hero-card-ref">— {testimony.name}</span>
      </a>
    );
  } else {
    const t = now ?? Date.now();
    const a = nextGathering(t, []);
    const b = nextGathering(t + a.msUntil + 4 * 60 * 60 * 1000, []);
    cardA = (
      <a href="#service" className="hero-card hero-card--a" style={{ ['--depth' as string]: 1.6 }}>
        <span className="hero-card-eyebrow">Coming up this week</span>
        <div className="hero-card-row"><strong>{a.label.replace(' WAT', '')}</strong><span>{a.name}</span></div>
        <div className="hero-card-row"><strong>{b.label.replace(' WAT', '')}</strong><span>{b.name}</span></div>
      </a>
    );
  }

  return (
    <>
      {cardA}
      {latestPost && (
        <a href={`/blog/${latestPost.slug}`} className="hero-card hero-card--b" style={{ ['--depth' as string]: 2.2 }}>
          <span className="hero-card-eyebrow">New on the blog</span>
          <p>&ldquo;{latestPost.title}&rdquo;</p>
          <span className="hero-card-ref">{latestPost.meta ? `${latestPost.meta} · ` : ''}Read now →</span>
        </a>
      )}
      <a href="#media" className="hero-card hero-card--c" style={{ ['--depth' as string]: 1.2 }}>
        <span className="hero-card-orbs" aria-hidden="true"><i /><i /><i /><i /></span>
        <span><strong>One family</strong><br />in every nation — join online</span>
      </a>
    </>
  );
}

/** Hero enrichment: a live next-gathering chip, floating glass info
 * cards (desktop), and a pointer-driven 3D tilt + spotlight. Mount
 * points live in the hero's raw HTML in app/page.tsx. */
export default function HeroExtras(props: Props) {
  const [targets, setTargets] = useState<{ chip: HTMLElement | null; cards: HTMLElement | null }>({
    chip: null,
    cards: null,
  });

  useEffect(() => {
    setTargets({
      chip: document.getElementById('hero-chip-mount'),
      cards: document.getElementById('hero-cards'),
    });

    const stage = document.querySelector<HTMLElement>('.hero-stage');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!stage || !finePointer || reduceMotion) return;

    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let px = 50;
    let py = 40;
    let raf = 0;

    function tick() {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      stage!.style.setProperty('--mx', x.toFixed(4));
      stage!.style.setProperty('--my', y.toFixed(4));
      stage!.style.setProperty('--px', `${px}%`);
      stage!.style.setProperty('--py', `${py}%`);
      if (Math.abs(tx - x) > 0.001 || Math.abs(ty - y) > 0.001) raf = requestAnimationFrame(tick);
      else raf = 0;
    }
    function onMove(e: PointerEvent) {
      const r = stage!.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width;
      const ny = (e.clientY - r.top) / r.height;
      tx = nx * 2 - 1;
      ty = ny * 2 - 1;
      px = nx * 100;
      py = ny * 100;
      if (!raf) raf = requestAnimationFrame(tick);
    }
    function onLeave() {
      tx = 0;
      ty = 0;
      if (!raf) raf = requestAnimationFrame(tick);
    }
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerleave', onLeave);
    stage.classList.add('hero-stage--interactive');
    return () => {
      cancelAnimationFrame(raf);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <>
      {targets.chip && createPortal(<NextGatheringChip events={props.events} />, targets.chip)}
      {targets.cards && createPortal(<HeroCards {...props} />, targets.cards)}
    </>
  );
}
