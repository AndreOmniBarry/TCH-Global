'use client';
import { useEffect } from 'react';

/** Reloads once if the Lagos date in the browser is past the day the page
 * was built for (a tab left open overnight, or a cached copy). */
export default function DayGuard({ day }: { day: number }) {
  useEffect(() => {
    const today = () => { const d = new Date(Date.now() + 3600000); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };
    const check = () => {
      if (today() <= day) return;
      try { if (sessionStorage.getItem('tch_day_reload') === String(today())) return; sessionStorage.setItem('tch_day_reload', String(today())); } catch {}
      location.reload();
    };
    check();
    const onVis = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVis);
    const t = window.setInterval(check, 60000);
    return () => { document.removeEventListener('visibilitychange', onVis); window.clearInterval(t); };
  }, [day]);
  return null;
}
