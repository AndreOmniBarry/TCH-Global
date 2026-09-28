'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/** Portals decorative shape children into a mount-point div that lives
 * inside a raw HTML string elsewhere on the page (see app/page.tsx's
 * HOME_HTML_* template literals) — the same bridging technique used for
 * the video lightbox, needed because those sections aren't real React
 * components yet. */
export default function ShapeLayer({ targetId, children }: { targetId: string; children: React.ReactNode }) {
  const [mount, setMount] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setMount(document.getElementById(targetId));
  }, [targetId]);

  if (!mount) return null;
  return createPortal(children, mount);
}
