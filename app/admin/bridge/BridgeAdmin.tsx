'use client';

import { useState } from 'react';

type Row = { id: string; type: string; created: string; attempts: number; last: string; held: string };
type Props = {
  configured: boolean; paused: boolean; missing: string[]; keyBad: boolean;
  stats: { pending: number; dead: number; delivered: number; lastOk: string; lastErr: string; authAlert: boolean } | null;
  pending: Row[]; dead: Row[]; log: { id: string; type: string; status: string; code: string; at: string }[];
};

async function call(body: object) {
  const r = await fetch('/admin/api/bridge', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'That did not work.');
  return j;
}

export default function BridgeAdmin(p: Props) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [who, setWho] = useState('');
  const [test, setTest] = useState<{ ok: boolean; say: string; code: string; using?: string } | null>(null);
  async function runTest() {
    setBusy(true); setTest(null);
    try { const j = await call({ action: 'test' }); setTest({ ok: j.ok, say: j.say, code: String(j.code), using: j.using }); }
    catch (e) { setTest({ ok: false, say: (e as Error).message, code: '' }); }
    finally { setBusy(false); }
  }
  async function act(body: object, done: (j: Record<string, number>) => string) {
    setBusy(true); setMsg('');
    try { const j = await call(body); setMsg(done(j)); setTimeout(() => location.reload(), 1400); }
    catch (e) { setMsg((e as Error).message); }
    finally { setBusy(false); }
  }

  const state = !p.configured ? 'bad' : p.paused || p.stats?.authAlert ? 'na' : 'ok';
  return (
    <div className="br">
      <div className={`st-row st-row--${state}`}>
        <span className="st-dot" aria-hidden="true" />
        <div>
          <strong>{!p.configured ? 'Not connected yet' : p.paused ? 'Paused (BRIDGE_ENABLED=off)' : p.stats?.authAlert ? 'SHEP.HRD refused the key' : 'Connected'}</strong>
          <span>
            {!p.configured ? `Add in Vercel: ${p.missing.join(', ')}.${p.keyBad ? ' BRIDGE_ENC_KEY is set but is not 32 bytes of base64.' : ''} Until then forms work exactly as before (email + saved copy).`
              : p.paused ? 'New sign-ups are queued safely and will send when you remove BRIDGE_ENABLED.'
              : p.stats?.authAlert ? 'The bridge key in Vercel and SHEP.HRD no longer match. Nothing is lost; items wait and send once they match.'
              : `Last delivery ${p.stats?.lastOk}.${p.stats?.lastErr ? ` Last problem: ${p.stats.lastErr}.` : ''}`}
          </span>
        </div>
        <b>{p.stats ? `${p.stats.delivered} delivered` : ''}</b>
      </div>

      {p.stats && (
        <div className="br-tiles">
          <div><b>{p.stats.pending}</b><span>Waiting to send</span></div>
          <div><b>{p.stats.dead}</b><span>Need a person</span></div>
          <div><b>{p.stats.delivered}</b><span>Delivered</span></div>
        </div>
      )}

      <div className="br-actions">
        <button className="btn btn-primary" disabled={busy || !p.configured} onClick={runTest}>{busy && !test ? 'Testing…' : 'Test connection'}</button>
        <button className="btn" disabled={busy || !p.configured} onClick={() => act({ action: 'send-now' }, (j) => `Tried ${j.tried}, delivered ${j.delivered}.`)}>Send waiting items now</button>
        <a className="btn" href="/admin/api/bridge?export=dead">Export &ldquo;need a person&rdquo; (CSV)</a>
        <a className="btn" href="/admin/api/bridge?export=pending">Export waiting (CSV)</a>
        {p.stats?.authAlert && <button className="btn" disabled={busy} onClick={() => act({ action: 'clear-alert' }, () => 'Alert cleared.')}>Keys fixed: clear alert</button>}
      </div>
      {test && (
        <div className={`st-row st-row--${test.ok ? 'ok' : 'bad'}`} role="status">
          <span className="st-dot" aria-hidden="true" />
          <div><strong>{test.ok ? 'Test passed' : 'Test failed'}</strong><span>{test.say}</span>{test.using && <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '.8rem', opacity: .8 }}>{test.using}</span>}<em>No record was created in SHEP.HRD by this test.</em></div>
          <b>{test.code}</b>
        </div>
      )}
      {msg && <p className="br-msg" role="status">{msg}</p>}

      {!p.configured && <SecretMaker />}

      <h3 className="br-h">Need a person ({p.dead.length})</h3>
      <p className="br-note">Held as a suspected bot or flood, refused by SHEP.HRD as invalid, or still undelivered after 24 hours. Release sends it again; Remove deletes it from the queue (the emailed copy remains). Each is kept 30 days.</p>
      {p.dead.length ? <Table rows={p.dead} actions={(r) => (
        <>
          <button disabled={busy} onClick={() => act({ action: 'release', ids: [r.id] }, () => 'Released.')}>Release</button>
          <button disabled={busy} onClick={() => confirm('Remove this item from the queue?') && act({ action: 'remove', ids: [r.id] }, () => 'Removed.')}>Remove</button>
        </>
      )} /> : <p className="br-empty">Nothing here.</p>}

      <h3 className="br-h">Waiting to send ({p.pending.length})</h3>
      {p.pending.length ? <Table rows={p.pending} /> : <p className="br-empty">Nothing waiting.</p>}

      <h3 className="br-h">Erase a person&rsquo;s data</h3>
      <p className="br-note">For a data-protection request: removes every saved website submission and queued item with this email or phone. Ask the SHEP.HRD admin to erase it there too.</p>
      <form className="br-erase" onSubmit={(e) => { e.preventDefault(); if (confirm(`Permanently erase everything stored for ${who}?`)) act({ action: 'erase', who }, (j) => `Erased ${j.forms} saved submission(s) and ${j.queued} queued item(s).`); }}>
        <input value={who} onChange={(e) => setWho(e.target.value)} placeholder="email@example.com or 0803…" aria-label="Email or phone" />
        <button className="btn" disabled={busy || !who.trim()}>Erase</button>
      </form>

      <h3 className="br-h">Recent activity</h3>
      <p className="br-note">Reference numbers and outcomes only. No names, contacts or messages are logged.</p>
      <div className="br-log">
        {p.log.length ? p.log.map((l, i) => <div key={i}><code>{l.id}</code><span>{l.type}</span><span>{l.status}{l.code ? ` · ${l.code}` : ''}</span><em>{l.at}</em></div>) : <p className="br-empty">No activity yet.</p>}
      </div>
    </div>
  );
}

function Table({ rows, actions }: { rows: Row[]; actions?: (r: Row) => React.ReactNode }) {
  return (
    <div className="br-table">
      {rows.map((r) => (
        <div key={r.id} className="br-tr">
          <code>{r.id.slice(0, 8)}</code>
          <span>{r.type}</span>
          <span>{r.created}</span>
          <span>{r.held ? `Held: ${r.held}` : `${r.attempts} tries${r.last ? ` · last ${r.last}` : ''}`}</span>
          {actions && <span className="br-btns">{actions(r)}</span>}
        </div>
      ))}
    </div>
  );
}

// Makes the bridge secrets in this browser (crypto.getRandomValues). They
// are never sent to the server or saved: copy each into Vercel, then close.
function SecretMaker() {
  const [keys, setKeys] = useState<[string, string, string][] | null>(null);
  const [copied, setCopied] = useState('');
  const bytes = (n: number) => crypto.getRandomValues(new Uint8Array(n));
  const hex = (n: number) => Array.from(bytes(n), (b) => b.toString(16).padStart(2, '0')).join('');
  const b64 = (n: number) => btoa(String.fromCharCode(...Array.from(bytes(n))));
  function make() {
    const bridge = hex(32);
    const flush = hex(32);
    setKeys([
      ['SHEP_BRIDGE_SECRET', bridge, 'TCH website, and inside BRIDGE_KEYS on SHEP.HRD'],
      ['BRIDGE_ENC_KEY', b64(32), 'TCH website only'],
      ['BRIDGE_FLUSH_KEYS', `F1:${flush}`, 'TCH website only'],
      ['BRIDGE_FLUSH_SECRET', flush, 'SHEP.HRD only (same value as after F1: above)'],
      ['CRON_SECRET', hex(24), 'TCH website, and cron-job.org header'],
    ]);
  }
  return (
    <div className="br-secrets">
      <h3 className="br-h" style={{ marginTop: 0 }}>Step 1: make your secrets</h3>
      <p className="br-note">Made in your browser only. Nothing here is sent or saved, so copy each into Vercel before leaving this page. Never paste them into chat, email or WhatsApp.</p>
      {!keys ? <button className="btn btn-primary" onClick={make}>Make my secrets</button> : (
        <div className="br-table">
          {keys.map(([name, val, where]) => (
            <div key={name} className="br-secret">
              <strong>{name}</strong><em>{where}</em>
              <code>{val}</code>
              <button className="btn" onClick={() => navigator.clipboard?.writeText(val).then(() => { setCopied(name); setTimeout(() => setCopied(''), 1500); })}>{copied === name ? 'Copied' : 'Copy'}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
