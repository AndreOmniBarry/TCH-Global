'use client';

import { useEffect, useState } from 'react';

const SNOOZE_KEY = 'tch_join_snooze';
const VIEWS_KEY = 'tch_views';
const REASONS: Record<string, { title: string; body: string }> = {
  default: { title: 'Join the TCH Global family', body: 'A free account keeps you connected between Sundays.' },
  playlist: { title: 'Save messages with a free account', body: 'Build playlists and Watch later, and pick up where you stopped on any device.' },
  comment: { title: 'Join the conversation', body: 'Respond to messages, pray with others and share what God is doing.' },
};
const PERKS = ['Save messages and build playlists', 'Resume on any phone or computer', 'Respond and pray on the blog', 'New messages in your inbox'];

/** Invite to join: a bottom sheet that appears after real engagement
 * (40s on site, a second page, or most of a post), snoozes for 5 days
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
    return () => { alive = false; window.removeEventListener('tch:join', onAsk); };
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
    const timer = window.setTimeout(show, views >= 2 ? 6000 : 40000);
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
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + 5 * 86400000)); } catch {}
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
            <a className="jn-cta" href={`/account?mode=signup&next=${next}`}>Create free account</a>
            <a className="jn-signin" href={`/account?next=${next}`}>I have an account</a>
          </div>
        </div>
      </div>
    </div>
  );
}
