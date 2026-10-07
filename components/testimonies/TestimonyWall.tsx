'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSlidingPill } from '@/components/useSlidingPill';

export type TestimonyItem = { _id: string; name: string; quote: string; image: string | null; submittedAt: string | null; category?: string | null; featured?: boolean };

const PAGE = 6;

function when(iso: string | null) {
  if (!iso) return '';
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 1) return 'Today';
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const Spark = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.2 6.6L21 11l-6.8 2.4L12 20l-2.2-6.6L3 11l6.8-2.4z" fill="currentColor" /></svg>
);

/** Testimonies, live from Sanity: a rotating Miracles spotlight, then a
 * filterable wall (Recent, Miracles, or a category) with "show more". */
export default function TestimonyWall({ items }: { items: TestimonyItem[] }) {
  const miracles = useMemo(() => items.filter((t) => t.featured), [items]);
  const categories = useMemo(() => Array.from(new Set(items.map((t) => t.category).filter(Boolean))) as string[], [items]);
  const [tab, setTab] = useState<string>('recent');
  const [shown, setShown] = useState(PAGE);
  const [spot, setSpot] = useState(0);
  const [paused, setPaused] = useState(false);
  const tabsRef = useSlidingPill<HTMLDivElement>(tab);

  useEffect(() => {
    if (miracles.length < 2 || paused) return;
    const t = window.setInterval(() => setSpot((i) => (i + 1) % miracles.length), 7000);
    return () => window.clearInterval(t);
  }, [miracles.length, paused]);

  const list = tab === 'recent' ? items : tab === 'miracles' ? miracles : items.filter((t) => t.category === tab);
  const current = miracles[spot % Math.max(1, miracles.length)];

  return (
    <div className="tw">
      {current && (
        <figure className="tw-spot" onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)} aria-live="polite">
          <span className="tw-spot-tag"><Spark /> Miracle report</span>
          <blockquote key={current._id}>&ldquo;{current.quote}&rdquo;</blockquote>
          <figcaption>
            <strong>{current.name}</strong>
            {current.category && <span> &middot; {current.category}</span>}
            {current.submittedAt && <span> &middot; {when(current.submittedAt)}</span>}
          </figcaption>
          {miracles.length > 1 && (
            <div className="tw-dots" role="tablist" aria-label="Miracle reports">
              {miracles.map((m, i) => (
                <button key={m._id} type="button" role="tab" aria-selected={i === spot} aria-label={`Report ${i + 1}`} className={i === spot ? 'on' : ''} onClick={() => setSpot(i)} />
              ))}
            </div>
          )}
        </figure>
      )}

      <div className="tw-tabs seg seg--glass" role="tablist" ref={tabsRef}>
        <span className="seg-pill" aria-hidden="true" />
        {[['recent', 'Recent'], ...(miracles.length ? [['miracles', 'Miracles']] : []), ...categories.map((c) => [c, c])].map(([k, label]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setShown(PAGE); }}>{label}</button>
        ))}
      </div>

      <div className="tw-grid">
        {list.slice(0, shown).map((t) => (
          <article className={`testimony-card tw-card${t.featured ? ' is-miracle' : ''}`} key={t._id}>
            {t.featured && <span className="tw-badge"><Spark /> Miracle</span>}
            <p className="testimony-quote">&ldquo;{t.quote}&rdquo;</p>
            <div className="tw-meta">
              <span className="testimony-name">{t.name}</span>
              <span>{[t.category, when(t.submittedAt)].filter(Boolean).join(' · ')}</span>
            </div>
          </article>
        ))}
      </div>
      {list.length > shown && (
        <button type="button" className="tw-more" onClick={() => setShown((n) => n + PAGE)}>Show more testimonies ({list.length - shown})</button>
      )}
    </div>
  );
}
