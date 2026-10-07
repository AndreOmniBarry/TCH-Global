'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSlidingPill } from '@/components/useSlidingPill';
import { fmtDate, fmtTime, parseLagosLocal } from '@/lib/church-time';

type Scheduled = { _id: string; title: string; slug: string; publishedAt: string };
const CATEGORIES = ['Faith', 'Hope', 'Grace', 'Community', 'Family', 'Prayer', 'Testimony'];
const PW_KEY = 'tch_write_pw';

function fmt(iso: string) {
  const ms = new Date(iso).getTime();
  return `${fmtDate(ms)}, ${fmtTime(ms)} WAT`;
}

export default function PublishPanel({ title, body }: { title: string; body: string }) {
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'now' | 'schedule'>('now');
  const [when, setWhen] = useState('');
  const [category, setCategory] = useState('Faith');
  const [excerpt, setExcerpt] = useState('');
  const [cover, setCover] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string; link?: string } | null>(null);
  const [queue, setQueue] = useState<Scheduled[] | null>(null);
  const modeRef = useSlidingPill<HTMLDivElement>(mode);

  useEffect(() => {
    try { setPassword(sessionStorage.getItem(PW_KEY) || ''); } catch {}
  }, []);

  const loadQueue = useCallback(async (pw: string) => {
    if (!pw) return;
    const res = await fetch('/api/publish', { headers: { 'x-write-password': pw } });
    if (res.ok) setQueue((await res.json()).posts);
  }, []);

  useEffect(() => { loadQueue(password); }, [password, loadQueue]);

  async function publish() {
    setStatus(null);
    if (!title.trim() || !body.trim()) return setStatus({ kind: 'error', text: 'Add a title and some text first.' });
    if (!password) return setStatus({ kind: 'error', text: 'Enter the publishing password.' });
    let publishAt: string | undefined;
    if (mode === 'schedule') {
      const d = new Date(parseLagosLocal(when));
      if (!when || Number.isNaN(d.getTime())) return setStatus({ kind: 'error', text: 'Pick a date and time to schedule.' });
      if (d.getTime() <= Date.now() + 60_000) return setStatus({ kind: 'error', text: 'Pick a time at least a minute from now, or choose Publish now.' });
      publishAt = d.toISOString();
    }
    setBusy(true);
    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-write-password': password },
        body: JSON.stringify({ title, body, excerpt, category, coverImageUrl: cover, publishAt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setStatus({ kind: 'error', text: data.error || 'Publishing failed.' });
      try { sessionStorage.setItem(PW_KEY, password); } catch {}
      setStatus(
        data.scheduled
          ? { kind: 'ok', text: `Scheduled for ${fmt(data.publishedAt)}. It will appear on the blog automatically.` }
          : { kind: 'ok', text: 'Published. It can take up to a minute to appear on the blog.', link: `/blog/${data.slug}` }
      );
      loadQueue(password);
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    const res = await fetch(`/api/publish?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'x-write-password': password } });
    if (res.ok) loadQueue(password);
    else setStatus({ kind: 'error', text: (await res.json().catch(() => ({}))).error || 'Could not cancel.' });
  }

  return (
    <div className="publish-panel">
      <h3>Publish</h3>
      <div className="publish-mode seg seg--glass" role="radiogroup" aria-label="When to publish" ref={modeRef}>
        <span className="seg-pill" aria-hidden="true" />
        <button type="button" role="radio" aria-checked={mode === 'now'} className={mode === 'now' ? 'on' : ''} onClick={() => setMode('now')}>Publish now</button>
        <button type="button" role="radio" aria-checked={mode === 'schedule'} className={mode === 'schedule' ? 'on' : ''} onClick={() => setMode('schedule')}>Schedule</button>
      </div>
      {mode === 'schedule' && (
        <>
          <label htmlFor="publish-when">Publish on (Benin City time, WAT)</label>
          <input id="publish-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </>
      )}
      <div className="publish-grid">
        <div>
          <label htmlFor="publish-category">Category</label>
          <select id="publish-category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="publish-cover">Cover image link (optional)</label>
          <input id="publish-cover" type="url" placeholder="https://…" value={cover} onChange={(e) => setCover(e.target.value)} />
        </div>
      </div>
      <label htmlFor="publish-excerpt">Short summary (optional — shown on the blog card)</label>
      <textarea id="publish-excerpt" rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
      <label htmlFor="publish-pw">Publishing password</label>
      <input id="publish-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="button" className="btn btn-primary" onClick={publish} disabled={busy} style={{ marginTop: 6 }}>
        {busy ? 'Working…' : mode === 'now' ? 'Publish now' : 'Schedule post'}
      </button>
      {status && (
        <p className="form-status" data-kind={status.kind} role="status">
          {status.text} {status.link && <a href={status.link}>View post &rarr;</a>}
        </p>
      )}

      {queue && queue.length > 0 && (
        <div className="publish-queue">
          <h4>Scheduled posts</h4>
          {queue.map((p) => (
            <div className="gather-row" key={p._id}>
              <div><div className="gather-name">{p.title}</div><div className="gather-place">{fmt(p.publishedAt)}</div></div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => cancel(p._id)}>Cancel</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
