'use client';

import { useLayoutEffect, useRef } from 'react';

/** Gliding selection pill for a segmented switch (Chat | Cowork style).
 * Put the returned ref on the switch container and render
 * <span className="seg-pill" /> as its first child; the active button
 * must carry aria-selected="true" or aria-checked="true". */
export function useSlidingPill<T extends HTMLElement>(activeKey: unknown) {
  const ref = useRef<T>(null);
  const first = useRef(true);
  useLayoutEffect(() => {
    const g = ref.current;
    if (!g) return;
    const place = (instant: boolean) => {
      const pill = g.querySelector<HTMLElement>(':scope > .seg-pill');
      const on = g.querySelector<HTMLElement>('[aria-selected="true"], [aria-checked="true"]');
      if (!pill) return;
      if (!on) { pill.style.opacity = '0'; return; }
      if (instant) pill.style.transition = 'none';
      pill.style.opacity = '1';
      pill.style.width = `${on.offsetWidth}px`;
      pill.style.height = `${on.offsetHeight}px`;
      pill.style.transform = `translate(${on.offsetLeft}px, ${on.offsetTop}px)`;
      if (instant) { void pill.offsetWidth; pill.style.transition = ''; }
      if (!instant) { pill.classList.remove('swoosh'); void pill.offsetWidth; pill.classList.add('swoosh'); }
      if (!instant) on.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    };
    place(first.current);
    first.current = false;
    const ro = new ResizeObserver(() => place(true));
    ro.observe(g);
    return () => ro.disconnect();
  }, [activeKey]);
  return ref;
}
