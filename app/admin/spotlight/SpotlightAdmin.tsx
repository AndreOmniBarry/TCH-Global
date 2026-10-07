'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { parseLagosLocal, fmtDate, fmtTime } from '@/lib/church-time';

type Item = { _id: string; title: string; kind: string | null; subtitle: string | null; image: string | null; eventDate: string | null; showFrom: string | null; showUntil: string | null; link: string | null; linkLabel: string | null; order: number | null; hidden: boolean };

function status(it: Item) {
  const now = Date.now();
  if (it.hidden) return { label: 'Hidden', cls: 'off' };
  if (it.showFrom && new Date(it.showFrom).getTime() > now) return { label: `Starts ${fmtDate(new Date(it.showFrom).getTime())}`, cls: 'soon' };
  if (it.showUntil && new Date(it.showUntil).getTime() <= now) return { label: 'Ended', cls: 'off' };
  return { label: 'Live on homepage', cls: 'live' };
}

// Resize big photos in the browser (max 2000px, WebP) so uploads stay
// small and fast, and stay under Vercel's 4.5 MB request limit.
async function shrink(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob: Blob | null = await new Promise((r) => c.toBlob(r, 'image/webp', 0.86));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, '') + '.webp', { type: 'image/webp' }) : file;
  } catch {
    return file;
  }
}

export default function SpotlightAdmin() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string>('');
  const formRef = useRef<HTMLFormElement>(null);

  const load = useCallback(async () => {
    const r = await fetch('/admin/api/spotlight', { cache: 'no-store' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(d.error || 'Could not load.'); setItems([]); return; }
    setItems(d.items);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(''); setOk('');
    const f = new FormData(e.currentTarget);
    for (const k of ['eventDate', 'showFrom', 'showUntil']) {
      const v = String(f.get(k) || '');
      f.set(k, v ? new Date(parseLagosLocal(v)).toISOString() : '');
    }
    if (!f.get('showUntil') && f.get('eventDate')) {
      f.set('showUntil', new Date(new Date(String(f.get('eventDate'))).getTime() + 6 * 3600_000).toISOString());
    }
    setBusy(true);
    try {
      const raw = f.get('image');
      if (raw && typeof raw !== 'string' && raw.size) f.set('image', await shrink(raw));
      const r = await fetch('/admin/api/spotlight', { method: 'POST', body: f });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setErr(d.error || 'Could not save.');
      setOk('Added. It is live on the homepage now.');
      formRef.current?.reset();
      setPreview('');
      load();
    } catch {
      setErr('Upload failed. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  async function patch(body: object) {
    await fetch('/admin/api/spotlight', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    load();
  }
  async function remove(id: string) {
    if (!confirm('Delete this from the spotlight?')) return;
    await fetch(`/admin/api/spotlight?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="sp-admin">
      <form ref={formRef} className="sp-form account-card" onSubmit={submit}>
        <h3>Add to the spotlight</h3>
        <label className="sp-drop">
          <input type="file" name="image" accept="image/jpeg,image/png,image/webp" onChange={(e) => { const fl = e.target.files?.[0]; setPreview(fl ? URL.createObjectURL(fl) : ''); }} />
          {preview ? <img src={preview} alt="Preview" /> : <span><strong>Choose a flyer or banner</strong><br />JPG, PNG or WebP, up to 8 MB. Landscape works best.</span>}
        </label>
        <div className="publish-grid">
          <div>
            <label htmlFor="sp-kind">Type</label>
            <select id="sp-kind" name="kind" defaultValue="Event">
              {['Event', 'Announcement', 'Programme', 'Banner'].map((k) => <option key={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="sp-date">Event date (optional, WAT)</label>
            <input id="sp-date" name="eventDate" type="datetime-local" />
          </div>
        </div>
        <label htmlFor="sp-title">Title</label>
        <input id="sp-title" name="title" required maxLength={120} placeholder="e.g. Holy Ghost Revival 2026" />
        <label htmlFor="sp-sub">Short line (optional)</label>
        <input id="sp-sub" name="subtitle" maxLength={160} placeholder="e.g. Three nights of worship and the Word" />
        <div className="publish-grid">
          <div>
            <label htmlFor="sp-from">Show from (optional)</label>
            <input id="sp-from" name="showFrom" type="datetime-local" />
          </div>
          <div>
            <label htmlFor="sp-until">Show until</label>
            <input id="sp-until" name="showUntil" type="datetime-local" />
          </div>
        </div>
        <p className="account-muted" style={{ marginTop: -6 }}>Leave &ldquo;show until&rdquo; empty and it stays until 6 hours after the event date (or until you remove it).</p>
        <div className="publish-grid">
          <div>
            <label htmlFor="sp-link">Button link (optional)</label>
            <input id="sp-link" name="link" placeholder="/live or https://…" />
          </div>
          <div>
            <label htmlFor="sp-label">Button text</label>
            <input id="sp-label" name="linkLabel" maxLength={40} placeholder="Register now" />
          </div>
        </div>
        {err && <p className="form-status" data-kind="error">{err}</p>}
        {ok && <p className="form-status" data-kind="ok">{ok}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%' }}>{busy ? 'Uploading…' : 'Publish to hero'}</button>
      </form>

      <div className="sp-list">
        <h3>In the spotlight</h3>
        {items === null && <p className="account-muted">Loading…</p>}
        {items && items.length === 0 && <p className="account-muted">Nothing yet. Add your first flyer on the left.</p>}
        {items?.map((it, k) => {
          const st = status(it);
          return (
            <div className="sp-item" key={it._id}>
              <span className="sp-thumb">{it.image ? <img src={`${it.image}?w=240&h=150&fit=crop&auto=format`} alt="" /> : null}</span>
              <div className="sp-info">
                <span className={`sp-status sp-status--${st.cls}`}>{st.label}</span>
                <strong>{it.title}</strong>
                <span className="account-muted">{[it.kind, it.eventDate && `${fmtDate(new Date(it.eventDate).getTime())}, ${fmtTime(new Date(it.eventDate).getTime())}`, it.showUntil && `until ${fmtDate(new Date(it.showUntil).getTime())}`].filter(Boolean).join(' · ')}</span>
                <div className="sp-actions">
                  <button type="button" disabled={k === 0} onClick={() => patch({ id: it._id, swapWith: items[k - 1]._id })} aria-label="Move up">&uarr;</button>
                  <button type="button" disabled={k === items.length - 1} onClick={() => patch({ id: it._id, swapWith: items[k + 1]._id })} aria-label="Move down">&darr;</button>
                  <button type="button" onClick={() => patch({ id: it._id, hidden: !it.hidden })}>{it.hidden ? 'Show' : 'Hide'}</button>
                  <button type="button" onClick={() => remove(it._id)}>Delete</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
