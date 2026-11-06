'use client';

import { useEffect } from 'react';

// iOS-style "glass light": pressing anything interactive blooms a soft,
// translucent glow under the finger, clipped to that control's own shape,
// that follows the finger while held and fades out on release. One overlay
// at a time, positioned over the pressed element, so it never touches the
// element's own styles or pseudo-elements.
const TARGETS = 'a, button, [role="button"], [role="tab"], [role="radio"], [role="switch"], input:not([type="hidden"]), textarea, select, summary, label, .bc, .value-card, .blog-card, .vm-card, .bank-card';

// Is the control sitting on a dark surface? Dark sections/cards by class,
// otherwise the first solid background colour up the tree.
const DARK = '.band-dark, .bc, .td, .tn, .wr-phone, .wp-card, .jn, .hero-stage, .hero, .site-footer';
function onDark(el: Element) {
  if (el.closest(DARK)) return true;
  for (let n: Element | null = el; n; n = n.parentElement) {
    const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(getComputedStyle(n).backgroundColor);
    if (m && (m[4] === undefined || Number(m[4]) > 0.5)) {
      const [r, g, b] = [m[1], m[2], m[3]].map(Number);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110;
    }
  }
  return document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
}

export default function TouchGlow() {
  useEffect(() => {
    let glow: HTMLDivElement | null = null;
    let host: Element | null = null;
    let rect: DOMRect | null = null;
    let pid = -1;

    const place = (x: number, y: number) => {
      if (!glow || !rect) return;
      glow.style.setProperty('--gx', `${x - rect.left}px`);
      glow.style.setProperty('--gy', `${y - rect.top}px`);
    };

    const release = () => {
      const g = glow;
      glow = null; host = null; rect = null; pid = -1;
      if (!g) return;
      g.classList.remove('is-on');
      g.classList.add('is-off');
      window.setTimeout(() => g.remove(), 520);
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || !e.isPrimary) return;
      const t = (e.target as Element | null)?.closest?.(TARGETS);
      if (!t || t.closest('[data-noglow], .studio, #splash')) return;
      const r = t.getBoundingClientRect();
      // Skip anything huge (whole sections) or invisible.
      if (r.width < 8 || r.height < 8 || r.width * r.height > innerWidth * innerHeight * 0.6) return;
      release();
      const cs = getComputedStyle(t);
      const g = document.createElement('div');
      g.className = `tglow ${onDark(t) ? 'on-dark' : 'on-light'}`;
      g.setAttribute('aria-hidden', 'true');
      g.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;border-radius:${cs.borderRadius || '12px'}`;
      g.style.setProperty('--gs', `${Math.max(70, Math.min(170, Math.hypot(r.width, r.height) * 0.45))}px`);
      document.body.appendChild(g);
      glow = g; host = t; rect = r; pid = e.pointerId;
      place(e.clientX, e.clientY);
      requestAnimationFrame(() => g.classList.add('is-on'));
    };

    const onMove = (e: PointerEvent) => {
      if (!glow || e.pointerId !== pid) return;
      // Re-read the box if the page scrolled under the finger.
      if (host) {
        const r = host.getBoundingClientRect();
        if (rect && (r.top !== rect.top || r.left !== rect.left)) {
          rect = r;
          glow.style.left = `${r.left}px`; glow.style.top = `${r.top}px`;
        }
      }
      place(e.clientX, e.clientY);
    };

    const onUp = (e: PointerEvent) => { if (e.pointerId === pid) release(); };

    document.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('pointercancel', onUp, { passive: true });
    window.addEventListener('scroll', () => { if (glow && pid >= 0 && host) { const r = host.getBoundingClientRect(); rect = r; glow.style.left = `${r.left}px`; glow.style.top = `${r.top}px`; } }, { passive: true });
    window.addEventListener('blur', release);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      window.removeEventListener('blur', release);
      release();
    };
  }, []);
  return null;
}
