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

export function HollowRing({ size = 120, color = 'var(--accent-cyan)', strokeWidth = 16, className, style }: ShapeProps) {
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

export function Polygon({ size = 100, color = 'var(--accent-lavender)', className, style, filled = false }: ShapeProps & { filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} style={style} aria-hidden="true">
      <polygon
        points="50,4 96,36 78,92 22,92 4,36"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={filled ? 0 : 7}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** An organic, irregular blob (not a perfect circle) — the "fluid blob"
 * shape from the Neo-Memphis spec. Solid fill, meant to be bold and
 * visible rather than a subtle background wash (that's what .blob-field
 * already does elsewhere on the site — this is a different, more
 * graphic/illustrative element). */
export function FluidBlob({ size = 200, color = 'var(--accent-cyan)', className, style }: ShapeProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" className={className} style={style} aria-hidden="true">
      <path
        fill={color}
        d="M45.4,-59.4C58.6,-49.8,68.5,-35.1,72.8,-18.7C77.1,-2.3,75.8,15.9,68.2,30.8C60.6,45.8,46.7,57.6,31.1,64.5C15.5,71.5,-1.8,73.7,-18.9,70.3C-36,66.9,-52.9,57.9,-63.6,44.1C-74.3,30.3,-78.8,11.6,-76.4,-5.9C-74,-23.4,-64.7,-39.7,-51.6,-49.6C-38.5,-59.5,-21.5,-63,-3.7,-58.4C14.1,-53.9,32.2,-69,45.4,-59.4Z"
        transform="translate(100 100)"
      />
    </svg>
  );
}

let shapeIdCounter = 0;
function nextShapeId(prefix: string) {
  shapeIdCounter += 1;
  return `${prefix}-${shapeIdCounter}`;
}

/** A faceted crystal shard — an irregular gem-cut polygon built from
 * several adjoining triangular facets, each a slightly different tint
 * of the same color so it reads as light catching cut glass rather than
 * a flat single-tone shape. Replaces the plain hollow-ring/pill look in
 * non-hero sections with something that has real dimensional weight. */
export function CrystalShard({ size = 160, color = 'var(--accent-cyan)', className, style }: ShapeProps) {
  const id = nextShapeId('shard');
  return (
    <svg width={size} height={size} viewBox="0 0 160 220" className={className} style={style} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-a`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.95" />
          <stop offset="100%" stopColor={color} stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="100%" stopColor={color} stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <polygon points="80,4 138,58 150,140 90,216 30,168 10,80" fill={`url(#${id}-a)`} />
      <polygon points="80,4 138,58 90,100 42,60" fill={`url(#${id}-b)`} />
      <polygon points="10,80 42,60 90,100 30,168" fill={color} opacity="0.28" />
      <polygon points="150,140 90,216 30,168 90,100" fill="#ffffff" opacity="0.18" />
    </svg>
  );
}

/** A soft multi-stop mesh-gradient orb with real blur depth — layered
 * behind sharper shapes (rings, shards) to give a section's decorative
 * cluster a sense of atmosphere/depth rather than everything sitting on
 * one flat plane. */
export function MeshOrb({ size = 240, color = 'var(--accent-lavender)', className, style }: ShapeProps) {
  const id = nextShapeId('mesh');
  return (
    <svg width={size} height={size} viewBox="0 0 240 240" className={className} style={style} aria-hidden="true">
      <defs>
        <radialGradient id={id} cx="38%" cy="34%" r="65%">
          <stop offset="0%" stopColor={color} stopOpacity="0.9" />
          <stop offset="55%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="120" cy="120" r="118" fill={`url(#${id})`} />
    </svg>
  );
}
