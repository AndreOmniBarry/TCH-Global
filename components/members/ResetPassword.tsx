'use client';

import { useState } from 'react';

export default function ResetPassword({ token, valid }: { token: string; valid: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [show, setShow] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr('');
    const f = new FormData(e.currentTarget);
    const password = String(f.get('password') || '');
    if (password.length < 8) return setErr('Use at least 8 characters.');
    if (password !== String(f.get('confirm') || '')) return setErr('The two passwords don’t match.');
    setBusy(true);
    try {
      const r = await fetch('/api/auth/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setErr(d.error || 'Something went wrong. Please try again.');
      setDone(true);
      window.setTimeout(() => { location.href = '/account'; }, 1600);
    } catch {
      setErr('We couldn’t reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="account-card account-reset">
      <span className="eyebrow">Your account</span>
      {!valid ? (
        <>
          <h2>This link has expired</h2>
          <p className="account-muted">Reset links work once and last an hour. Request a fresh one and use the newest email.</p>
          <a className="btn btn-primary" href="/account?forgot=1" style={{ width: '100%', marginTop: 14 }}>Send a new link</a>
        </>
      ) : done ? (
        <>
          <h2>Password updated</h2>
          <p className="account-muted" role="status">You&rsquo;re signed in. Taking you to your account&hellip;</p>
        </>
      ) : (
        <>
          <h2>Choose a new password</h2>
          <p className="account-muted">At least 8 characters. You&rsquo;ll be signed in straight after, and signed out on any other device.</p>
          <form className="account-form" onSubmit={submit}>
            <label htmlFor="rp-pw">New password</label>
            <input id="rp-pw" name="password" type={show ? 'text' : 'password'} autoComplete="new-password" required minLength={8} autoFocus />
            <label htmlFor="rp-pw2">Type it again</label>
            <input id="rp-pw2" name="confirm" type={show ? 'text' : 'password'} autoComplete="new-password" required minLength={8} />
            <label className="account-check">
              <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
              <span>Show passwords</span>
            </label>
            {err && <p className="form-status" data-kind="error" role="alert">{err}</p>}
            <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%' }}>{busy ? 'Saving…' : 'Save new password'}</button>
          </form>
        </>
      )}
    </div>
  );
}
