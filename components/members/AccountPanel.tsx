'use client';

import { useEffect, useState } from 'react';
import { useSlidingPill } from '@/components/useSlidingPill';
import { useMember } from './useMember';
import PhoneField from '@/components/PhoneField';
import { withCountry } from '@/lib/phone';

const BENEFITS = [
  ['Your own My Year in the Word', 'Every message you play, post you read and prayer you send builds your private story, revealed each month and on 15 December.'],
  ['Stay signed in', 'Sign in once on your phone and you stay signed in. Pick up any message where you left off.'],
  ['Family friendly', 'Add your children and their Bible-adventure stars count too. Teens 13+ can have their own account.'],
  ['Respond on the blog', 'Share encouragement, prayers and testimonies under every message.'],
  ['New messages by email', 'Sunday reflections and announcements in your inbox, if you want them.'],
  ['Stay connected', 'Our team can follow up with you personally about membership and serving.'],
];

export default function AccountPanel({ initialMode, next, initialForgot = false }: { initialMode: 'signin' | 'signup'; next: string; initialForgot?: boolean }) {
  const { member, loading, setMember } = useMember();
  const [mode, setMode] = useState(initialMode);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState('');
  const [forgot, setForgot] = useState(initialForgot);
  const [sent, setSent] = useState('');
  const [under18, setUnder18] = useState(false);
  const [kidErr, setKidErr] = useState('');
  const thisYear = new Date().getFullYear();
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
    if ('phone_cc' in body) { body.phone = withCountry(body.phone || '', body.phone_cc); delete body.phone_cc; }
    setBusy(true);
    try {
      const r = await fetch(`/api/auth/${mode === 'signup' ? 'signup' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, newsletter: body.newsletter === 'on', under18: body.under18 === 'on' }),
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

  async function sendReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr('');
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const r = await fetch('/api/auth/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: f.get('email'), website: f.get('website') }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setErr(d.error || 'Something went wrong. Please try again.');
      setSent(d.message);
    } catch {
      setErr('We couldn’t reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function addKid(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setKidErr('');
    const form = e.currentTarget;
    const f = new FormData(form);
    const r = await fetch('/api/kids', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: f.get('kid'), age: Number(f.get('age')) }) }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) return setKidErr(d.error || 'Couldn’t add that. Try again.');
    setMember(d.member);
    form.reset();
  }

  async function removeKid(id: string, name: string) {
    if (!confirm(`Remove ${name}? Their saved stars on this account will no longer count.`)) return;
    const r = await fetch('/api/kids', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok) setMember(d.member);
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
        <form className="account-form" onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); update({ name: f.get('name'), phone: withCountry(String(f.get('phone') || ''), String(f.get('phone_cc') || '')) }); }}>
          <label htmlFor="acc-name">Name</label>
          <input id="acc-name" name="name" defaultValue={member.name} required minLength={2} />
          <label htmlFor="acc-phone">Phone (optional)</label>
          <PhoneField id="acc-phone" name="phone" defaultValue={member.phone ?? ''} placeholder="For the follow-up team" />
          <label className="account-check">
            <input type="checkbox" checked={member.newsletter} onChange={(e) => update({ newsletter: e.target.checked })} />
            <span>Email me new messages, blog posts and announcements</span>
          </label>
          <label className="account-check">
            <input type="checkbox" checked={member.wrapped !== false} onChange={(e) => update({ wrapped: e.target.checked })} />
            <span>Keep my <b>My Year in the Word</b>: privately remember what I listen to, read and pray along with, so I get my story each month and in December. Only I can see it.</span>
          </label>
          <div className="account-actions">
            <button type="submit" className="btn btn-primary">Save changes</button>
            <button type="button" className="btn btn-ghost" onClick={signOut}>Sign out</button>
          </div>
          {saved && <p className="form-status" data-kind="ok">{saved}</p>}
        </form>
        {!member.teen && (
          <section className="account-kids" id="kids">
            <h3>Your children</h3>
            <p className="account-muted">Add your 3 to 12-year-olds and pick them on <a href="/kids">Today&rsquo;s Bible Adventure</a>. Their stars are saved and appear in your family&rsquo;s <b>Year in the Word</b>. We keep only a first name and age.</p>
            {(member.kids ?? []).length > 0 && (
              <ul className="account-kid-list">
                {(member.kids ?? []).map((k) => (
                  <li key={k.id}><i aria-hidden="true">{k.name[0]}</i><span><b>{k.name}</b> &middot; {k.age}</span><button type="button" onClick={() => removeKid(k.id, k.name)} aria-label={`Remove ${k.name}`}>Remove</button></li>
                ))}
              </ul>
            )}
            {(member.kids ?? []).length < 8 && (
              <form className="account-kid-add" onSubmit={addKid}>
                <input name="kid" placeholder="First name" aria-label="Child's first name" required minLength={2} maxLength={24} />
                <select name="age" aria-label="Age" required defaultValue="">
                  <option value="" disabled>Age</option>
                  {Array.from({ length: 10 }, (_, i) => i + 3).map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <button type="submit" className="btn btn-ghost">Add child</button>
              </form>
            )}
            {kidErr && <p className="form-status" data-kind="error" role="alert">{kidErr}</p>}
          </section>
        )}
        <p className="account-muted account-stay">You&rsquo;ll stay signed in on this device for a year after your last visit. Using a shared phone? Sign out when you&rsquo;re done.</p>
        <div className="account-links">
          <a href="/blog">Read and respond on the blog &rarr;</a>
          <a href="/library">Open PUDLIB! &rarr;</a>
          <a href="/wrapped">My Year in the Word &rarr;</a>
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
        <div className={`account-switch seg seg--glass${demo === 'tap' ? ' seg-bump' : ''}`} role="tablist" ref={switchRef}>
          <span className="seg-pill" aria-hidden="true" />
          {demo && (
            <span className={`seg-cursor seg-cursor--${demo}`} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="26" height="26"><path d="M5 3l14 8-6.2 1.6L10 19z" fill="#fff" stroke="#111" strokeWidth="1.4" strokeLinejoin="round" /></svg>
            </span>
          )}
          <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'on' : ''} onClick={() => { setMode('signup'); setForgot(false); setErr(''); }}>Create account</button>
          <button type="button" role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'on' : ''} onClick={() => { setMode('signin'); setForgot(false); setErr(''); }}>Sign in</button>
        </div>
        {mode === 'signin' && forgot ? (
          <form className="account-form" onSubmit={sendReset} key="forgot">
            <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hp-field" aria-hidden="true" />
            <h3 className="account-forgot-title">Reset your password</h3>
            {sent ? (
              <p className="form-status" data-kind="ok" role="status">{sent}</p>
            ) : (
              <>
                <p className="account-muted">Enter the email you signed up with and we&rsquo;ll send you a link to choose a new password.</p>
                <label htmlFor="acc-forgot-email">Email</label>
                <input id="acc-forgot-email" name="email" type="email" autoComplete="email" required autoFocus />
                {err && <p className="form-status" data-kind="error" role="alert">{err}</p>}
                <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%' }}>{busy ? 'Sending…' : 'Email me a reset link'}</button>
              </>
            )}
            <button type="button" className="account-link" onClick={() => { setForgot(false); setSent(''); setErr(''); }}>&larr; Back to sign in</button>
          </form>
        ) : (
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
              <label className="account-check">
                <input type="checkbox" name="under18" checked={under18} onChange={(e) => setUnder18(e.target.checked)} />
                <span>I&rsquo;m under 18</span>
              </label>
              {under18 && (
                <div className="account-teen">
                  <label htmlFor="acc-by">Year you were born</label>
                  <select id="acc-by" name="birthYear" required defaultValue="">
                    <option value="" disabled>Choose…</option>
                    {Array.from({ length: 7 }, (_, i) => thisYear - 13 - i).map((y) => <option key={y} value={y}>{y}</option>)}
                    <option value={thisYear - 12}>{thisYear - 12} or later (12 and under)</option>
                  </select>
                  <label htmlFor="acc-guardian">Parent or guardian&rsquo;s email</label>
                  <input id="acc-guardian" name="guardianEmail" type="email" autoComplete="off" required placeholder="We’ll let them know you joined" />
                  <p className="account-muted">Under 13? A parent can add you to their own account instead, and your stars still count.</p>
                </div>
              )}
              <label htmlFor="acc-phone">Phone (optional)</label>
              <PhoneField id="acc-phone" name="phone" />
              <label className="account-check">
                <input type="checkbox" name="newsletter" defaultChecked />
                <span>Email me new messages, blog posts and announcements</span>
              </label>
            </>
          )}
          {err && <p className="form-status" data-kind="error" role="alert">{err}</p>}
          <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%' }}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create my account' : 'Sign in'}</button>
          {mode === 'signin' && <button type="button" className="account-link" onClick={() => { setForgot(true); setErr(''); }}>Forgot your password?</button>}
        </form>
        )}
      </div>
    </div>
  );
}
