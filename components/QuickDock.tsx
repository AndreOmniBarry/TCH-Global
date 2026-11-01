'use client';

import { useEffect, useRef, useState } from 'react';

const I = {
  // Open book with a bookmark ribbon
  blog: <><path d="M12 6.5C10.2 5.2 7.6 4.5 4 4.5v13c3.6 0 6.2.7 8 2 1.8-1.3 4.4-2 8-2v-13c-3.6 0-6.2.7-8 2z" /><path d="M12 6.5v13" /><path d="M16 4.8v5l1.5-1 1.5 1V4.6" fill="currentColor" stroke="none" /></>,
  lib: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M10 9.5v5l4.5-2.5z" fill="currentColor" stroke="none" /></>,
  live: <><circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" /><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14" /></>,
  events: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /><circle cx="12" cy="15" r="1.6" fill="currentColor" stroke="none" /></>,
  // Praying hands
  pray: <><path d="M12 3c-1.4 1.6-2.6 4.3-2.6 7.6v3.9l-3 3a1.7 1.7 0 0 0 .1 2.5l.4.3H12z" fill="currentColor" fillOpacity=".18" /><path d="M12 3c1.4 1.6 2.6 4.3 2.6 7.6v3.9l3 3a1.7 1.7 0 0 1-.1 2.5l-.4.3H12z" fill="currentColor" fillOpacity=".18" /><path d="M12 3v17.3" /></>,
  // Gift box with ribbon
  give: <><rect x="3.5" y="9" width="17" height="11.5" rx="2" /><path d="M2.8 9h18.4v3.4H2.8zM12 9v11.5" /><path d="M12 9c-1.5-3.6-6-4.4-6-1.6C6 9 9.5 9 12 9zM12 9c1.5-3.6 6-4.4 6-1.6C18 9 14.5 9 12 9z" /></>,
};

const LINKS: { href: string; label: string; icon: keyof typeof I; match: (p: string, h: string) => boolean }[] = [
  { href: '/blog', label: 'Blog', icon: 'blog', match: (p) => p.startsWith('/blog') },
  { href: '/library', label: 'PUDLIB!', icon: 'lib', match: (p) => p.startsWith('/library') },
  { href: '/live', label: 'Live', icon: 'live', match: (p) => p.startsWith('/live') },
  { href: '/#events', label: 'Events', icon: 'events', match: (p, h) => p === '/' && h === '#events' },
  { href: '/#contact', label: 'Prayer', icon: 'pray', match: (p, h) => p === '/' && h === '#contact' },
  { href: '/#give', label: 'Give', icon: 'give', match: (p, h) => p === '/' && h === '#give' },
];

/** Always-within-reach shortcuts. Phones: a glass bar at the bottom that
 * tucks away while scrolling down and returns on scroll up. Desktop: a
 * slim rail on the right edge. Appears once you're past the hero. */
export default function QuickDock() {
  const [path, setPath] = useState('');
  const [hash, setHash] = useState('');
  const [shown, setShown] = useState(false);
  const [tucked, setTucked] = useState(false);
  const [far, setFar] = useState(false);
  const topRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setPath(location.pathname);
    const onHash = () => setHash(location.hash);
    onHash();
    window.addEventListener('hashchange', onHash);
    let lastY = window.scrollY;
    let acc = 0;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const y = window.scrollY;
        const dy = y - lastY;
        lastY = y;
        const home = location.pathname === '/';
        setShown(!home || y > window.innerHeight * 0.6);
        // Back to top: appears ~1.5 screens down; its ring shows how far
        // down the page you are.
        setFar(y > window.innerHeight * 1.5);
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        topRef.current?.style.setProperty('--p', Math.min(1, y / max).toFixed(3));
        acc = Math.sign(dy) === Math.sign(acc) ? acc + dy : dy;
        if (acc > 60) setTucked(true);
        else if (acc < -30 || y < 40) setTucked(false);
        // Highlight the homepage section in view.
        if (home) {
          const ids = ['give', 'contact', 'events'];
          const vh = window.innerHeight;
          const inView = ids.find((id) => { const r = document.getElementById(id)?.getBoundingClientRect(); return r && r.top < vh * 0.5 && r.bottom > vh * 0.3; });
          setHash(inView ? `#${inView}` : '');
        }
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('hashchange', onHash); };
  }, []);

  if (!path || /^\/(admin|studio|write|wrapped)/.test(path)) return null;
  const toTop = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    setTucked(false);
  };
  return (
    <>
    <button ref={topRef} type="button" data-fill="page" className={`totop liquid${far ? ' is-shown' : ''}${tucked ? ' is-tucked' : ''}`} onClick={toTop} aria-label="Back to top" tabIndex={far ? 0 : -1}>
      <svg className="totop-ring" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="21" pathLength="100" />
        <circle className="totop-fill" cx="24" cy="24" r="21" pathLength="100" />
      </svg>
      <svg className="totop-arrow" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5" /></svg>
    </button>
    <nav className={`qdock${shown ? ' is-shown' : ''}${tucked ? ' is-tucked' : ''}`} aria-label="Quick links">
      {LINKS.map((l) => {
        const on = l.match(path, hash);
        return (
          <a key={l.href} href={l.href} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{I[l.icon]}</svg>
            <span>{l.label}</span>
          </a>
        );
      })}
    </nav>
    </>
  );
}
