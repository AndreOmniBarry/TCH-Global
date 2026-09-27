'use client';

import { useState, useRef, useMemo } from 'react';

type Point = { date: string; views: number };

/** A minimal single-series line chart for "views over time" — no
 * charting library, just inline SVG, sized to match this admin page.
 * Single series needs no legend (the section title already names it).
 * Uses the site's existing CSS tokens so it follows light/dark mode
 * automatically instead of hardcoding colors. */
export default function TrendChart({ data, height = 160 }: { data: Point[]; height?: number }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const width = 600;
  const padding = { top: 12, right: 12, bottom: 24, left: 12 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const maxViews = Math.max(1, ...data.map((d) => d.views));

  const points = useMemo(
    () =>
      data.map((d, i) => ({
        x: padding.left + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2),
        y: padding.top + innerH - (d.views / maxViews) * innerH,
        ...d,
      })),
    [data, innerW, innerH, maxViews]
  );

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || points.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    let closest = 0;
    let closestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });
    setHoverIndex(closest);
  }

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const showEveryNthLabel = Math.ceil(data.length / 7);

  if (data.every((d) => d.views === 0)) {
    return <p style={{ fontSize: '.85rem', color: 'var(--text-faint)' }}>No views yet in this window.</p>;
  }

  return (
    <div style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height, display: 'block', overflow: 'visible' }}
        onPointerMove={handleMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        {/* Recessive baseline */}
        <line
          x1={padding.left}
          y1={padding.top + innerH}
          x2={width - padding.right}
          y2={padding.top + innerH}
          stroke="var(--border-glass)"
          strokeWidth={1}
        />

        <path d={path} fill="none" stroke="var(--accent-cyan)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {hovered && (
          <>
            <line
              x1={hovered.x}
              y1={padding.top}
              x2={hovered.x}
              y2={padding.top + innerH}
              stroke="var(--border-glass)"
              strokeWidth={1}
              strokeDasharray="3,3"
            />
            <circle cx={hovered.x} cy={hovered.y} r={4} fill="var(--accent-cyan)" stroke="var(--surface-low)" strokeWidth={2} />
          </>
        )}

        {points.map((p, i) =>
          i % showEveryNthLabel === 0 ? (
            <text
              key={p.date}
              x={p.x}
              y={height - 6}
              fontSize={9}
              fontFamily="var(--font-mono)"
              fill="var(--text-faint)"
              textAnchor="middle"
            >
              {p.date.slice(5)}
            </text>
          ) : null
        )}
      </svg>

      {hovered && (
        <div
          style={{
            position: 'absolute',
            left: `${(hovered.x / width) * 100}%`,
            top: 0,
            transform: 'translate(-50%, -110%)',
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-glass)',
            borderRadius: 8,
            padding: '4px 8px',
            fontSize: '.72rem',
            fontFamily: 'var(--font-mono)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {hovered.date} &middot; {hovered.views} {hovered.views === 1 ? 'view' : 'views'}
        </div>
      )}
    </div>
  );
}
