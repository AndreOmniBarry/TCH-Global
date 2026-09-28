'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/** Rotates the whole .blob-field 360deg across the full scroll range of
 * the page, tied directly to scroll position (scrub) rather than time —
 * scrolling down sweeps it clockwise, scrolling back up naturally
 * reverses it counter-clockwise back to the exact same orientation,
 * since it's just reading scroll position, not playing a one-way
 * animation. Spread across the whole page it reads as a slow, barely
 * perceptible drift rather than a visible spin. */
export default function RotatingBackdrop() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const field = document.querySelector<HTMLElement>('.blob-field');
    if (!field) return;

    const ctx = gsap.context(() => {
      gsap.to(field, {
        rotation: 360,
        ease: 'none',
        transformOrigin: '50% 50%',
        force3D: true,
        scrollTrigger: {
          trigger: document.documentElement,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1.2,
        },
      });
    });

    return () => ctx.revert();
  }, []);

  return null;
}
