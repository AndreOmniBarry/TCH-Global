'use client';

import { useState } from 'react';

const PRAYER = [
  'O Lord God, I believe with all my heart in Jesus Christ, Son of the living God. I believe He’s alive today. I confess with my mouth that Jesus Christ is the Lord of my life from this day.',
  'Through Him and in His Name, I have eternal life, I’m born again. Thank You Lord, for saving my soul! I’m now a child of God. Hallelujah!',
];

/** A Prayer of Salvation, then a gentle hand-off: anyone who prays it can
 * leave a way to reach them, and Pastor's team follows up. */
export default function SalvationSection() {
  const [step, setStep] = useState<'pray' | 'form' | 'done'>('pray');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [name, setName] = useState('');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr('');
    const f = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    if (!f.phone?.trim() && !f.email?.trim()) return setErr('Leave a phone number or an email so we can reach you.');
    setBusy(true);
    try {
      const r = await fetch('/api/forms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'salvation', fields: { name: f.name, phone: f.phone, email: f.email, city: f.city, note: f.note }, website: f.website }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setErr(d.error || 'Something went wrong. Please try again.');
      setName(f.name.split(' ')[0]);
      setStep('done');
    } catch {
      setErr('We couldn’t reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section salv" id="salvation" data-title="Salvation">
      <div className="salv-glow" aria-hidden="true" />
      <div className="container salv-inner">
        <div className="section-header pop">
          <span className="eyebrow">New life in Christ</span>
          <h2>A Prayer of Salvation</h2>
          <p>If you want to give your life to Jesus today, pray this out loud from your heart. Wherever you are, God hears you.</p>
        </div>

        <figure className="salv-card pop">
          <span className="salv-mark" aria-hidden="true">&ldquo;</span>
          {PRAYER.map((p) => <p key={p.slice(0, 12)}>{p}</p>)}
          <figcaption>Romans 10:9 &middot; &ldquo;If you confess with your mouth that Jesus is Lord and believe in your heart that God raised Him from the dead, you will be saved.&rdquo;</figcaption>
        </figure>

        <div className="salv-next pop" aria-live="polite">
          {step === 'pray' && (
            <div className="salv-cta">
              <p><strong>Did you pray this prayer?</strong> Pastor Uzor would love to reach you, pray with you and walk with you in your new life.</p>
              <button type="button" className="btn btn-primary" onClick={() => setStep('form')}>I prayed this prayer</button>
            </div>
          )}
          {step === 'form' && (
            <form className="salv-form" onSubmit={submit}>
              <p className="salv-welcome">Welcome to the family of God. Let us know how to reach you.</p>
              <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hp-field" aria-hidden="true" />
              <label htmlFor="salv-name">Your name</label>
              <input id="salv-name" name="name" required autoComplete="name" />
              <div className="publish-grid">
                <div>
                  <label htmlFor="salv-phone">Phone / WhatsApp</label>
                  <input id="salv-phone" name="phone" type="tel" autoComplete="tel" />
                </div>
                <div>
                  <label htmlFor="salv-email">Email</label>
                  <input id="salv-email" name="email" type="email" autoComplete="email" />
                </div>
              </div>
              <label htmlFor="salv-city">City (optional)</label>
              <input id="salv-city" name="city" autoComplete="address-level2" />
              <label htmlFor="salv-note">Anything you&rsquo;d like Pastor to pray about? (optional)</label>
              <textarea id="salv-note" name="note" rows={3} />
              {err && <p className="form-status" data-kind="error">{err}</p>}
              <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%' }}>{busy ? 'Sending…' : 'Ask Pastor to reach me'}</button>
            </form>
          )}
          {step === 'done' && (
            <div className="salv-done">
              <span className="salv-check" aria-hidden="true"><svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>
              <h3>Heaven is rejoicing, {name || 'friend'}!</h3>
              <p>Pastor Uzor and our team will reach out soon to pray with you. Until then, read the Gospel of John and talk to God every day.</p>
              <div className="salv-steps">
                <a href="/#service">Join us this Sunday</a>
                <a href="/library">Watch messages on PUDLIB!</a>
                <a href="/account?mode=signup">Create your account</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
