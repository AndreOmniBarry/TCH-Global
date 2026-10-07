// Animated play/pause mark: two halves whose clip-paths morph between a
// play triangle and pause bars (works in every browser, no emoji, no
// icon swap). Wrap it in a button; size and colour come from CSS vars.
export default function MotionPlay({ playing = false, size, ring = false, className = '' }: { playing?: boolean; size?: number; ring?: boolean; className?: string }) {
  return (
    <span
      className={`mplay${playing ? ' is-playing' : ''}${ring ? ' has-ring' : ''} ${className}`}
      style={size ? ({ ['--mp-size' as string]: `${size}px` } as React.CSSProperties) : undefined}
      aria-hidden="true"
    >
      {ring && <span className="mplay-ring" />}
      <span className="mplay-glyph">
        <span className="mplay-a" />
        <span className="mplay-b" />
      </span>
    </span>
  );
}
