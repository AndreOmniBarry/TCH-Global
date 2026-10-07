'use client';

import { useState } from 'react';

export default function AdminLogin({ next }: { next: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    const password = String(new FormData(e.currentTarget).get('password') || '');
    try {
      const r = await fetch('/admin/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setErr(d.error || 'Could not sign in.');
      location.href = next;
    } catch {
      setErr('We couldn’t reach the server. Try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="account-card" style={{ margin: '0 auto' }}>
      <span className="eyebrow">Church admin</span>
      <h2>Sign in to admin</h2>
      <p className="account-muted">Submissions, members, testimonies and analytics. Use the same password as the /write page.</p>
      <form className="account-form" onSubmit={submit}>
        <label htmlFor="admin-pw">Admin password</label>
        <input id="admin-pw" name="password" type="password" autoComplete="current-password" required autoFocus />
        {err && <p className="form-status" data-kind="error" role="alert">{err}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%' }}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}
