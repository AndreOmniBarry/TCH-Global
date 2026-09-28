'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

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
  blur?: boolean;
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
  blur = true,
  zIndex = 0,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      // Show the shape at rest, fully visible, instead of leaving it
      // stuck at the animation's opacity:0 starting state forever.
      gsap.set(el, { opacity: 1, scale: 1, yPercent: 0, rotate: 0, filter: 'blur(0px)' });
      return;
    }

    const section = el.closest('section') || el.parentElement;
    if (!section) return;

    const ctx = gsap.context(() => {
      // Peel-in from a collapsed/background state as the section enters,
      // hold at full depth while it's in view, collapse back as it
      // exits — the "locks into the backdrop, then separates with
      // depth" effect from the design reference.
      gsap.fromTo(
        el,
        { yPercent: 12 * depth, scale: 0.82, opacity: 0, rotate: -rotate, filter: blur ? 'blur(6px)' : 'none' },
        {
          yPercent: -12 * depth,
          scale: 1,
          opacity: 1,
          rotate,
          filter: 'blur(0px)',
          ease: 'none',
          force3D: true,
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1,
          },
        }
      );
    }, el);

    return () => ctx.revert();
  }, [depth, rotate, blur]);

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
        willChange: 'transform, opacity',
      }}
    >
      {children}
    </div>
  );
}
