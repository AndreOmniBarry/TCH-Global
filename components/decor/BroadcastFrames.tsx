'use client';

import { useEffect } from 'react';

const pad = (n: number) => String(n).padStart(2, '0');

/** Broadcast-monitor treatment for [data-broadcast] images: corner
 * brackets, REC/ON AIR tag, a running timecode, scanlines + vignette. */
export default function BroadcastFrames() {
  useEffect(() => {
    const frames = Array.from(document.querySelectorAll<HTMLElement>('[data-broadcast]'));
    if (!frames.length) return;
    const cleanups: (() => void)[] = [];
    const clocks: { el: HTMLElement; visible: boolean }[] = [];
    const t0 = performance.now();

    frames.forEach((frame) => {
      if (frame.classList.contains('bc-ready')) return;
      frame.classList.add('bc-ready');
      const overlay = document.createElement('div');
      overlay.className = 'bc-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.innerHTML =
        '<span class="bc-corner bc-corner--tl"></span><span class="bc-corner bc-corner--tr"></span>' +
        '<span class="bc-corner bc-corner--bl"></span><span class="bc-corner bc-corner--br"></span>' +
        `<span class="bc-tag"><i></i>${frame.dataset.broadcast}</span><span class="bc-tc">00:00:00:00</span>`;
      frame.appendChild(overlay);
      const clock = { el: overlay.querySelector<HTMLElement>('.bc-tc')!, visible: false };
      clocks.push(clock);
      const io = new IntersectionObserver(([e]) => { clock.visible = e.isIntersecting; });
      io.observe(frame);

      cleanups.push(() => {
        io.disconnect();
        overlay.remove();
        frame.classList.remove('bc-ready');
      });
    });

    // Timecode HH:MM:SS:FF at 25fps, only while a frame is on screen.
    let raf = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const t = (now - t0) / 1000;
      const text = `${pad(Math.floor(t / 3600))}:${pad(Math.floor(t / 60) % 60)}:${pad(Math.floor(t) % 60)}:${pad(Math.floor(t * 25) % 25)}`;
      for (const c of clocks) if (c.visible) c.el.textContent = text;
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      cleanups.forEach((f) => f());
    };
  }, []);

  return null;
}
