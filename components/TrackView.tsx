'use client';

import { useEffect } from 'react';

/** Fires once per page load to record a read. Uses sendBeacon where
 * available so the ping survives the reader navigating away before a
 * normal fetch would finish. */
export default function TrackView({ slug }: { slug: string }) {
  useEffect(() => {
    const body = JSON.stringify({ slug });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/track-view', new Blob([body], { type: 'application/json' }));
        return;
      }
    } catch {
      // fall through to fetch
    }
    fetch('/api/track-view', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
  }, [slug]);

  return null;
}
