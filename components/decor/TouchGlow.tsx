'use client';

import { useEffect } from 'react';

// Liquid Glass touch response (iOS 26 style). Press a control and it gently
// swells toward your finger, lit from the fingertip by a soft diffuse light;
// let go and it springs back. No outlines, nothing left behind:
// - a swipe that turns into a scroll never lights up (short hold-off, and
//   any movement or scroll cancels instantly);
// - the light is an overlay over the control that scales with it in step,
//   and is removed the moment the gesture ends.
const TARGETS = 'a, button, [role="button"], [role="tab"], [role="radio"], [role="switch"], input:not([type="hidden"]), textarea, select, summary, .bc, .value-card, .blog-card, .vm-card';
const DARK = '.band-dark, .bc, .td, .tn, .wr-phone, .wp-card, .jn, .hero-stage, .hero, .site-footer, .qdock';
const SPRING = 'cubic-bezier(.34, 1.56, .64, 1)';

function onDark(el: Element) {
  if (el.closest(DARK)) return true;
  for (let n: Element | null = el; n; n = n.parentElement) {
    const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(getComputedStyle(n).backgroundColor);
    if (m && (m[4] === undefined || Number(m[4]) > 0.5)) {
      const [r, g, b] = [m[1], m[2], m[3]].map(Number);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b < 110;
    }
  }
  return document.documentElement.dataset.theme === 'dark';
}

type Press = { el: HTMLElement; glow: HTMLDivElement | null; rect: DOMRect; x0: number; y0: number; id: number; timer: number; scale: number; anims: Animation[]; on: boolean };

export default function TouchGlow() {
  useEffect(() => {
    if (!('animate' in HTMLElement.prototype)) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let p: Press | null = null;

    const light = (x: number, y: number) => {
      if (!p?.glow) return;
      p.glow.style.setProperty('--gx', `${x - p.rect.left}px`);
      p.glow.style.setProperty('--gy', `${y - p.rect.top}px`);
    };

    const activate = () => {
      if (!p || p.on) return;
      p.on = true;
      const { el, rect } = p;
      const field = el.matches('input, textarea, select');
      const big = rect.width * rect.height > innerWidth * innerHeight * 0.18;
      p.scale = reduce || field ? 1 : big ? 1.012 : 1 + Math.min(0.06, 10 / Math.max(rect.width, rect.height));
      const g = document.createElement('div');
      g.className = `tglow ${onDark(el) ? 'on-dark' : 'on-light'}`;
      g.setAttribute('aria-hidden', 'true');
      g.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;border-radius:${getComputedStyle(el).borderRadius || '14px'}`;
      g.style.setProperty('--gs', `${Math.max(60, Math.min(160, Math.hypot(rect.width, rect.height) * 0.45))}px`);
      document.body.appendChild(g);
      p.glow = g;
      light(p.x0, p.y0);
      const grow = { duration: 260, easing: 'cubic-bezier(.2, .8, .2, 1)', fill: 'forwards' as const };
      p.anims = [g.animate([{ opacity: 0, scale: 1 }, { opacity: 1, scale: p.scale }], grow)];
      if (p.scale !== 1) p.anims.push(el.animate([{ scale: 1 }, { scale: p.scale }], { ...grow }));
    };

    // fast: the finger started scrolling, so vanish right away.
    const end = (fast: boolean) => {
      const cur = p;
      p = null;
      if (!cur) return;
      clearTimeout(cur.timer);
      if (!cur.on) return;
      const { el, glow, scale, anims } = cur;
      const back = { duration: fast ? 120 : 420, easing: fast ? 'ease-out' : SPRING, fill: 'forwards' as const };
      if (scale !== 1) {
        const a = el.animate([{ scale }, { scale: 1 }], { ...back });
        a.onfinish = () => { anims.forEach((x) => x.cancel()); a.cancel(); };
      } else anims.forEach((x) => x.cancel());
      if (glow) {
        const f = glow.animate([{ opacity: 1, scale }, { opacity: 0, scale: 1 }], { duration: fast ? 100 : 320, easing: 'ease-out', fill: 'forwards' });
        f.onfinish = () => glow.remove();
      }
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || !e.isPrimary) return;
      const t = (e.target as Element | null)?.closest?.(TARGETS) as HTMLElement | null;
      if (!t || t.closest('[data-noglow], #splash')) return;
      const rect = t.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8 || rect.width * rect.height > innerWidth * innerHeight * 0.6) return;
      end(true);
      p = { el: t, glow: null, rect, x0: e.clientX, y0: e.clientY, id: e.pointerId, timer: 0, scale: 1, anims: [], on: false };
      // Mouse/pen: light at once. Touch: wait a beat so swipes don't light up.
      if (e.pointerType === 'touch') p.timer = window.setTimeout(activate, 70); else activate();
    };

    const onMove = (e: PointerEvent) => {
      if (!p || e.pointerId !== p.id) return;
      const moved = Math.hypot(e.clientX - p.x0, e.clientY - p.y0);
      if (e.pointerType === 'touch' && moved > 10) { end(true); return; } // it's a scroll
      if (!p.el.contains(document.elementFromPoint(e.clientX, e.clientY))) { end(false); return; }
      light(e.clientX, e.clientY);
    };

    const onUp = (e: PointerEvent) => {
      if (!p || e.pointerId !== p.id) return;
      if (!p.on) { activate(); window.setTimeout(() => end(false), 90); return; } // quick tap: a brief pulse
      end(false);
    };
    const onCancel = () => end(true);
    const onScroll = () => { if (p) end(true); };

    document.addEventListener('pointerdown', onDown, { passive: true });
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('pointercancel', onCancel, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('blur', onCancel);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('blur', onCancel);
      end(true);
    };
  }, []);
  return null;
}
