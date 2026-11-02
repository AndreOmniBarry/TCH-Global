'use client';

import { useState } from 'react';

export default function GuardianReview({ token, name }: { token: string; name: string | null }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [err, setErr] = useState('');
  async function remove() {
    if (!confirm(`Remove ${name}’s account? This can’t be undone.`)) return;
    setState('busy'); setErr('');
    const r = await fetch('/api/auth/guardian', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok) setState('done'); else { setState('idle'); setErr(d.error || 'Something went wrong. Please try again.'); }
  }
  return (
    <div className="account-card account-reset">
      <span className="eyebrow">For parents and guardians</span>
      {state === 'done' ? (
        <><h2>Account removed</h2><p className="account-muted" role="status">The account and its sign-ins have been deleted. Thank you for looking out for them.</p></>
      ) : !name ? (
        <><h2>Nothing to review</h2><p className="account-muted">This link has been used already, or the account was removed. Questions? Write to info@tchglobal.org.</p></>
      ) : (
        <>
          <h2>{name}&rsquo;s TCH Global account</h2>
          <p className="account-muted">{name} can follow the Daily Drop, listen to messages and get a private yearly recap. We hold only their name, email and birth year; nothing they do is public.</p>
          <p className="account-muted" style={{ marginTop: 10 }}>Happy with it? There&rsquo;s nothing to do. Otherwise:</p>
          {err && <p className="form-status" data-kind="error" role="alert">{err}</p>}
          <button type="button" className="btn btn-primary" onClick={remove} disabled={state === 'busy'} style={{ width: '100%', marginTop: 14 }}>{state === 'busy' ? 'Removing…' : `Remove ${name}’s account`}</button>
        </>
      )}
    </div>
  );
}
