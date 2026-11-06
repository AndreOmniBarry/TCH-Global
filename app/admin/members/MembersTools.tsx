'use client';

import { useState } from 'react';

async function call(action: string, email: string) {
  const r = await fetch('/admin/api/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, email }) }).catch(() => null);
  const d = r ? await r.json().catch(() => ({})) : { error: 'Couldn’t reach the server.' };
  return { ok: Boolean(r?.ok), ...d } as { ok: boolean; error?: string; link?: string; name?: string };
}

export default function MembersTools() {
  const [link, setLink] = useState<{ link: string; name: string } | null>(null);
  const [rErr, setRErr] = useState('');
  const [copied, setCopied] = useState(false);
  const [tMsg, setTMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState('');

  return (
    <div className="mt-grid">
      <section className="account-card">
        <h2 style={{ fontSize: '1.15rem', margin: '0 0 6px' }}>Reset a password</h2>
        <p className="account-muted">Makes a one-time link (valid 1 hour). Open it yourself, or send it to the member on WhatsApp. They choose a new password and are signed in.</p>
        <form className="account-form" onSubmit={async (e) => {
          e.preventDefault(); setRErr(''); setLink(null); setCopied(false); setBusy('reset');
          const d = await call('reset-link', String(new FormData(e.currentTarget).get('email') || ''));
          setBusy('');
          if (d.ok && d.link) setLink({ link: d.link, name: d.name || '' }); else setRErr(d.error || 'Something went wrong.');
        }}>
          <label htmlFor="mt-email">Member&rsquo;s email</label>
          <input id="mt-email" name="email" type="email" required autoComplete="off" />
          <button type="submit" className="btn btn-primary" disabled={busy === 'reset'}>{busy === 'reset' ? 'Making link…' : 'Make reset link'}</button>
        </form>
        {rErr && <p className="form-status" data-kind="error" role="alert">{rErr}</p>}
        {link && (
          <div className="mt-link">
            <p><b>Link for {link.name.split(' ')[0] || 'this member'}</b> (works once, for 1 hour)</p>
            <code>{link.link}</code>
            <div className="mt-link-actions">
              <button type="button" className="btn btn-ghost" onClick={() => { navigator.clipboard?.writeText(link.link).then(() => setCopied(true)); }}>{copied ? 'Copied' : 'Copy link'}</button>
              <a className="btn btn-primary" href={link.link}>Open it now</a>
            </div>
          </div>
        )}
      </section>
      <section className="account-card">
        <h2 style={{ fontSize: '1.15rem', margin: '0 0 6px' }}>Send a test email</h2>
        <p className="account-muted">If reset links or welcome emails aren&rsquo;t arriving, this shows exactly why.</p>
        <form className="account-form" onSubmit={async (e) => {
          e.preventDefault(); setTMsg(null); setBusy('test');
          const d = await call('test-email', String(new FormData(e.currentTarget).get('email') || ''));
          setBusy('');
          setTMsg(d.ok ? { ok: true, text: 'Sent. Check that inbox (and spam) in a minute.' } : { ok: false, text: d.error || 'It didn’t send.' });
        }}>
          <label htmlFor="mt-test">Send to</label>
          <input id="mt-test" name="email" type="email" required />
          <button type="submit" className="btn btn-ghost" disabled={busy === 'test'}>{busy === 'test' ? 'Sending…' : 'Send test email'}</button>
        </form>
        {tMsg && <p className="form-status" data-kind={tMsg.ok ? 'ok' : 'error'} role="status">{tMsg.text}</p>}
      </section>
    </div>
  );
}
