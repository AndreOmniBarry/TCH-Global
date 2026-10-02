'use client';

import { markdownToHtml } from '@/lib/markdown';
import PublishPanel from '@/components/PublishPanel';

import { useMemo, useRef, useState } from 'react';

// A minimal, dependency-free markdown-lite syntax, chosen to map
// directly onto the classes already used across the site's articles
// (post-body h2/h3, .pull-quote, .bible-ref) — so what you see in the
// preview here is exactly what a real post looks like.
//
// ## Heading           -> <h2>
// ### Subheading       -> <h3>
// **bold**              -> <strong>
// *italic*               -> <em>
// __underline__          -> <u>
// > Pull quote text     -> <blockquote class="pull-quote">
// [[bible:John 3:16]]    -> tappable Bible verse reference
// ![alt text](url)       -> image (figure.post-image, matches published posts)
// blank line             -> paragraph break
const parseToHtml = markdownToHtml;

type ProofreadMatch = {
  message: string;
  shortMessage?: string;
  offset: number;
  length: number;
  replacements: { value: string }[];
  context: { text: string; offset: number; length: number };
};

const TOOLBAR_ACTIONS: { label: string; wrap: [string, string] | null; prefix?: string }[] = [
  { label: 'H2', wrap: null, prefix: '## ' },
  { label: 'H3', wrap: null, prefix: '### ' },
  { label: 'Bold', wrap: ['**', '**'] },
  { label: 'Italic', wrap: ['*', '*'] },
  { label: 'Underline', wrap: ['__', '__'] },
  { label: 'Pull Quote', wrap: null, prefix: '> ' },
  { label: 'Bible Verse', wrap: ['[[bible:', ']]'] },
];

export default function ComposeEditor() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState(
    'Start writing here.\n\nSelect text and use the toolbar to format it — or type the shortcuts directly: ## for a heading, **bold**, *italic*, [[bible:John 3:16]] for a tappable verse.'
  );
  const [matches, setMatches] = useState<ProofreadMatch[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const previewHtml = useMemo(() => parseToHtml(body), [body]);
  const plainText = useMemo(
    () => body.replace(/\[\[bible:[^\]]+\]\]/g, '').replace(/!\[[^\]]*\]\([^)]+\)/g, '').replace(/[*_>#]/g, ''),
    [body]
  );

  function insertImage() {
    const el = textareaRef.current;
    if (!el) return;
    const url = window.prompt('Image URL (paste a link to an already-hosted photo):');
    if (!url || !url.trim()) return;
    const alt = window.prompt('Short description of the image (for accessibility):') || '';
    const markdown = `![${alt.trim()}](${url.trim()})`;
    const { selectionStart, value } = el;
    const needsLeadingBreak = selectionStart > 0 && value[selectionStart - 1] !== '\n';
    const insertText = `${needsLeadingBreak ? '\n\n' : ''}${markdown}\n\n`;
    const next = value.slice(0, selectionStart) + insertText + value.slice(selectionStart);
    setBody(next);
    const cursorPos = selectionStart + insertText.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursorPos, cursorPos);
    });
  }

  function applyFormat(action: (typeof TOOLBAR_ACTIONS)[number]) {
    const el = textareaRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd, value } = el;
    const selected = value.slice(selectionStart, selectionEnd);

    let next: string;
    let cursorPos: number;

    if (action.wrap) {
      const [before, after] = action.wrap;
      const insertText = selected || (action.label === 'Bible Verse' ? 'John 3:16' : 'text');
      next = value.slice(0, selectionStart) + before + insertText + after + value.slice(selectionEnd);
      cursorPos = selectionStart + before.length + insertText.length + after.length;
    } else if (action.prefix) {
      // Apply prefix to the start of the current line.
      const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      next = value.slice(0, lineStart) + action.prefix + value.slice(lineStart);
      cursorPos = selectionEnd + action.prefix.length;
    } else {
      return;
    }

    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursorPos, cursorPos);
    });
  }

  async function checkWriting() {
    setChecking(true);
    setCheckError(null);
    setMatches(null);
    try {
      const res = await fetch('/api/proofread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: plainText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Check failed');
      setMatches(data.matches);
    } catch (err: any) {
      setCheckError(err.message || 'Could not reach the proofreader right now.');
    } finally {
      setChecking(false);
    }
  }

  return (
    <section className="section">
      <div className="blog-shell-wide">
        <div className="section-header">
          <span className="eyebrow">Draft &amp; Proofread</span>
          <h2 style={{ textTransform: 'none', fontSize: '1.8rem' }}>Write a Post</h2>
          <p>Draft, format and proofread here, then publish instantly or schedule it for later.</p>
        </div>

        <input
          type="text"
          placeholder="Post title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700 }}
        />

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '4px 0 12px' }}>
          {TOOLBAR_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => applyFormat(action)}
            >
              {action.label}
            </button>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={insertImage}>
            Image
          </button>
        </div>

        <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr' }} className="compose-grid">
          <div>
            <label htmlFor="compose-body">Draft</label>
            <textarea
              id="compose-body"
              ref={textareaRef}
              rows={18}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '.85rem', lineHeight: 1.6 }}
            />
            <button type="button" className="btn btn-primary" onClick={checkWriting} disabled={checking} style={{ marginTop: 12 }}>
              {checking ? 'Checking…' : 'Check Writing'}
            </button>

            {checkError && <p style={{ color: 'var(--live-red)', fontSize: '.85rem', marginTop: 12 }}>{checkError}</p>}

            {matches && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '.75rem', color: 'var(--text-faint)', marginBottom: 10 }}>
                  {matches.length === 0 ? 'No issues found — looks clean.' : `${matches.length} suggestion${matches.length === 1 ? '' : 's'}`}
                </p>
                {matches.map((m, i) => (
                  <div key={i} className="prayer-card" style={{ padding: 14, marginBottom: 10 }}>
                    <p style={{ fontSize: '.85rem', marginBottom: 6 }}>{m.message}</p>
                    <p style={{ fontSize: '.78rem', color: 'var(--text-faint)', fontStyle: 'italic' }}>
                      &ldquo;{m.context.text}&rdquo;
                    </p>
                    {m.replacements.length > 0 && (
                      <p style={{ fontSize: '.8rem', color: 'var(--accent-cyan)', marginTop: 6 }}>
                        Suggested: {m.replacements.slice(0, 3).map((r) => r.value).join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label>Live Preview</label>
            <div className="post-body" style={{ border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-card)', padding: 24, background: 'var(--surface-low)' }}>
              <h1 style={{ fontSize: '1.6rem', marginBottom: 16 }}>{title || 'Untitled Post'}</h1>
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
        </div>

        <PublishPanel title={title} body={body} />
      </div>

      <style>{`
        @media (min-width: 900px) {
          .compose-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </section>
  );
}
