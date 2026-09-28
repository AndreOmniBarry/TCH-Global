// Neo-Memphis decorative primitives — hollow rings, pills, dotted grids.
// Pure presentational SVG, colored via `color` (defaults to a CSS var so
// they follow light/dark automatically, same tokens as the rest of the
// site: --accent-cyan / --accent-violet / --accent-lavender / --accent-gold).
// These are purely decorative (aria-hidden) and never affect layout —
// always absolutely positioned by the caller.

type ShapeProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
};

export function HollowRing({ size = 120, color = 'var(--accent-cyan)', strokeWidth = 10, className, style }: ShapeProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <circle cx="60" cy="60" r={60 - strokeWidth / 2} fill="none" stroke={color} strokeWidth={strokeWidth} />
    </svg>
  );
}

export function Pill({ width = 140, height = 56, color = 'var(--accent-gold)', className, style }: ShapeProps & { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} style={style} aria-hidden="true">
      <rect x="0" y="0" width={width} height={height} rx={height / 2} fill={color} />
    </svg>
  );
}

export function DottedGrid({ size = 140, color = 'var(--accent-violet)', className, style }: ShapeProps) {
  const cols = 5;
  const rows = 5;
  const gap = size / (cols + 1);
  const dots = [];
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      dots.push(<circle key={`${r}-${c}`} cx={c * gap} cy={r * gap} r={2.5} fill={color} />);
    }
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} style={style} aria-hidden="true">
      {dots}
    </svg>
  );
}

export function Polygon({ size = 100, color = 'var(--accent-lavender)', className, style }: ShapeProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} style={style} aria-hidden="true">
      <polygon points="50,4 96,36 78,92 22,92 4,36" fill="none" stroke={color} strokeWidth="7" strokeLinejoin="round" />
    </svg>
  );
}
