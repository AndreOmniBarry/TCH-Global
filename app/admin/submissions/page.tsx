import { listSubmissions, formsConfigured, FormType, FormSubmission } from '@/lib/forms';
import { SiteHeader, SiteFooter } from '@/components/SiteChrome';

export const metadata = { title: 'Submissions | TCH Global Admin' };
export const dynamic = 'force-dynamic';

const SECTIONS: { type: FormType; title: string; fieldOrder: string[] }[] = [
  { type: 'prayer', title: 'Prayer Requests', fieldOrder: ['message'] },
  { type: 'volunteer', title: 'Volunteer Interest', fieldOrder: ['name', 'email', 'team'] },
  { type: 'join', title: 'Membership (Join Us)', fieldOrder: ['name', 'email'] },
  { type: 'give', title: 'Giving Intent', fieldOrder: ['name', 'email', 'amount', 'fund'] },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function SubmissionCard({ entry, fieldOrder }: { entry: FormSubmission; fieldOrder: string[] }) {
  return (
    <div style={{ border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-card)', padding: 14, marginBottom: 10 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-faint)', marginBottom: 8 }}>
        {formatDate(entry.submittedAt)}
      </div>
      {fieldOrder.map((key) =>
        entry.fields[key] ? (
          <p key={key} style={{ fontSize: '.85rem', marginBottom: 4 }}>
            <strong style={{ color: 'var(--text-high)', textTransform: 'capitalize' }}>{key}:</strong> {entry.fields[key]}
          </p>
        ) : null
      )}
    </div>
  );
}

export default async function AdminSubmissionsPage() {
  if (!formsConfigured) {
    return (
      <>
        <SiteHeader />
        <section className="section">
          <div className="container" style={{ maxWidth: 640 }}>
            <div className="section-header">
              <span className="eyebrow">Admin</span>
              <h2 style={{ textTransform: 'none', fontSize: '1.8rem' }}>Submissions</h2>
              <p>
                Not connected yet — form submissions need the same Vercel KV store as Analytics. See{' '}
                <code>analytics/README.md</code> for setup; once connected, this page (and the forms themselves)
                activate automatically.
              </p>
            </div>
          </div>
        </section>
        <SiteFooter />
      </>
    );
  }

  const results = await Promise.all(SECTIONS.map((s) => listSubmissions(s.type, 100)));

  return (
    <>
      <SiteHeader />
      <section className="section">
        <div className="container" style={{ maxWidth: 720 }}>
          <div className="section-header">
            <span className="eyebrow">Admin</span>
            <h2 style={{ textTransform: 'none', fontSize: '1.8rem' }}>Submissions</h2>
            <p>Prayer requests, volunteer interest, membership, and giving-intent forms — newest first.</p>
          </div>

          {SECTIONS.map((section, i) => {
            const entries = results[i] ?? [];
            return (
              <div key={section.type} style={{ marginBottom: 36 }}>
                <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>
                  {section.title} <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>({entries.length})</span>
                </h3>
                {entries.length === 0 ? (
                  <p style={{ fontSize: '.85rem', color: 'var(--text-faint)' }}>No submissions yet.</p>
                ) : (
                  entries.map((entry, idx) => <SubmissionCard key={idx} entry={entry} fieldOrder={section.fieldOrder} />)
                )}
              </div>
            );
          })}
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
