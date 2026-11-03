'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GOOGLE_ID, gis } from './google';
import GoogleButton from './GoogleButton';

const KNOWN = 'tch_known';
const LINES: Record<string, string> = {
  expired: 'You were signed out on this device. Sign back in and everything keeps counting toward your Year in the Word.',
  play: 'You’re signed out, so this message isn’t counting toward your Year in the Word. Sign in and it will.',
  drop: 'You’re signed out, so today’s Daily Drop isn’t counting toward your Year in the Word.',
};
type Known = { name: string; email: string };

/** Keeps people signed in, and notices when they aren't. Re-checks the
 * session when the tab comes back and every 15 minutes; if someone who was
 * signed in on this device is now signed out, it first tries Google's
 * silent re-sign-in, then asks them back in place (no page change). Tracked
 * activity while signed out ('tch:needs-signin') asks right away: known
 * people get this prompt, new visitors the join invite. */
export default function SessionWatcher() {
  const [known, setKnown] = useState<Known | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [ask, setAsk] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  const lastAsk = useRef(0);
  const off = useRef(false);
  const signedRef = useRef<boolean | null>(null);

  const remember = (k: Known | null) => {
    setKnown(k);
    try { if (k) localStorage.setItem(KNOWN, JSON.stringify(k)); else localStorage.removeItem(KNOWN); } catch {}
  };

  const open = useCallback((reason: string, k: Known | null) => {
    if (off.current) return;
    if (reason !== 'expired') {
      if (Date.now() - lastAsk.current < 10 * 60000) return; // asks at most every 10 minutes
      lastAsk.current = Date.now();
    }
    if (!k) { window.dispatchEvent(new CustomEvent('tch:join', { detail: { reason } })); return; }
    setErr(''); setAsk(reason);
    if (GOOGLE_ID) gis().then((g) => g?.accounts.id.prompt()); // One Tap: often signs straight back in
  }, []);

  const check = useCallback(async () => {
    try {
      const d = await (await fetch('/api/auth/me', { cache: 'no-store' })).json();
      if (d.member) {
        signedRef.current = true;
        setSignedIn(true); setAsk('');
        remember({ name: String(d.member.name).split(' ')[0], email: d.member.email });
        return;
      }
      const was = signedRef.current;
      signedRef.current = false;
      setSignedIn(false);
      let k: Known | null = null;
      try { k = JSON.parse(localStorage.getItem(KNOWN) || 'null'); } catch {}
      setKnown(k);
      // Signed out but this device knows them: on first load, or the moment it changes.
      if (k && was !== false) {
        let dismissed = false;
        try { dismissed = sessionStorage.getItem('tch_watch_dismissed') === '1'; } catch {}
        if (!dismissed) open('expired', k);
      }
    } catch { /* offline: try again later */ }
  }, [open]);

  useEffect(() => {
    off.current = /^\/(account|admin|studio|write)/.test(location.pathname);
    check();
    const onVis = () => { if (document.visibilityState === 'visible') check(); };
    const t = window.setInterval(check, 15 * 60000);
    document.addEventListener('visibilitychange', onVis);
    const onNeed = (e: Event) => {
      if (signedRef.current) return;
      let k: Known | null = null;
      try { k = JSON.parse(localStorage.getItem(KNOWN) || 'null'); } catch {}
      open((e as CustomEvent).detail?.reason || 'play', k);
    };
    const onIn = (e: Event) => {
      const m = (e as CustomEvent).detail;
      signedRef.current = true;
      setSignedIn(true); setAsk(''); setErr('');
      if (m?.email) remember({ name: String(m.name).split(' ')[0], email: m.email });
      setToast('Signed in. Everything counts toward your Year in the Word again.');
      window.setTimeout(() => setToast(''), 3500);
    };
    const onErr = (e: Event) => setErr(String((e as CustomEvent).detail || ''));
    const onOut = () => { remember(null); signedRef.current = false; setSignedIn(false); };
    window.addEventListener('tch:needs-signin', onNeed);
    window.addEventListener('tch:signedin', onIn);
    window.addEventListener('tch:signin-error', onErr);
    window.addEventListener('tch:signedout', onOut);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('tch:needs-signin', onNeed);
      window.removeEventListener('tch:signedin', onIn);
      window.removeEventListener('tch:signin-error', onErr);
      window.removeEventListener('tch:signedout', onOut);
    };
  }, [check, open]);


  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!known) return;
    setErr(''); setBusy(true);
    const password = String(new FormData(e.currentTarget).get('password') || '');
    try {
      const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: known.email, password }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setErr(d.error || 'That didn’t work. Try again.');
      window.dispatchEvent(new CustomEvent('tch:signedin', { detail: d.member }));
    } catch {
      setErr('We couldn’t reach the server. Check your connection.');
    } finally { setBusy(false); }
  }

  function dismiss() {
    setAsk('');
    try { sessionStorage.setItem('tch_watch_dismissed', '1'); } catch {}
  }

  return (
    <>
      {toast && <div className="sw-toast" role="status">{toast}</div>}
      {ask && known && !signedIn && (
        <div className="sw" role="dialog" aria-labelledby="sw-title">
          <button type="button" className="sw-x" onClick={dismiss} aria-label="Not now">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          <div className="sw-head">
            <i aria-hidden="true">{known.name.slice(0, 1).toUpperCase()}</i>
            <div><h3 id="sw-title">Welcome back, {known.name}</h3><p>{LINES[ask] ?? LINES.play}</p></div>
          </div>
          <GoogleButton text="signin_with" />
          <form className="sw-form" onSubmit={signIn}>
            <input type="email" value={known.email} readOnly aria-label="Email" autoComplete="username" />
            <input name="password" type="password" placeholder="Password" aria-label="Password" autoComplete="current-password" required autoFocus={!GOOGLE_ID} />
            {err && <p className="form-status" data-kind="error" role="alert">{err}</p>}
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          </form>
          <div className="sw-links">
            <a href="/account?forgot=1">Forgot password?</a>
            <button type="button" onClick={() => { remember(null); setAsk(''); }}>Not {known.name}?</button>
          </div>
        </div>
      )}
    </>
  );
}
