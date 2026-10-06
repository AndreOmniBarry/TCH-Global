'use client';

import { useEffect, useState } from 'react';
import { useMember } from './useMember';

type Comment = { id: string; memberId: string; name: string; body: string; at: string };

function when(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function BlogComments({ slug }: { slug: string }) {
  const { member, loading } = useMember();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch(`/api/comments?slug=${encodeURIComponent(slug)}`).then((r) => r.json()).then((d) => setComments(d.comments || [])).catch(() => setComments([]));
  }, [slug]);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!body.trim()) return;
    setBusy(true);
    try {
      const r = await fetch('/api/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, body }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setErr(d.error || 'Could not post that.');
      setComments((c) => [...(c ?? []), d.comment]);
      setBody('');
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    if (!confirm('Delete your comment?')) return;
    const r = await fetch(`/api/comments?slug=${encodeURIComponent(slug)}&id=${id}`, { method: 'DELETE' });
    if (r.ok) setComments((c) => (c ?? []).filter((x) => x.id !== id));
  }

  const next = typeof window !== 'undefined' ? encodeURIComponent(location.pathname + '#comments') : '';
  return (
    <section className="comments" id="comments" aria-label="Comments">
      <h3>Responses {comments && comments.length > 0 && <span>{comments.length}</span>}</h3>
      {comments && comments.length === 0 && <p className="comments-empty">No responses yet. Share a word of encouragement, a prayer, or what this stirred in you.</p>}
      <ul className="comments-list">
        {(comments ?? []).map((c) => (
          <li key={c.id}>
            <span className="comment-avatar" aria-hidden="true">{c.name.trim().charAt(0).toUpperCase()}</span>
            <div>
              <div className="comment-head"><strong>{c.name}</strong><span>{when(c.at)}</span>
                {member?.id === c.memberId && <button type="button" onClick={() => remove(c.id)}>Delete</button>}
              </div>
              <p>{c.body}</p>
            </div>
          </li>
        ))}
      </ul>
      {loading ? null : member ? (
        <form className="comment-form" onSubmit={post}>
          <label htmlFor="comment-body">Respond as {member.name}</label>
          <textarea id="comment-body" rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a response, prayer or affirmation" maxLength={2000} />
          {err && <p className="form-status" data-kind="error">{err}</p>}
          <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Posting…' : 'Post response'}</button>
        </form>
      ) : (
        <div className="comment-gate">
          <p>Join the TCH Global family to respond, pray with others and get new messages by email.</p>
          <div className="comment-gate-actions">
            <a className="btn btn-primary btn-sm" href={`/account?mode=signup&next=${next}`}>Create free account</a>
            <a className="btn btn-ghost btn-sm" href={`/account?next=${next}`}>Sign in</a>
          </div>
        </div>
      )}
    </section>
  );
}
