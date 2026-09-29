'use client';

import { useEffect } from 'react';

const ZOOM = 2.6;
const pad = (n: number) => String(n).padStart(2, '0');

/** Broadcast-monitor treatment for [data-broadcast] images: corner
 * brackets, REC/ON AIR tag, a running timecode, scanlines + vignette,
 * and a loupe that magnifies the detail under the cursor (or under a
 * finger after a short press on touch). */
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
      const loupe = document.createElement('div');
      loupe.className = 'bc-loupe';
      loupe.setAttribute('aria-hidden', 'true');
      frame.appendChild(loupe);
      const clock = { el: overlay.querySelector<HTMLElement>('.bc-tc')!, visible: false };
      clocks.push(clock);
      const io = new IntersectionObserver(([e]) => { clock.visible = e.isIntersecting; });
      io.observe(frame);

      function currentImg(): HTMLImageElement | null {
        const imgs = Array.from(frame.querySelectorAll<HTMLImageElement>('img'));
        let best: HTMLImageElement | null = null;
        let bestOp = -1;
        for (const im of imgs) {
          const op = parseFloat(getComputedStyle(im).opacity);
          if (op > bestOp) { bestOp = op; best = im; }
        }
        return best;
      }

      let active = false;
      function place(clientX: number, clientY: number) {
        const img = currentImg();
        if (!img) return;
        const fr = frame.getBoundingClientRect();
        const ir = img.getBoundingClientRect();
        const x = clientX - fr.left;
        const y = clientY - fr.top;
        loupe.style.left = `${x}px`;
        loupe.style.top = `${y}px`;
        // Map the pointer into the rendered (object-fit: cover, possibly
        // scaled) image and magnify around that point.
        const nw = img.naturalWidth || ir.width;
        const nh = img.naturalHeight || ir.height;
        const cover = Math.max(ir.width / nw, ir.height / nh);
        const dw = nw * cover * ZOOM;
        const dh = nh * cover * ZOOM;
        const ox = (ir.width - nw * cover) / 2;
        const oy = (ir.height - nh * cover) / 2;
        const px = (clientX - ir.left - ox) * ZOOM;
        const py = (clientY - ir.top - oy) * ZOOM;
        loupe.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
        loupe.style.backgroundSize = `${dw}px ${dh}px`;
        loupe.style.backgroundPosition = `${75 - px}px ${75 - py}px`;
      }
      function show(on: boolean) {
        active = on;
        loupe.classList.toggle('on', on);
      }

      const onMove = (e: PointerEvent) => {
        if (e.pointerType === 'mouse') { if (!active) show(true); place(e.clientX, e.clientY); }
      };
      const onLeave = () => show(false);
      let holdTimer = 0;
      const onTouchStart = (e: TouchEvent) => {
        const t = e.touches[0];
        holdTimer = window.setTimeout(() => { show(true); place(t.clientX, t.clientY); }, 260);
      };
      const onTouchMove = (e: TouchEvent) => {
        if (!active) { window.clearTimeout(holdTimer); return; }
        e.preventDefault();
        place(e.touches[0].clientX, e.touches[0].clientY);
      };
      const onTouchEnd = (e: TouchEvent) => {
        window.clearTimeout(holdTimer);
        if (active) { e.preventDefault(); show(false); }
      };
      frame.addEventListener('pointermove', onMove);
      frame.addEventListener('pointerleave', onLeave);
      frame.addEventListener('touchstart', onTouchStart, { passive: true });
      frame.addEventListener('touchmove', onTouchMove, { passive: false });
      frame.addEventListener('touchend', onTouchEnd);
      frame.addEventListener('touchcancel', onTouchEnd);
      frame.addEventListener('contextmenu', (e) => { if (active) e.preventDefault(); });
      cleanups.push(() => {
        io.disconnect();
        frame.removeEventListener('pointermove', onMove);
        frame.removeEventListener('pointerleave', onLeave);
        frame.removeEventListener('touchstart', onTouchStart);
        frame.removeEventListener('touchmove', onTouchMove);
        frame.removeEventListener('touchend', onTouchEnd);
        frame.removeEventListener('touchcancel', onTouchEnd);
        overlay.remove();
        loupe.remove();
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
