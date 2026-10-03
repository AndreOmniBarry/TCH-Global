// PUDLIB! brand.
// The U is drawn as a vessel holding a play button (U for Uzor, play for
// the media inside); the "!" is a gold bookmark ribbon over a dot (the
// books). The app icon is that same U-play glyph on its own, so the mark
// reads the same at 16px and on a billboard.

function UGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 150 134" aria-hidden="true">
      <defs>
        <linearGradient id="pud-u-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <path d="M4 4h36v58a35 35 0 0 0 70 0V4h36v58a71 71 0 0 1-142 0z" fill="url(#pud-u-grad)" />
      <path d="M62 30v50l40-25z" fill="#f5c542" />
    </svg>
  );
}

function BangGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 44 120" aria-hidden="true">
      <path d="M6 6h32v66l-16-11-16 11z" fill="#f5c542" />
      <circle cx="22" cy="100" r="13" fill="#f5c542" />
    </svg>
  );
}

export function PudlibIcon({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} role="img" aria-label="PUDLIB!">
      <defs>
        <linearGradient id="pud-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1d1340" />
          <stop offset="1" stopColor="#0b0818" />
        </linearGradient>
        <linearGradient id="pud-tile-u" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#pud-tile)" />
      <rect x=".75" y=".75" width="62.5" height="62.5" rx="14.25" fill="none" stroke="rgb(255 255 255 / .12)" strokeWidth="1.5" />
      <path d="M14 12h9v20a9 9 0 0 0 18 0V12h9v20a18 18 0 0 1-36 0z" fill="url(#pud-tile-u)" />
      <path d="M28.5 23.5v14l11.5-7z" fill="#f5c542" />
      <path d="M44 44h8v9l-4-2.6-4 2.6z" fill="#f5c542" opacity=".9" />
    </svg>
  );
}

export function PudlibWordmark({ className }: { className?: string }) {
  return (
    <span className={`pudlib-wordmark ${className ?? ''}`} role="img" aria-label="PUDLIB!">
      <span aria-hidden="true">P</span>
      <UGlyph className="pudlib-u" />
      <span aria-hidden="true">D</span>
      <span className="pudlib-lib" aria-hidden="true">LIB</span>
      <BangGlyph className="pudlib-bang" />
    </span>
  );
}

export default function PudlibLogo({ size = 40 }: { size?: number }) {
  return (
    <span className="pudlib-logo" style={{ ['--pud-size' as string]: `${size}px` }}>
      <PudlibWordmark />
    </span>
  );
}
