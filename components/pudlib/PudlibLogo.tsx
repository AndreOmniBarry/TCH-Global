// PUDLIB! brand mark: an app-style icon (open book with a play button on
// the spine — library + media) and the wordmark with a gold "!".
export function PudlibIcon({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} role="img" aria-label="PUDLIB!">
      <defs>
        <linearGradient id="pudlib-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#0891b2" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#pudlib-bg)" />
      <path d="M32 19c-4.5-3.2-10.5-4.2-17-3.4v29.2c6.5-.8 12.5.2 17 3.4V19z" fill="#fff" />
      <path d="M32 19c4.5-3.2 10.5-4.2 17-3.4v29.2c-6.5-.8-12.5.2-17 3.4V19z" fill="#e9e3ff" />
      <circle cx="32" cy="31" r="9" fill="#f5c542" stroke="#fff" strokeWidth="2" />
      <path d="M29.5 26.8v8.4l7-4.2z" fill="#1d1340" />
    </svg>
  );
}

export function PudlibWordmark({ className }: { className?: string }) {
  return (
    <span className={`pudlib-wordmark ${className ?? ''}`}>
      PUD<em>LIB</em><b>!</b>
    </span>
  );
}

export default function PudlibLogo({ size = 40 }: { size?: number }) {
  return (
    <span className="pudlib-logo">
      <PudlibIcon size={size} />
      <PudlibWordmark />
    </span>
  );
}
