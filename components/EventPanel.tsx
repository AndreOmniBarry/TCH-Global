'use client';

import { useCallback, useEffect, useState } from 'react';
import { fmtDate, fmtTime, parseLagosLocal } from '@/lib/church-time';

type Ev = { _id: string; title: string; startsAt: string; endsAt: string | null; location: string | null };
const PW_KEY = 'tch_write_pw';

// Add or cancel calendar events from /write, same password as posting.
export default function EventPanel() {
  const [password, setPassword] = useState('');
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [flyer, setFlyer] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [list, setList] = useState<Ev[] | null>(null);

  useEffect(() => { try { setPassword(sessionStorage.getItem(PW_KEY) || ''); } catch {} }, []);

  const load = useCallback(async (pw: string) => {
    if (!pw) return;
    const res = await fetch('/api/events', { headers: { 'x-write-password': pw } });
    if (res.ok) setList((await res.json()).events);
  }, []);
  useEffect(() => { load(password); }, [password, load]);

  async function save() {
    setStatus(null);
    if (!title.trim()) return setStatus({ kind: 'error', text: 'Give the event a name.' });
    const s = parseLagosLocal(start);
    if (!Number.isFinite(s)) return setStatus({ kind: 'error', text: 'Pick when it starts.' });
    const e = end ? parseLagosLocal(end) : NaN;
    if (end && (!Number.isFinite(e) || e <= s)) return setStatus({ kind: 'error', text: 'The end must be after the start.' });
    if (!password) return setStatus({ kind: 'error', text: 'Enter the publishing password.' });
    setBusy(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-write-password': password },
        body: JSON.stringify({
          title, description, location, link, flyerUrl: flyer,
          startsAt: new Date(s).toISOString(), endsAt: Number.isFinite(e) ? new Date(e).toISOString() : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setStatus({ kind: 'error', text: data.error || 'Could not save the event.' });
      try { sessionStorage.setItem(PW_KEY, password); } catch {}
      setStatus({ kind: 'ok', text: `Added for ${fmtDate(s)}, ${fmtTime(s)} WAT. It shows on the homepage calendar within a minute.` });
      setTitle(''); setStart(''); setEnd(''); setDescription(''); setLink(''); setFlyer('');
      load(password);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Remove this event from the calendar?')) return;
    const res = await fetch(`/api/events?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'x-write-password': password } });
    if (res.ok) load(password);
    else setStatus({ kind: 'error', text: (await res.json().catch(() => ({}))).error || 'Could not remove.' });
  }

  return (
    <div className="publish-panel" id="add-event">
      <h3>Add an event to the calendar</h3>
      <p className="publish-hint">Conferences, revivals, outreach days. Weekly services are already on the calendar. Times are Benin City time (WAT).</p>
      <label htmlFor="ev-title">Event name</label>
      <input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Holy Ghost Revival" />
      <div className="publish-grid">
        <div>
          <label htmlFor="ev-start">Starts (WAT)</label>
          <input id="ev-start" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <label htmlFor="ev-end">Ends (optional)</label>
          <input id="ev-end" type="datetime-local" value={end} min={start} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      <label htmlFor="ev-loc">Location</label>
      <input id="ev-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Grace Dome Church" />
      <label htmlFor="ev-desc">Short description (optional)</label>
      <textarea id="ev-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      <div className="publish-grid">
        <div>
          <label htmlFor="ev-link">Registration / info link (optional)</label>
          <input id="ev-link" type="url" placeholder="https://…" value={link} onChange={(e) => setLink(e.target.value)} />
        </div>
        <div>
          <label htmlFor="ev-flyer">Flyer image link (optional)</label>
          <input id="ev-flyer" type="url" placeholder="https://…" value={flyer} onChange={(e) => setFlyer(e.target.value)} />
        </div>
      </div>
      <label htmlFor="ev-pw">Publishing password</label>
      <input id="ev-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="button" className="btn btn-primary" onClick={save} disabled={busy} style={{ marginTop: 6 }}>{busy ? 'Saving…' : 'Add to calendar'}</button>
      {status && <p className="form-status" data-kind={status.kind} role="status">{status.text}</p>}

      {list && list.length > 0 && (
        <div className="publish-queue">
          <h4>Upcoming events</h4>
          {list.map((ev) => {
            const s = new Date(ev.startsAt).getTime();
            return (
              <div className="gather-row" key={ev._id}>
                <div><div className="gather-name">{ev.title}</div><div className="gather-place">{fmtDate(s)} · {fmtTime(s)} WAT{ev.location ? ` · ${ev.location}` : ''}</div></div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(ev._id)}>Remove</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
