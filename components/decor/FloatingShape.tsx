'use client';

import { useEffect, useRef } from 'react';
import { track } from './scrollEngine';

type Props = {
  children: React.ReactNode;
  /** Position within the nearest positioned ancestor. */
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  /** How far the shape travels/scales as its section scrolls through —
   * higher = more dramatic depth-peel. 0.5-1.5 reads well; this is a
   * purely additive decorative layer, separate from the site's existing
   * .pop scroll-reveal system (main.js), which is untouched. */
  depth?: number;
  /** Rotation drift in degrees over the scroll range. */
  rotate?: number;
  zIndex?: number;
};

export default function FloatingShape({
  children,
  top,
  left,
  right,
  bottom,
  depth = 1,
  rotate = 0,
  zIndex = 0,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const section = (el.closest('section') || el.parentElement) as HTMLElement | null;
    if (!section) return;
    // Peel in from the backdrop as the section enters, drift through,
    // settle back as it leaves (section top at viewport bottom -> 0,
    // section bottom at viewport top -> 1).
    return track(
      el,
      () => {
        const r = section.getBoundingClientRect();
        const vh = window.innerHeight;
        return Math.min(Math.max((vh - r.top) / (vh + r.height), 0), 1);
      },
      (node, p) => {
        const y = 12 * depth * (1 - 2 * p);
        const s = 0.82 + 0.18 * Math.min(1, p * 2);
        const rot = -rotate + 2 * rotate * p;
        node.style.transform = `translate3d(0,${y.toFixed(2)}%,0) scale(${s.toFixed(3)}) rotate(${rot.toFixed(2)}deg)`;
        node.style.opacity = Math.min(1, p * 2.4).toFixed(3);
      },
      section
    );
  }, [depth, rotate]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'absolute',
        top,
        left,
        right,
        bottom,
        zIndex,
        pointerEvents: 'none',
      }}
    >
      {children}
    </div>
  );
}
