'use client';

import { useEffect } from 'react';
import { track } from './scrollEngine';

/** Drifts the .blob-field a few degrees clockwise across the page's full
 * scroll range and back on the way up — ambient, never a visible spin. */
export default function RotatingBackdrop() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const field = document.querySelector<HTMLElement>('.blob-field');
    if (!field) return;
    return track(
      field,
      () => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        return max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
      },
      (node, p) => {
        node.style.transform = `rotate(${(14 * p).toFixed(2)}deg)`;
      },
      document.body
    );
  }, []);

  return null;
}
