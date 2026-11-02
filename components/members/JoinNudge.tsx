'use client';

import { useEffect, useState } from 'react';

const SNOOZE_KEY = 'tch_join_snooze';
const VIEWS_KEY = 'tch_views';
const REASONS: Record<string, { title: string; body: string }> = {
  default: { title: 'Start your Year in the Word', body: 'Sign up free and everything you play, read and pray along with here becomes your own story, revealed each month and on 15 December.' },
  listen: { title: 'This message isn’t counting yet', body: 'You’re listening as a guest. Sign up free (it takes 20 seconds) and every minute from now goes into your own My Year in the Word.' },
  playlist: { title: 'Save messages with a free account', body: 'Build playlists and Watch later, pick up where you stopped on any device, and watch your Year in the Word grow.' },
  comment: { title: 'Join the conversation', body: 'Respond to messages, pray with others and share what God is doing.' },
};
const PERKS = ['Your own My Year in the Word, every month and on 15 December', 'Sign in once and you stay signed in', 'Resume any message on any device', 'Add your children: their stars count too'];

/** Invite to join: a bottom sheet that appears after real engagement
 * (20s on site, a second page, most of a post, or a minute of listening), snoozes for 3 days
 * when dismissed, never shows to members, and opens on demand when a
 * guest reaches for a members-only feature (window event 'tch:join'). */
export default function JoinNudge() {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('default');
  const [member, setMember] = useState<boolean | null>(null);

  useEffect(() => {
    if (/^\/(account|admin|studio|write)/.test(location.pathname)) return;
    let alive = true;
    fetch('/api/auth/me', { cache: 'no-store' }).then((r) => r.json()).then((d) => { if (alive) setMember(Boolean(d.member)); }).catch(() => setMember(false));
    const onAsk = (e: Event) => { setReason((e as CustomEvent).detail?.reason || 'default'); setOpen(true); };
    window.addEventListener('tch:join', onAsk);
    // A guest who keeps listening hears, once per visit, that it isn't counting.
    const onListen = () => {
      try { if (sessionStorage.getItem('tch_listen_nudged')) return; sessionStorage.setItem('tch_listen_nudged', '1'); } catch {}
      setReason('listen'); setOpen(true);
    };
    window.addEventListener('tch:listen', onListen);
    return () => { alive = false; window.removeEventListener('tch:join', onAsk); window.removeEventListener('tch:listen', onListen); };
  }, []);

  useEffect(() => {
    if (member !== false) return;
    let snoozed = false;
    let views = 0;
    try {
      snoozed = Date.now() < Number(localStorage.getItem(SNOOZE_KEY) || 0);
      views = Number(sessionStorage.getItem(VIEWS_KEY) || 0) + 1;
      sessionStorage.setItem(VIEWS_KEY, String(views));
    } catch {}
    if (snoozed) return;
    const show = () => { setReason('default'); setOpen(true); cleanup(); };
    const timer = window.setTimeout(show, views >= 2 ? 5000 : 20000);
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      if (location.pathname.startsWith('/blog/') && max > 0 && scrollY / max > 0.7) show();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    function cleanup() { window.clearTimeout(timer); window.removeEventListener('scroll', onScroll); }
    return cleanup;
  }, [member]);

  function dismiss() {
    setOpen(false);
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + 3 * 86400000)); } catch {}
  }

  if (!open || member) return null;
  const r = REASONS[reason] ?? REASONS.default;
  const next = encodeURIComponent(location.pathname + location.search);
  return (
    <div className="jn-wrap" role="dialog" aria-modal="false" aria-labelledby="jn-title">
      <div className="jn">
        <button type="button" className="jn-x" onClick={dismiss} aria-label="Not now">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <div className="jn-art" aria-hidden="true"><img src="/images/logo.jpg" alt="" /></div>
        <div className="jn-body">
          <h3 id="jn-title">{r.title}</h3>
          <p>{r.body}</p>
          <ul>{PERKS.map((p) => <li key={p}>{p}</li>)}</ul>
          <div className="jn-actions">
            <a className="jn-cta" href={`/account?mode=signup&next=${next}`}>Start my Year in the Word</a>
            <a className="jn-signin" href={`/account?next=${next}`}>I have an account</a>
          </div>
        </div>
      </div>
    </div>
  );
}
