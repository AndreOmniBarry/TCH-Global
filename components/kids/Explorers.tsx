'use client';

import { useEffect, useState } from 'react';
import { useMember } from '@/components/members/useMember';
import Buddy, { BUDDIES, BUDDY_LABEL } from './Buddy';

type Explorer = { id: string; name: string; avatar?: string };
const LOCAL = 'tch_explorers';
const ACTIVE = 'tch_kid_active';

const newId = () => 'k_' + Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => b.toString(16).padStart(2, '0')).join('');
const readLocal = (): Explorer[] => { try { return JSON.parse(localStorage.getItem(LOCAL) || '[]'); } catch { return []; } };
const writeLocal = (l: Explorer[]) => { try { localStorage.setItem(LOCAL, JSON.stringify(l)); } catch {} };

/** "Today's explorer": children make their own explorer (first name + a
 * buddy) right here. On a device it works signed out; once a grown-up signs
 * in, the explorers move into the family account with their stars. */
export default function Explorers({ active, onPick }: { active: string; onPick: (id: string) => void }) {
  const { member, loading, setMember } = useMember();
  const family = Boolean(member && !member.teen);
  const [local, setLocal] = useState<Explorer[]>([]);
  const [making, setMaking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [buddy, setBuddy] = useState<string>('lion');
  const list: Explorer[] = family ? (member!.kids ?? []) : local;

  useEffect(() => { setLocal(readLocal()); }, []);

  // A grown-up just signed in: bring this device's explorers into the family.
  useEffect(() => {
    if (!family) return;
    const l = readLocal();
    if (!l.length) return;
    fetch('/api/kids', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ explorers: l }) })
      .then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.member) { setMember(d.member); writeLocal([]); setLocal([]); } }).catch(() => {});
  }, [family]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep a valid explorer selected.
  useEffect(() => {
    if (loading) return;
    if (!list.length) { if (active) onPick(''); return; }
    if (list.some((e) => e.id === active)) return;
    let saved = '';
    try { saved = localStorage.getItem(ACTIVE) || ''; } catch {}
    onPick(list.some((e) => e.id === saved) ? saved : list[0].id);
  }, [loading, list.map((e) => e.id).join(), active]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (id: string) => { onPick(id); try { localStorage.setItem(ACTIVE, id); } catch {} };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const first = name.trim().split(/\s+/)[0].slice(0, 24);
    if (first.length < 2) return;
    const x: Explorer = { id: newId(), name: first[0].toUpperCase() + first.slice(1), avatar: buddy };
    if (family) {
      const r = await fetch('/api/kids', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(x) }).catch(() => null);
      const d = r?.ok ? await r.json() : null;
      if (d?.member) setMember(d.member);
    } else {
      const l = [...local, x].slice(0, 8);
      writeLocal(l); setLocal(l);
    }
    pick(x.id);
    setMaking(false); setName(''); setBuddy('lion');
  }

  async function remove(x: Explorer) {
    if (!confirm(`Say goodbye to ${x.name}’s explorer? Their stars will be cleared.`)) return;
    if (family) {
      const r = await fetch('/api/kids', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: x.id }) }).catch(() => null);
      const d = r?.ok ? await r.json() : null;
      if (d?.member) setMember(d.member);
    } else {
      const l = local.filter((e) => e.id !== x.id);
      writeLocal(l); setLocal(l);
    }
  }

  if (loading) return <div className="kx kx--loading" aria-hidden="true" />;

  return (
    <div className="kx">
      {making ? (
        <form className="kx-make" onSubmit={save}>
          <h3>Make your explorer</h3>
          <label htmlFor="kx-name">What&rsquo;s your name?</label>
          <input id="kx-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="First name" maxLength={24} autoComplete="off" autoFocus required minLength={2} />
          <span className="kx-label">Pick your buddy</span>
          <div className="kx-buddies" role="radiogroup" aria-label="Pick your buddy">
            {BUDDIES.map((b) => (
              <button key={b} type="button" role="radio" aria-checked={buddy === b} aria-label={BUDDY_LABEL[b]} className={buddy === b ? 'on' : ''} onClick={() => setBuddy(b)}><Buddy name={b} size={52} /></button>
            ))}
          </div>
          <div className="kx-make-actions">
            <button type="submit" className="kx-go" disabled={name.trim().length < 2}>Let&rsquo;s go!</button>
            {list.length > 0 && <button type="button" className="kx-cancel" onClick={() => setMaking(false)}>Cancel</button>}
          </div>
        </form>
      ) : list.length === 0 ? (
        <button type="button" className="kx-start" onClick={() => setMaking(true)}>
          <span className="kx-start-faces" aria-hidden="true"><Buddy name="lion" size={40} /><Buddy name="lamb" size={40} /><Buddy name="dove" size={40} /></span>
          <span><b>Who&rsquo;s on today&rsquo;s adventure?</b><em>Make your explorer and collect your stars</em></span>
        </button>
      ) : (
        <div className="kx-row">
          <span className="kx-title">Today&rsquo;s explorer</span>
          <div className="kx-tiles" role="radiogroup" aria-label="Today's explorer">
            {list.map((x) => (
              <span key={x.id} className="kx-tile-wrap">
                <button type="button" role="radio" aria-checked={active === x.id} className={`kx-tile${active === x.id ? ' on' : ''}`} onClick={() => pick(x.id)}>
                  <Buddy name={x.avatar} size={40} /><span>{x.name}</span>
                </button>
                {editing && <button type="button" className="kx-del" onClick={() => remove(x)} aria-label={`Remove ${x.name}`}>&times;</button>}
              </span>
            ))}
            {list.length < 8 && !editing && <button type="button" className="kx-add" onClick={() => setMaking(true)} aria-label="New explorer">+</button>}
          </div>
          <button type="button" className="kx-edit" onClick={() => setEditing((v) => !v)}>{editing ? 'Done' : 'Edit'}</button>
        </div>
      )}
      {!member && (
        <a className="kd-grownups" href="/account?mode=signup&next=/kids">
          <b>Grown-ups:</b> {local.length ? `keep ${local.map((e) => e.name).join(' and ')}’s stars safe` : 'save your children’s stars'} with a free family account, and they&rsquo;ll join your family&rsquo;s <em>Year in the Word</em> &rarr;
        </a>
      )}
    </div>
  );
}
