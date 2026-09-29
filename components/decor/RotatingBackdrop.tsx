'use client';

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/** Drifts the whole .blob-field a few degrees across the full scroll
 * range of the page, tied directly to scroll position (scrub) rather
 * than time — scrolling down drifts it clockwise, scrolling back up
 * naturally reverses it counter-clockwise back to the exact same
 * orientation, since it's just reading scroll position, not playing a
 * one-way animation. The sweep itself is small (not a full spin) so the
 * motion reads as ambient drift, never as a rotating object. */
export default function RotatingBackdrop() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const field = document.querySelector<HTMLElement>('.blob-field');
    if (!field) return;

    const ctx = gsap.context(() => {
      gsap.to(field, {
        rotation: 14,
        ease: 'none',
        transformOrigin: '50% 50%',
        force3D: true,
        scrollTrigger: {
          trigger: document.documentElement,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 2.5,
        },
      });
    });

    return () => ctx.revert();
  }, []);

  return null;
}
