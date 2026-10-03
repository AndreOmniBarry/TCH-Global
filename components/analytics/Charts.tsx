'use client';

import { useMemo, useRef, useState } from 'react';

// Dashboard charts for /admin/analytics. Plain SVG, no chart library,
// coloured from the site's CSS tokens so light/dark both work.

type Point = { date: string; views: number };
const fmt = (n: number) => (n >= 10000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString());
const shortDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

export function Sparkline({ data, color = 'var(--accent-cyan)' }: { data: number[]; color?: string }) {
  const w = 120, h = 34;
  const max = Math.max(1, ...data);
  const pts = data.map((v, i) => [data.length > 1 ? (i / (data.length - 1)) * w : w / 2, h - 3 - (v / max) * (h - 6)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const id = useMemo(() => `sp${Math.random().toString(36).slice(2, 8)}`, []);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="an-spark" aria-hidden="true" preserveAspectRatio="none">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".35" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      {data.length > 1 && <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function KpiCard({ label, value, delta, spark, note }: { label: string; value: number | string; delta?: number | null; spark?: number[]; note?: string }) {
  const up = (delta ?? 0) >= 0;
  return (
    <div className="an-card an-kpi">
      <div className="an-kpi-label">{label}</div>
      <div className="an-kpi-value">{typeof value === 'number' ? fmt(value) : value}</div>
      <div className="an-kpi-foot">
        {delta === null || delta === undefined ? (
          <span className="an-muted">{note ?? 'No prior period'}</span>
        ) : (
          <span className={`an-delta ${up ? 'up' : 'down'}`}>
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d={up ? 'M5 1l4 6H1z' : 'M5 9L1 3h8z'} fill="currentColor" /></svg>
            {Math.abs(delta)}% <span className="an-muted">vs prior period</span>
          </span>
        )}
      </div>
      {spark && spark.length > 1 && <Sparkline data={spark} />}
    </div>
  );
}

/** Area chart with the previous period ghosted behind it (the
 * comparison view Meta Business Suite and LinkedIn page analytics use). */
export function AreaCompare({ current, previous, height = 240 }: { current: Point[]; previous?: Point[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const W = 720, pad = { t: 16, r: 12, b: 28, l: 40 };
  const iw = W - pad.l - pad.r, ih = height - pad.t - pad.b;
  const rawMax = Math.max(1, ...current.map((d) => d.views), ...(previous ?? []).map((d) => d.views));
  const step = niceStep(rawMax / 4);
  const max = Math.ceil(rawMax / step) * step;
  const x = (i: number) => pad.l + (current.length > 1 ? (i / (current.length - 1)) * iw : iw / 2);
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const path = (s: Point[]) => s.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.views).toFixed(1)}`).join(' ');
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const labelEvery = Math.ceil(current.length / 7);

  function move(e: React.PointerEvent<SVGSVGElement>) {
    const r = ref.current!.getBoundingClientRect();
    const rel = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((rel - pad.l) / iw) * (current.length - 1));
    setHover(Math.max(0, Math.min(current.length - 1, i)));
  }
  const h = hover !== null ? current[hover] : null;
  const hp = hover !== null && previous ? previous[hover] : null;

  return (
    <div className="an-chart">
      <div className="an-legend">
        <span><i style={{ background: 'var(--accent-cyan)' }} />This period</span>
        {previous && <span><i className="dash" />Previous period</span>}
      </div>
      <div style={{ position: 'relative' }}>
        <svg ref={ref} viewBox={`0 0 ${W} ${height}`} style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'pan-y' }} onPointerMove={move} onPointerLeave={() => setHover(null)} role="img" aria-label="Views over time">
          <defs>
            <linearGradient id="an-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--accent-cyan)" stopOpacity=".32" />
              <stop offset="1" stopColor="var(--accent-violet)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--border-glass)" strokeDasharray={t ? '2,4' : undefined} />
              <text x={pad.l - 8} y={y(t) + 3} fontSize="10" textAnchor="end" fill="var(--text-faint)" fontFamily="var(--font-mono)">{fmt(t)}</text>
            </g>
          ))}
          {previous && <path d={path(previous)} fill="none" stroke="var(--text-faint)" strokeWidth="1.5" strokeDasharray="4,4" opacity=".7" />}
          <path d={`${path(current)} L${x(current.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill="url(#an-area)" />
          <path d={path(current)} fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {current.map((d, i) => i % labelEvery === 0 || i === current.length - 1 ? (
            <text key={d.date} x={x(i)} y={height - 8} fontSize="10" textAnchor="middle" fill="var(--text-faint)" fontFamily="var(--font-mono)">{shortDate(d.date)}</text>
          ) : null)}
          {h && hover !== null && (
            <>
              <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} stroke="var(--text-faint)" strokeDasharray="3,3" />
              <circle cx={x(hover)} cy={y(h.views)} r="5" fill="var(--accent-cyan)" stroke="var(--surface-low, #fff)" strokeWidth="2" />
            </>
          )}
        </svg>
        {h && hover !== null && (
          <div className="an-tip" style={{ left: `${(x(hover) / W) * 100}%` }}>
            <strong>{shortDate(h.date)}</strong>
            <span>{fmt(h.views)} views</span>
            {hp && <span className="an-muted">prev: {fmt(hp.views)}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function niceStep(raw: number) {
  if (raw <= 1) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

/** Ranked horizontal bars (top content). */
export function BarList({ rows, color = 'var(--accent-violet)', unit = 'views' }: { rows: { label: string; value: number; href?: string }[]; color?: string; unit?: string }) {
  if (!rows.length) return <p className="an-empty">No data yet.</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ol className="an-bars">
      {rows.map((r, i) => (
        <li key={`${r.label}-${i}`}>
          <span className="an-bar-rank">{i + 1}</span>
          <div className="an-bar-body">
            <div className="an-bar-fill" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: color }} />
            <span className="an-bar-label" title={r.label}>{r.label}</span>
          </div>
          <span className="an-bar-value">{fmt(r.value)} <small>{unit}</small></span>
        </li>
      ))}
    </ol>
  );
}

/** Share-of-total donut (content mix). */
export function Donut({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  const [active, setActive] = useState<number | null>(null);
  const R = 52, C = 2 * Math.PI * R;
  let acc = 0;
  const shown = active !== null ? parts[active] : null;
  return (
    <div className="an-donut">
      <svg viewBox="0 0 140 140" role="img" aria-label="Content mix">
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--border-glass)" strokeWidth="18" />
        {total > 0 && parts.map((p, i) => {
          const len = (p.value / total) * C;
          const el = (
            <circle key={p.label} cx="70" cy="70" r={R} fill="none" stroke={p.color} strokeWidth={active === i ? 22 : 18}
              strokeDasharray={`${Math.max(0, len - 2)} ${C}`} strokeDashoffset={-acc} transform="rotate(-90 70 70)"
              onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)} style={{ transition: 'stroke-width .15s' }} />
          );
          acc += len;
          return el;
        })}
        <text x="70" y="68" textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--text-high)">{fmt(shown ? shown.value : total)}</text>
        <text x="70" y="86" textAnchor="middle" fontSize="9" fill="var(--text-faint)" fontFamily="var(--font-mono)">{shown ? shown.label.toUpperCase() : 'TOTAL'}</text>
      </svg>
      <ul className="an-legend-list">
        {parts.map((p, i) => (
          <li key={p.label} onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)}>
            <i style={{ background: p.color }} />
            <span>{p.label}</span>
            <b>{total ? Math.round((p.value / total) * 100) : 0}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Engagement funnel: each stage as a share of the first. */
export function Funnel({ stages }: { stages: { label: string; value: number }[] }) {
  const top = Math.max(1, stages[0]?.value ?? 1);
  return (
    <div className="an-funnel">
      {stages.map((s, i) => {
        const pct = (s.value / top) * 100;
        const prev = i ? stages[i - 1].value : 0;
        return (
          <div className="an-funnel-row" key={s.label}>
            <div className="an-funnel-head">
              <span>{s.label}</span>
              <span><b>{fmt(s.value)}</b> <span className="an-muted">{i ? `${prev ? Math.round((s.value / prev) * 100) : 0}% of previous step` : '100%'}</span></span>
            </div>
            <div className="an-funnel-track"><div style={{ width: `${Math.max(1.5, pct)}%`, opacity: 1 - i * 0.16 }} /></div>
          </div>
        );
      })}
    </div>
  );
}

/** Day-of-week bars: which days the audience shows up. */
export function WeekdayBars({ data }: { data: Point[] }) {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const sums = new Array(7).fill(0);
  data.forEach((d) => { sums[new Date(`${d.date}T00:00:00`).getDay()] += d.views; });
  const max = Math.max(1, ...sums);
  const best = sums.indexOf(Math.max(...sums));
  return (
    <div className="an-week">
      {sums.map((v, i) => (
        <div key={i} className={`an-week-col${i === best && v > 0 ? ' best' : ''}`} title={`${names[i]}: ${v} views`}>
          <span className="an-week-val">{fmt(v)}</span>
          <div className="an-week-bar"><div style={{ height: `${(v / max) * 100}%` }} /></div>
          <span className="an-week-name">{names[i]}</span>
        </div>
      ))}
    </div>
  );
}
