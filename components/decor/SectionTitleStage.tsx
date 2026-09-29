'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  MotionConfig,
  motion,
  motionValue,
  useSpring,
  useTransform,
  type MotionValue,
  type Variants,
} from 'framer-motion';

const PROBE = 0.55;
const SINK_BAND = 0.22;
const RIDGE_TILE = 1200;
const RIDGE_SPEEDS = [0.04, 0.09, 0.16];

const wordVariants: Variants = {
  initial: {},
  enter: { transition: { staggerChildren: 0.045, delayChildren: 0.08 } },
  exit: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
};

// Pop-up book: each letter starts lying flat (folded back along its
// base) below the ridge line and stands up on a spring; leaving, it
// folds back down and sinks into the ground.
const letterVariants: Variants = {
  initial: { y: '105%', rotateX: -88, opacity: 0, filter: 'blur(8px)' },
  enter: {
    y: '0%',
    rotateX: 0,
    opacity: 1,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 160, damping: 17, mass: 0.9 },
  },
  exit: {
    y: '115%',
    rotateX: 75,
    opacity: 0,
    filter: 'blur(6px)',
    transition: { duration: 0.6, ease: [0.55, 0, 0.8, 0.25] },
  },
};

function Word({ title, sink }: { title: string; sink: MotionValue<number> }) {
  const s = useSpring(sink, { stiffness: 140, damping: 26, mass: 0.7 });
  const y = useTransform(s, (v) => `${v * 44}%`);
  const rotateX = useTransform(s, (v) => v * 55);
  const scale = useTransform(s, (v) => 1 - v * 0.1);
  const opacity = useTransform(s, (v) => 1 - v * 0.35);
  const letters = Array.from(title.toUpperCase()).map((ch) => (ch === ' ' ? ' ' : ch));

  return (
    <motion.div
      className="st-word"
      style={{ y, rotateX, scale, opacity, ['--n' as string]: letters.length }}
      variants={wordVariants}
      initial="initial"
      animate="enter"
      exit="exit"
    >
      {letters.map((ch, i) => (
        <motion.span key={i} className="st-letter" data-l={ch} variants={letterVariants}>
          <span className="st-face">{ch}</span>
        </motion.span>
      ))}
    </motion.div>
  );
}

/** Mirage-style section title: a giant extruded word per section,
 * standing behind a layered mountain ridge fixed to the bottom of the
 * viewport. As a section scrolls away its word tilts back and sinks
 * into the ridge (scroll-scrubbed), and the next section's word
 * sprouts up letter by letter. Sections opt in with data-title. */
export default function SectionTitleStage() {
  const [title, setTitle] = useState<string | null>(null);
  const sinks = useRef(new Map<string, MotionValue<number>>());
  const stageRef = useRef<HTMLDivElement>(null);
  const ridgeRefs = useRef<(HTMLDivElement | null)[]>([]);

  function sinkFor(t: string) {
    let mv = sinks.current.get(t);
    if (!mv) {
      mv = motionValue(0);
      sinks.current.set(t, mv);
    }
    return mv;
  }

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-title]'));
    if (!sections.length) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let current: string | null = null;
    let raf = 0;

    function update() {
      raf = 0;
      const vh = window.innerHeight;
      const probe = vh * PROBE;
      let active: HTMLElement | null = null;
      for (const el of sections) {
        const r = el.getBoundingClientRect();
        if (r.top <= probe) active = el;
        else break;
      }
      if (!active) active = sections[0];
      const t = active.dataset.title || '';
      const bottom = active.getBoundingClientRect().bottom;
      const sink = Math.min(Math.max((probe + vh * SINK_BAND - bottom) / (vh * SINK_BAND), 0), 1);
      sinkFor(t).set(sink);
      if (t !== current) {
        current = t;
        setTitle(t);
      }

      if (!reduceMotion) {
        const sy = window.scrollY;
        ridgeRefs.current.forEach((el, i) => {
          if (!el) return;
          const shift = (sy * RIDGE_SPEEDS[i]) % RIDGE_TILE;
          el.style.transform = `translate3d(${-shift}px,0,0)`;
        });
      }
    }

    function schedule() {
      if (!raf) raf = requestAnimationFrame(update);
    }
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="st-stage" ref={stageRef} aria-hidden="true">
        <div className="st-ridge st-ridge--back" ref={(el) => { ridgeRefs.current[0] = el; }} />
        <div className="st-words">
          <AnimatePresence initial={false}>
            {title && <Word key={title} title={title} sink={sinkFor(title)} />}
          </AnimatePresence>
        </div>
        <div className="st-ridge st-ridge--mid" ref={(el) => { ridgeRefs.current[1] = el; }} />
        <div className="st-ridge st-ridge--front" ref={(el) => { ridgeRefs.current[2] = el; }} />
      </div>
    </MotionConfig>
  );
}
