'use client';

import { useEffect, useRef } from 'react';
import { getVisitorId } from '@/lib/visitor-id';

function ping(body: object) {
  const json = JSON.stringify(body);
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track-view', new Blob([json], { type: 'application/json' }));
      return;
    }
  } catch {
    // fall through to fetch
  }
  fetch('/api/track-view', { method: 'POST', body: json, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
}

/** Fires once per page load to record a read, and once more if the
 * reader scrolls to (roughly) the end of the article — a lightweight
 * proxy for "actually read this," not just "the page loaded." */
export default function TrackView({ slug }: { slug: string }) {
  const firedComplete = useRef(false);

  useEffect(() => {
    ping({ slug, event: 'view', visitorId: getVisitorId() });

    function onScroll() {
      if (firedComplete.current) return;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 100;
      if (pct >= 85) {
        firedComplete.current = true;
        ping({ slug, event: 'read-complete' });
        window.removeEventListener('scroll', onScroll);
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [slug]);

  return null;
}
