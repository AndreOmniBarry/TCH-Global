'use client';

import { useState } from 'react';

type Pending = { submittedAt: string; fields: Record<string, string> };
type Live = { _id: string; name: string; quote: string; category?: string | null; featured?: boolean; submittedAt: string | null };

async function call(body: object) {
  const res = await fetch('/admin/api/testimonies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed');
}

const box: React.CSSProperties = { border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-card)', padding: 14, marginBottom: 10 };

export default function TestimonyAdmin({ pending, live }: { pending: Pending[]; live: Live[] }) {
  const [p, setP] = useState(pending);
  const [l, setL] = useState(live);
  const [msg, setMsg] = useState('');
  async function run(body: object, after: () => void) {
    setMsg('');
    try { await call(body); after(); } catch (e) { setMsg((e as Error).message); }
  }
  return (
    <div style={{ marginBottom: 36 }}>
      <h3 style={{ fontSize: '1rem', marginBottom: 6 }}>Testimonies waiting for review <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>({p.length})</span></h3>
      <p style={{ fontSize: '.8rem', color: 'var(--text-faint)', marginBottom: 12 }}>Publish puts it on the homepage within a minute. &ldquo;Publish as miracle&rdquo; also adds it to the Miracles spotlight.</p>
      {msg && <p className="form-status" data-kind="error">{msg}</p>}
      {p.length === 0 && <p style={{ fontSize: '.85rem', color: 'var(--text-faint)' }}>Nothing waiting.</p>}
      {p.map((e) => (
        <div key={e.submittedAt} style={box}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)', marginBottom: 6 }}>{new Date(e.submittedAt).toLocaleString()} · {e.fields.category || 'No category'}</div>
          <p style={{ fontSize: '.88rem', marginBottom: 6 }}>&ldquo;{e.fields.quote}&rdquo;</p>
          <p style={{ fontSize: '.8rem', marginBottom: 10 }}><strong>{e.fields.name}</strong></p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => run({ action: 'approve', submittedAt: e.submittedAt }, () => setP((x) => x.filter((y) => y !== e)))}>Publish</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => run({ action: 'approve', submittedAt: e.submittedAt, featured: true }, () => setP((x) => x.filter((y) => y !== e)))}>Publish as miracle</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => confirm('Dismiss this submission?') && run({ action: 'dismiss', submittedAt: e.submittedAt }, () => setP((x) => x.filter((y) => y !== e)))}>Dismiss</button>
          </div>
        </div>
      ))}

      <h3 style={{ fontSize: '1rem', margin: '24px 0 12px' }}>Published testimonies <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>({l.length})</span></h3>
      {l.map((t) => (
        <div key={t._id} style={box}>
          <p style={{ fontSize: '.85rem', marginBottom: 6 }}>&ldquo;{t.quote.length > 180 ? `${t.quote.slice(0, 177)}…` : t.quote}&rdquo; <strong>{t.name}</strong></p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '.75rem', color: 'var(--text-faint)' }}>{t.category || 'No category'}{t.featured ? ' · Miracle' : ''}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => run({ action: 'feature', id: t._id, featured: !t.featured }, () => setL((x) => x.map((y) => (y._id === t._id ? { ...y, featured: !t.featured } : y))))}>{t.featured ? 'Remove from miracles' : 'Mark as miracle'}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => confirm('Take this testimony off the site?') && run({ action: 'unpublish', id: t._id }, () => setL((x) => x.filter((y) => y._id !== t._id)))}>Unpublish</button>
          </div>
        </div>
      ))}
    </div>
  );
}
