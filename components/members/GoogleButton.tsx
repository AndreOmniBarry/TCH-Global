'use client';

import { useEffect, useRef } from 'react';
import { GOOGLE_ID, gis } from './google';

/** Google's own "Continue with Google" button (renders nothing until a
 * Google Client ID is configured). */
export default function GoogleButton({ text = 'continue_with' }: { text?: 'continue_with' | 'signin_with' | 'signup_with' }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true;
    gis().then((g) => {
      const el = ref.current;
      if (!g || !el || !alive) return;
      el.innerHTML = '';
      g.accounts.id.renderButton(el, { theme: 'outline', size: 'large', shape: 'pill', text, logo_alignment: 'left', width: Math.min(400, Math.max(240, el.clientWidth || 320)) });
    });
    return () => { alive = false; };
  }, [text]);
  if (!GOOGLE_ID) return null;
  return (
    <div className="gbtn">
      <div ref={ref} className="gbtn-slot" />
      <span className="gbtn-or"><i />or<i /></span>
    </div>
  );
}
