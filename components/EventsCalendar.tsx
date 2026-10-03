'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DAY_MS, DAYS, MONTHS_LONG, type CalItem, fmtDate, fmtTime, googleCalUrl, icsFile, lagosParts, lagosToMs, weeklyBetween,
} from '@/lib/church-time';

export type EventInput = {
  _id: string; title: string; description: string | null; startsAt: string; endsAt: string | null;
  location: string | null; flyerImage: string | null; link: string | null;
};

function toItems(events: EventInput[]): CalItem[] {
  return events
    .map((e) => {
      const start = new Date(e.startsAt).getTime();
      const end = e.endsAt ? new Date(e.endsAt).getTime() : start + 3 * 3600_000;
      return { id: e._id, title: e.title, start, end, location: e.location, description: e.description, link: e.link, flyer: e.flyerImage, weekly: false };
    })
    .filter((e) => Number.isFinite(e.start));
}

const Chevron = ({ dir }: { dir: 'l' | 'r' }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === 'l' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
  </svg>
);
const CalIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4M12 13v5M9.5 15.5h5" />
  </svg>
);
const PinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" />
  </svg>
);

function AddToCalendar({ item }: { item: CalItem }) {
  const [open, setOpen] = useState(false);
  function download() {
    const blob = new Blob([icsFile(item)], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${item.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setOpen(false);
  }
  return (
    <div className="cal-add">
      <button type="button" className="cal-add-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <CalIcon /> Add to calendar
      </button>
      {open && (
        <div className="cal-add-menu" role="menu">
          <a role="menuitem" href={googleCalUrl(item)} target="_blank" rel="noopener" onClick={() => setOpen(false)}>Google Calendar</a>
          <button role="menuitem" type="button" onClick={download}>Apple / Outlook (.ics)</button>
        </div>
      )}
    </div>
  );
}

export default function EventsCalendar({ events }: { events: EventInput[] }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
  const today = lagosParts(now ?? Date.now());
  const [view, setView] = useState({ y: today.y, mo: today.mo });
  const [selected, setSelected] = useState<number | null>(null);
  useEffect(() => { if (now) { const t = lagosParts(now); setView({ y: t.y, mo: t.mo }); } }, [now]);

  const special = useMemo(() => toItems(events), [events]);

  // Month grid: weeks start on Sunday, padded to whole weeks.
  const first = lagosToMs(view.y, view.mo, 1);
  const gridStart = first - lagosParts(first).wd * DAY_MS;
  const nextMonth = view.mo === 11 ? lagosToMs(view.y + 1, 0, 1) : lagosToMs(view.y, view.mo + 1, 1);
  const weeks = Math.ceil((nextMonth - gridStart) / DAY_MS / 7);
  const gridEnd = gridStart + weeks * 7 * DAY_MS;
  const monthItems = useMemo(
    () => [...weeklyBetween(gridStart, gridEnd), ...special.filter((e) => e.end > gridStart && e.start < gridEnd)],
    [gridStart, gridEnd, special]
  );
  const itemsOn = (dayMs: number) => monthItems.filter((e) => e.start < dayMs + DAY_MS && e.end > dayMs).sort((a, b) => a.start - b.start);

  const todayMs = lagosToMs(today.y, today.mo, today.d);
  const t0 = now ?? Date.now();
  const upcomingSpecial = special.filter((e) => e.end > t0).sort((a, b) => a.start - b.start);
  const nextServices = weeklyBetween(t0, t0 + 7 * DAY_MS).filter((e) => e.end > t0).sort((a, b) => a.start - b.start).slice(0, 4);
  const dayList = selected !== null ? itemsOn(selected) : null;

  function shift(n: number) {
    setSelected(null);
    setView((v) => { const m = v.mo + n; return { y: v.y + Math.floor(m / 12), mo: ((m % 12) + 12) % 12 }; });
  }

  return (
    <div className="cal pop">
      <div className="cal-agenda">
        <h3 className="cal-h">{upcomingSpecial.length ? 'Special events' : 'This week'}</h3>
        {(upcomingSpecial.length ? upcomingSpecial.slice(0, 5) : nextServices).map((e) => {
          const p = lagosParts(e.start);
          const live = t0 >= e.start && t0 < e.end;
          return (
            <article className={`cal-event${e.weekly ? ' is-weekly' : ''}`} key={e.id}>
              <div className="cal-date"><span>{MONTHS_LONG[p.mo].slice(0, 3)}</span><b>{p.d}</b><span>{DAYS[p.wd]}</span></div>
              <div className="cal-event-body">
                {live && <span className="cal-live">Happening now</span>}
                <h4>{e.link ? <a href={e.link} target="_blank" rel="noopener">{e.title}</a> : e.title}</h4>
                <p className="cal-meta">
                  <span>{fmtTime(e.start)}{e.end - e.start < DAY_MS ? ` – ${fmtTime(e.end)}` : ` – ${fmtDate(e.end)}`} WAT</span>
                  {e.location && <span className="cal-loc"><PinIcon /> {e.location}</span>}
                </p>
                {e.description && <p className="cal-desc">{e.description}</p>}
                <AddToCalendar item={e} />
              </div>
              {e.flyer && <img className="cal-flyer" src={e.flyer} alt={`${e.title} flyer`} loading="lazy" />}
            </article>
          );
        })}
        {upcomingSpecial.length > 0 && (
          <p className="cal-weekly-note">Plus our weekly services: Sunday 7:30 &amp; 9:15 AM, Monday prayer 5:30 PM, Wednesday 5:30 PM.</p>
        )}
      </div>

      <div className="cal-month">
        <div className="cal-month-head">
          <button type="button" className="cal-nav" onClick={() => shift(-1)} aria-label="Previous month"><Chevron dir="l" /></button>
          <h3 className="cal-h" aria-live="polite">{MONTHS_LONG[view.mo]} {view.y}</h3>
          <button type="button" className="cal-nav" onClick={() => shift(1)} aria-label="Next month"><Chevron dir="r" /></button>
        </div>
        <div className="cal-grid" role="grid">
          {DAYS.map((d) => <div key={d} className="cal-dow" role="columnheader">{d.slice(0, 2)}</div>)}
          {Array.from({ length: weeks * 7 }, (_, i) => {
            const dayMs = gridStart + i * DAY_MS;
            const p = lagosParts(dayMs);
            const items = itemsOn(dayMs);
            const hasSpecial = items.some((e) => !e.weekly);
            const cls = ['cal-day', p.mo !== view.mo && 'out', dayMs === todayMs && 'today', selected === dayMs && 'sel', hasSpecial && 'special', dayMs < todayMs && 'past'].filter(Boolean).join(' ');
            return (
              <button type="button" key={dayMs} className={cls} onClick={() => setSelected(selected === dayMs ? null : dayMs)} aria-label={`${fmtDate(dayMs)}: ${items.length ? items.map((e) => e.title).join(', ') : 'nothing scheduled'}`}>
                <span className="cal-num">{p.d}</span>
                <span className="cal-dots">{items.slice(0, 3).map((e) => <i key={e.id} className={e.weekly ? '' : 'sp'} />)}</span>
                {hasSpecial && <span className="cal-chip">{items.find((e) => !e.weekly)!.title}</span>}
              </button>
            );
          })}
        </div>
        <div className="cal-legend"><span><i /> Weekly service</span><span><i className="sp" /> Special event</span></div>
        {dayList && (
          <div className="cal-day-list">
            <h4>{fmtDate(selected!)}</h4>
            {dayList.length ? dayList.map((e) => (
              <div className="cal-day-item" key={e.id}>
                <span className="cal-day-time">{fmtTime(e.start)}</span>
                <span className="cal-day-title">{e.title}</span>
                <AddToCalendar item={e} />
              </div>
            )) : <p className="cal-meta">Nothing scheduled this day.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
