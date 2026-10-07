'use client';

import { useEffect, useState } from 'react';
import { useSlidingPill } from '@/components/useSlidingPill';
import { useMember } from './useMember';

const BENEFITS = [
  ['Respond on the blog', 'Share encouragement, prayers and testimonies under every message.'],
  ['New messages by email', 'Sunday reflections and announcements in your inbox, if you want them.'],
  ['Stay connected', 'Our team can follow up with you personally about membership and serving.'],
];

export default function AccountPanel({ initialMode, next }: { initialMode: 'signin' | 'signup'; next: string }) {
  const { member, loading, setMember } = useMember();
  const [mode, setMode] = useState(initialMode);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState('');
  const switchRef = useSlidingPill<HTMLDivElement>(`${mode}-${member ? 1 : 0}-${loading ? 1 : 0}`);
  const [demo, setDemo] = useState<'' | 'enter' | 'tap' | 'out'>('');

  // First visit: a cursor glides in and taps the selected option, like an
  // onboarding hint. Shown once per browser.
  useEffect(() => {
    if (loading || member || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    try { if (localStorage.getItem('tch_seg_demo') === '1') return; localStorage.setItem('tch_seg_demo', '1'); } catch {}
    const t = [
      window.setTimeout(() => setDemo('enter'), 500),
      window.setTimeout(() => setDemo('tap'), 1500),
      window.setTimeout(() => setDemo('out'), 2100),
      window.setTimeout(() => setDemo(''), 2700),
    ];
    return () => t.forEach(window.clearTimeout);
  }, [loading, member]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr('');
    const f = new FormData(e.currentTarget);
    const body = Object.fromEntries(f.entries()) as Record<string, string>;
    setBusy(true);
    try {
      const r = await fetch(`/api/auth/${mode === 'signup' ? 'signup' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, newsletter: body.newsletter === 'on' }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setErr(d.error || 'Something went wrong. Please try again.');
      if (next) { location.href = next; return; }
      setMember(d.member);
    } catch {
      setErr('We couldn’t reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function update(patch: Record<string, unknown>) {
    setSaved('');
    const r = await fetch('/api/auth/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    const d = await r.json().catch(() => ({}));
    if (r.ok) { setMember(d.member); setSaved('Saved.'); }
  }

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setMember(null);
  }

  if (loading) return <div className="account-card"><p className="account-muted">Loading…</p></div>;

  if (member) {
    return (
      <div className="account-card">
        <span className="eyebrow">Your account</span>
        <h2>Welcome, {member.name.split(' ')[0]}</h2>
        <p className="account-muted">Signed in as {member.email} &middot; member since {new Date(member.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
        <form className="account-form" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); update({ name: f.get('name'), phone: f.get('phone') }); }}>
          <label htmlFor="acc-name">Name</label>
          <input id="acc-name" name="name" defaultValue={member.name} required minLength={2} />
          <label htmlFor="acc-phone">Phone (optional)</label>
          <input id="acc-phone" name="phone" type="tel" defaultValue={member.phone ?? ''} placeholder="For the follow-up team" />
          <label className="account-check">
            <input type="checkbox" checked={member.newsletter} onChange={(e) => update({ newsletter: e.target.checked })} />
            <span>Email me new messages, blog posts and announcements</span>
          </label>
          <div className="account-actions">
            <button type="submit" className="btn btn-primary">Save changes</button>
            <button type="button" className="btn btn-ghost" onClick={signOut}>Sign out</button>
          </div>
          {saved && <p className="form-status" data-kind="ok">{saved}</p>}
        </form>
        <div className="account-links">
          <a href="/blog">Read and respond on the blog &rarr;</a>
          <a href="/library">Open PUDLIB! &rarr;</a>
        </div>
      </div>
    );
  }

  return (
    <div className="account-grid">
      <div className="account-pitch">
        <span className="eyebrow">TCH Global family</span>
        <h2>{mode === 'signup' ? 'Join the family' : 'Welcome back'}</h2>
        <p>A free account connects you with the house between Sundays.</p>
        <ul>
          {BENEFITS.map(([t, d]) => <li key={t}><strong>{t}</strong><span>{d}</span></li>)}
        </ul>
      </div>
      <div className="account-card">
        <div className={`account-switch seg${demo === 'tap' ? ' seg-bump' : ''}`} role="tablist" ref={switchRef}>
          <span className="seg-pill" aria-hidden="true" />
          {demo && (
            <span className={`seg-cursor seg-cursor--${demo}`} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="26" height="26"><path d="M5 3l14 8-6.2 1.6L10 19z" fill="#fff" stroke="#111" strokeWidth="1.4" strokeLinejoin="round" /></svg>
            </span>
          )}
          <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'on' : ''} onClick={() => { setMode('signup'); setErr(''); }}>Create account</button>
          <button type="button" role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'on' : ''} onClick={() => { setMode('signin'); setErr(''); }}>Sign in</button>
        </div>
        <form className="account-form" onSubmit={submit} key={mode}>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hp-field" aria-hidden="true" />
          {mode === 'signup' && (
            <>
              <label htmlFor="acc-name">Full name</label>
              <input id="acc-name" name="name" autoComplete="name" required minLength={2} />
            </>
          )}
          <label htmlFor="acc-email">Email</label>
          <input id="acc-email" name="email" type="email" autoComplete="email" required />
          <label htmlFor="acc-pw">Password</label>
          <input id="acc-pw" name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={mode === 'signup' ? 8 : 1} placeholder={mode === 'signup' ? 'At least 8 characters' : ''} />
          {mode === 'signup' && (
            <>
              <label htmlFor="acc-phone">Phone (optional)</label>
              <input id="acc-phone" name="phone" type="tel" autoComplete="tel" />
              <label className="account-check">
                <input type="checkbox" name="newsletter" defaultChecked />
                <span>Email me new messages, blog posts and announcements</span>
              </label>
            </>
          )}
          {err && <p className="form-status" data-kind="error" role="alert">{err}</p>}
          <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%' }}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create my account' : 'Sign in'}</button>
          {mode === 'signin' && <p className="account-muted" style={{ marginTop: 10 }}>Forgot your password? Email info@tchglobal.org and our team will reset it.</p>}
        </form>
      </div>
    </div>
  );
}
