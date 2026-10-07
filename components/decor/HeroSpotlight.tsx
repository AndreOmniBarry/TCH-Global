'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Spotlight } from '@/lib/sanity';

const DURATION = 6500;

const img = (url: string, w: number) => (url.startsWith("/") ? url : `${url}?w=${w}&h=${Math.round(w * 0.75)}&fit=crop&auto=format&q=72`);

function when(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' }) +
    ' · ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' });
}

/** Rotating hero spotlight fed from /admin/spotlight. Story-style progress
 * bars, crossfade + wipe between items, swipe on phones, pauses on hover,
 * when off-screen and when the tab is hidden. Only the first image loads
 * eagerly; the next one is warmed just before it's needed. */
function Slides({ items }: { items: Spotlight[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement | null>(null);
  const elapsed = useRef(0);
  const swipe = useRef<number | null>(null);
  const n = items.length;

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    const vis = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', vis);
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', vis); };
  }, []);

  useEffect(() => {
    if (n < 2) return;
    let raf = 0;
    let last = performance.now();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (!paused && visible) elapsed.current += dt;
      const p = Math.min(1, elapsed.current / DURATION);
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
      if (p >= 1) { elapsed.current = 0; setI((x) => (x + 1) % n); return; }
      raf = requestAnimationFrame(tick);
    };
    if (!reduce) raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [i, paused, visible, n]);

  useEffect(() => {
    // Warm the next image so the switch never shows a blank frame.
    const next = items[(i + 1) % n];
    if (next?.image) { const im = new Image(); im.src = img(next.image, 900); }
  }, [i, items, n]);

  function go(k: number) { elapsed.current = 0; setI(((k % n) + n) % n); }

  return (
    <div
      ref={rootRef}
      className="hs"
      role="region"
      aria-roledescription="carousel"
      aria-label="What's coming up"
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setPaused(true); }}
      onPointerLeave={() => setPaused(false)}
      onPointerDown={(e) => { swipe.current = e.clientX; }}
      onPointerUp={(e) => {
        if (swipe.current === null) return;
        const dx = e.clientX - swipe.current;
        swipe.current = null;
        if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
      }}
    >
      {n > 1 && (
        <div className="hs-bars" aria-hidden="true">
          {items.map((it, k) => (
            <span key={it._id} className={k < i ? 'done' : ''}>
              <i ref={k === i ? (el) => { barRef.current = el; } : undefined} style={k === i ? undefined : { transform: `scaleX(${k < i ? 1 : 0})` }} />
            </span>
          ))}
        </div>
      )}
      <div className="hs-track">
        {items.map((it, k) => {
          const on = k === i;
          const Tag = it.link ? 'a' : 'div';
          return (
            <Tag
              key={it._id}
              className={`hs-slide${on ? ' on' : ''}`}
              aria-hidden={!on}
              tabIndex={on ? undefined : -1}
              {...(it.link ? { href: it.link, ...(/^https?:/.test(it.link) ? { target: '_blank', rel: 'noopener' } : {}) } : {})}
            >
              {it.image && (
                <span className="hs-media" style={it.lqip ? { backgroundImage: `url(${it.lqip})` } : undefined}>
                  <img
                    src={img(it.image, 900)}
                    srcSet={`${img(it.image, 480)} 480w, ${img(it.image, 900)} 900w`}
                    sizes="(max-width: 700px) 92vw, 440px"
                    alt=""
                    loading={k === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    {...(k === 0 ? { fetchPriority: 'high' as const } : {})}
                  />
                </span>
              )}
              <span className="hs-body">
                <span className="hs-kind">{it.kind || 'Spotlight'}</span>
                <strong className="hs-title">{it.title}</strong>
                {it.subtitle && <span className="hs-sub">{it.subtitle}</span>}
                {it.eventDate && <span className="hs-date">{when(it.eventDate)} WAT</span>}
                {it.link && <span className="hs-cta">{it.linkLabel || 'Find out more'} <span aria-hidden="true">&rarr;</span></span>}
              </span>
            </Tag>
          );
        })}
      </div>
      {n > 1 && (
        <div className="hs-nav">
          <button type="button" onClick={() => go(i - 1)} aria-label="Previous"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg></button>
          <span className="hs-count">{i + 1} / {n}</span>
          <button type="button" onClick={() => go(i + 1)} aria-label="Next"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg></button>
        </div>
      )}
    </div>
  );
}

export default function HeroSpotlight({ items }: { items: Spotlight[] }) {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  useEffect(() => { setMount(document.getElementById('hero-spotlight-mount')); }, []);
  if (!items.length || !mount) return null;
  return createPortal(<Slides items={items} />, mount);
}
