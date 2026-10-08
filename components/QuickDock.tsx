'use client';

import { useEffect, useState } from 'react';

const I = {
  blog: <path d="M5 4h10l4 4v12H5zM15 4v4h4M8 12h8M8 16h6" />,
  lib: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M10 9.5v5l4.5-2.5z" fill="currentColor" stroke="none" /></>,
  live: <><circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" /><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14" /></>,
  events: <><rect x="3.5" y="5" width="17" height="15.5" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  pray: <path d="M12 21c-3-2-6-5-6-9V6l3-3 3 4 3-4 3 3v6c0 4-3 7-6 9z" />,
  give: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
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

  if (!path || /^\/(admin|studio|write)/.test(path)) return null;
  return (
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
  );
}
