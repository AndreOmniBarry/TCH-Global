'use client';

import { useState } from 'react';

export default function GuardianReview({ token, name }: { token: string; name: string | null }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [err, setErr] = useState('');
  async function remove() {
    if (!confirm(`Close ${name}’s account? This can’t be undone.`)) return;
    setState('busy'); setErr('');
    const r = await fetch('/api/auth/guardian', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok) setState('done'); else { setState('idle'); setErr(d.error || 'Something went wrong. Please try again.'); }
  }
  return (
    <div className="account-card account-reset">
      <span className="eyebrow">TCH Loveforce</span>
      {state === 'done' ? (
        <><h2>Thank you</h2><p className="account-muted" role="status">We&rsquo;ve closed the account and its sign-ins. Thank you for looking out for them.</p></>
      ) : !name ? (
        <><h2>Nothing to review</h2><p className="account-muted">This link has been used already, or the account was removed. Questions? Write to info@tchglobal.org.</p></>
      ) : (
        <>
          <h2>{name} has joined TCH Loveforce</h2>
          <p className="account-muted">{name} follows the Daily Drop, listens to messages from Pastor Uzor and builds a private Year in the Word. We hold only their name and email; nothing they do is public.</p>
          <a className="btn btn-primary" href="/account?mode=signup" style={{ width: '100%', marginTop: 16 }}>Join TCH Global too</a>
          {err && <p className="form-status" data-kind="error" role="alert">{err}</p>}
          <p className="account-muted" style={{ marginTop: 18 }}>Not {name}&rsquo;s parent or guardian, or prefer they don&rsquo;t have an account?{' '}
            <button type="button" className="account-link" onClick={remove} disabled={state === 'busy'}>{state === 'busy' ? 'Closing…' : 'Close this account'}</button></p>
        </>
      )}
    </div>
  );
}
