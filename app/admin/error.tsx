'use client';

// Any admin page that fails shows this instead of an endless loader.
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  if (typeof document !== 'undefined') {
    document.documentElement.classList.remove('splash-lock');
    document.getElementById('splash')?.classList.add('splash--gone');
  }
  return (
    <section className="section">
      <div className="container" style={{ maxWidth: 640 }}>
        <div className="section-header">
          <span className="eyebrow">Admin</span>
          <h2 style={{ textTransform: 'none', fontSize: '1.6rem' }}>This page hit a problem</h2>
          <p>Please send a screenshot of this to your web team.</p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '.8rem', padding: 14, borderRadius: 12, background: 'var(--surface-low)', border: '1px solid var(--border-glass)' }}>{error.message || 'Unknown error'}{error.digest ? `\nRef: ${error.digest}` : ''}</pre>
          <button type="button" className="btn btn-primary" onClick={reset}>Try again</button>
        </div>
      </div>
    </section>
  );
}
