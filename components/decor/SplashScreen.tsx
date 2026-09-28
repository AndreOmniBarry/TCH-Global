'use client';

import { useEffect, useState } from 'react';

const SESSION_KEY = 'tch_splash_seen';
const MIN_DURATION_MS = 1400;
const MAX_DURATION_MS = 3000;

/** A one-time, full-screen circular-progress splash on first load per
 * browser session — not shown again on internal navigation within the
 * same visit (sessionStorage-gated), so it never gets in a returning
 * visitor's way. Purely a visual overlay: the real page renders
 * underneath the whole time, this just covers it briefly. Respects
 * prefers-reduced-motion (skips straight through, no animation). */
export default function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let alreadySeen = false;
    try {
      alreadySeen = sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      // Storage blocked (private mode etc.) — just show it once per page load.
    }
    if (alreadySeen) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setVisible(true);

    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      // Ignore — worst case it shows again on the next page in this tab.
    }

    if (prefersReducedMotion) {
      setFading(true);
      const t = setTimeout(() => setVisible(false), 200);
      return () => clearTimeout(t);
    }

    const start = performance.now();
    let raf = 0;
    let settled = false;

    function tick(now: number) {
      const elapsed = now - start;
      const pct = Math.min(100, (elapsed / MIN_DURATION_MS) * 100);
      setProgress(pct);
      if (pct < 100 && elapsed < MAX_DURATION_MS) {
        raf = requestAnimationFrame(tick);
      } else if (!settled) {
        settled = true;
        setProgress(100);
        setFading(true);
        setTimeout(() => setVisible(false), 500);
      }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!visible) return null;

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-root)',
        opacity: fading ? 0 : 1,
        transition: 'opacity 480ms ease',
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      <div style={{ position: 'relative', width: 96, height: 96 }}>
        <svg width={96} height={96} viewBox="0 0 96 96" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="48" cy="48" r={radius} fill="none" stroke="var(--border-glass)" strokeWidth={3} />
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke="url(#splash-gradient)"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 60ms linear' }}
          />
          <defs>
            <linearGradient id="splash-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--accent-cyan)" />
              <stop offset="100%" stopColor="var(--accent-lavender)" />
            </linearGradient>
          </defs>
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo.jpg"
            alt=""
            width={52}
            height={52}
            style={{ borderRadius: '50%', objectFit: 'cover' }}
          />
        </div>
      </div>
      <div
        style={{
          marginTop: 18,
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '.12em',
          textTransform: 'uppercase',
          color: 'var(--text-faint)',
        }}
      >
        TCH Global
      </div>
    </div>
  );
}
