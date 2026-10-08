'use client';

import { useEffect, useRef, useState } from 'react';

const RIDGE_TILE = 1200;
const RIDGE_SPEEDS = [0.04, 0.09, 0.16];

type Item = { title: string; letters: string[] };

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOutBack = (t: number) => {
  const c = 1.45;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};
const easeInCubic = (t: number) => t * t * t;

/** Mirage-style section titles, fully scroll-scrubbed: each section's
 * word rises letter by letter out of the ridge as the section arrives
 * and sinks back into it as the section leaves. Every letter's pose is
 * a pure function of a smoothed scroll position, so scrolling back
 * replays the exact reverse — there is no discrete "switch" to get
 * confused mid-way. Sections opt in with data-title. */
export default function SectionTitleStage() {
  const [items, setItems] = useState<Item[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);
  const ridgeRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-title]'));
    setItems(
      sections.map((el) => {
        const title = el.dataset.title || '';
        return { title, letters: Array.from(title.toUpperCase()).map((c) => (c === ' ' ? ' ' : c)) };
      })
    );
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !items.length) return;
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-title]'));
    const words = Array.from(stage.querySelectorAll<HTMLElement>('.st-word'));
    const letters = words.map((w) => Array.from(w.querySelectorAll<HTMLElement>('.st-letter')));
    const hero = document.querySelector<HTMLElement>('.hero-stage');
    const footer = document.querySelector<HTMLElement>('.site-footer');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let tops: number[] = [];
    let bottoms: number[] = [];
    let heroBottom = 0;
    let footerTop = Infinity;
    function measure() {
      const sy = window.scrollY;
      tops = sections.map((s) => s.getBoundingClientRect().top + sy);
      bottoms = sections.map((s) => s.getBoundingClientRect().bottom + sy);
      heroBottom = hero ? hero.getBoundingClientRect().bottom + sy : 0;
      footerTop = footer ? footer.getBoundingClientRect().top + sy : Infinity;
    }
    measure();

    const lastPose: string[][] = letters.map((ls) => ls.map(() => ''));
    const lastVis: boolean[] = words.map(() => false);
    let lastStageShift = '';
    let smooth = window.scrollY;
    let raf = 0;
    let last = performance.now();

    let vel = 0;
    let clock = 0;
    function render(y: number) {
      const vh = window.innerHeight;
      const probe = vh * 0.62;
      const band = vh * 0.28;

      // Stage stays tucked below the fold while the hero fills the
      // screen, and slides away as the footer arrives.
      const heroHide = clamp01((heroBottom - y - vh * 0.62) / (vh * 0.2));
      const footHide = clamp01((y + vh - footerTop + vh * 0.22) / (vh * 0.22));
      const hide = Math.max(heroHide, footHide);
      const shift = `translate3d(0,${(hide * 105).toFixed(2)}%,0)`;
      if (shift !== lastStageShift) {
        stage!.style.transform = shift;
        lastStageShift = shift;
      }

      for (let i = 0; i < words.length; i++) {
        const top = tops[i] - y;
        const bottom = bottoms[i] - y;
        const rise = clamp01((probe - top) / band);
        const sink = clamp01((probe + band - bottom) / band);
        const vis = rise > 0 && sink < 1;
        if (vis !== lastVis[i]) {
          words[i].style.visibility = vis ? 'visible' : 'hidden';
          lastVis[i] = vis;
        }
        if (!vis) continue;

        // The word leans into fast scrolling and springs back upright.
        const lean = Math.max(-9, Math.min(9, -vel * 0.06));
        words[i].style.transform = `skewX(${lean.toFixed(2)}deg)`;
        const ls = letters[i];
        const n = ls.length;
        const stagger = Math.min(0.07, 0.45 / n);
        const span = 1 - stagger * (n - 1);
        for (let j = 0; j < n; j++) {
          let ty: number;
          let rx: number;
          let op: number;
          if (sink > 0) {
            // Leaving: letters fold back and sink, last letter first.
            const e = easeInCubic(clamp01((sink - stagger * (n - 1 - j)) / span));
            ty = e * 112;
            rx = e * 72;
            op = 1 - e * e;
          } else {
            // Arriving: letters stand up from flat, first letter first,
            // with a small spring overshoot (pop-up book).
            const t = clamp01((rise - stagger * j) / span);
            const e = easeOutBack(t);
            // Once risen, letters float: a slow bob and sway, each on its
            // own phase, like buoys on water.
            const settle = reduce ? 0 : t * t;
            ty = (1 - e) * 108 + settle * Math.sin(clock * 1.7 + j * 0.75) * 2.6;
            rx = (1 - e) * -86 + settle * Math.sin(clock * 1.3 + j * 0.9) * 5;
            op = Math.min(1, t * 2.5);
          }
          const pose = `translate3d(0,${ty.toFixed(2)}%,0) rotateX(${rx.toFixed(2)}deg)|${op.toFixed(3)}`;
          if (pose !== lastPose[i][j]) {
            lastPose[i][j] = pose;
            const [tf, o] = pose.split('|');
            ls[j].style.transform = tf;
            ls[j].style.opacity = o;
          }
        }
      }

      if (!reduce) {
        ridgeRefs.current.forEach((el, k) => {
          if (el) el.style.transform = `translate3d(${-((y * RIDGE_SPEEDS[k]) % RIDGE_TILE).toFixed(1)}px,0,0)`;
        });
      }
    }

    function frame(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const target = window.scrollY;
      const prev = smooth;
      smooth = reduce ? target : smooth + (target - smooth) * (1 - Math.exp(-dt * 9));
      if (Math.abs(target - smooth) < 0.3) smooth = target;
      vel += ((dt > 0 ? (smooth - prev) / dt / 60 : 0) - vel) * 0.25;
      clock += dt;
      render(smooth);
      // Keep animating while a word is on screen (for the float) or moving.
      const anyVisible = lastVis.some(Boolean) && lastStageShift !== 'translate3d(0,105.00%,0)';
      raf = smooth !== target || Math.abs(vel) > 0.05 || (anyVisible && !reduce && !document.hidden) ? requestAnimationFrame(frame) : 0;
    }
    function kick() {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    }
    function onResize() {
      measure();
      kick();
    }

    render(smooth);
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('load', onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(document.body);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', kick);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('load', onResize);
      ro.disconnect();
    };
  }, [items]);

  return (
    <div className="st-stage" ref={stageRef} aria-hidden="true">
      <div className="st-veil" />
      <div className="st-ridge st-ridge--back" ref={(el) => { ridgeRefs.current[0] = el; }} />
      <div className="st-words">
        {items.map((it, i) => (
          <div key={i} className="st-word" style={{ ['--n' as string]: it.letters.length, visibility: 'hidden' }}>
            {it.letters.map((ch, j) => (
              <span key={j} className="st-letter" data-l={ch} style={{ opacity: 0 }}>
                <span className="st-face">{ch}</span>
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="st-ridge st-ridge--mid" ref={(el) => { ridgeRefs.current[1] = el; }} />
      <div className="st-ridge st-ridge--front" ref={(el) => { ridgeRefs.current[2] = el; }} />
    </div>
  );
}
