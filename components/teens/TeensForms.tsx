'use client';

import { useState } from 'react';

const SQUADS = ['Worship & Band', 'Media & Content', 'Drama & Dance', 'Sports', 'Tech & Gaming', 'Outreach'];

async function send(fields: Record<string, string>) {
  const r = await fetch('/api/forms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'teens', fields }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'That didn’t send. Try again.');
}

export function AskAnything() {
  const [q, setQ] = useState('');
  const [anon, setAnon] = useState(true);
  const [name, setName] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [err, setErr] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim().length < 5) return setErr('Ask a little more so we can answer well.');
    setErr(''); setState('busy');
    try { await send({ kind: 'question', question: q.trim(), name: anon ? 'Anonymous' : name.trim() }); setState('done'); }
    catch (x) { setErr((x as Error).message); setState('idle'); }
  }
  if (state === 'done') return <div className="tn-done"><strong>Got it.</strong> Our youth leaders read every question. Look out for the answer in a Teens blog post or at the next hangout.</div>;
  return (
    <form className="tn-ask" onSubmit={submit}>
      <textarea value={q} onChange={(e) => setQ(e.target.value)} rows={4} maxLength={1000} placeholder="Faith, school, friends, family, the future… nothing is off limits." aria-label="Your question" />
      <div className="tn-ask-row">
        <label className="tn-toggle"><input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} /><i aria-hidden="true" /><span>Ask anonymously</span></label>
        {!anon && <input className="tn-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your first name" aria-label="Your first name" />}
        <button type="submit" className="tn-btn" disabled={state === 'busy'}>{state === 'busy' ? 'Sending…' : 'Send question'}</button>
      </div>
      {err && <p className="tn-err">{err}</p>}
    </form>
  );
}

export function SquadPicker() {
  const [picked, setPicked] = useState<string[]>([]);
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [err, setErr] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    if (!picked.length) return setErr('Pick at least one squad.');
    if (!f.name?.trim() || !f.contact?.trim()) return setErr('Add your name and a phone or email.');
    setErr(''); setState('busy');
    try { await send({ kind: 'squad', squad: picked.join(', '), name: f.name, age: f.age, contact: f.contact }); setState('done'); }
    catch (x) { setErr((x as Error).message); setState('idle'); }
  }
  if (state === 'done') return <div className="tn-done"><strong>You&rsquo;re in.</strong> A squad leader will reach out before the next hangout.</div>;
  return (
    <form className="tn-squad" onSubmit={submit}>
      <div className="tn-squads">
        {SQUADS.map((s) => {
          const on = picked.includes(s);
          return <button type="button" key={s} className={on ? 'on' : ''} aria-pressed={on} onClick={() => setPicked(on ? picked.filter((x) => x !== s) : [...picked, s])}>{s}</button>;
        })}
      </div>
      <div className="tn-squad-row">
        <input name="name" placeholder="First name" aria-label="First name" autoComplete="given-name" />
        <input name="age" placeholder="Age" aria-label="Age" inputMode="numeric" maxLength={2} />
        <input name="contact" placeholder="Phone or email" aria-label="Phone or email" />
      </div>
      {err && <p className="tn-err">{err}</p>}
      <button type="submit" className="tn-btn" disabled={state === 'busy'}>{state === 'busy' ? 'Sending…' : 'Join the squad'}</button>
    </form>
  );
}
