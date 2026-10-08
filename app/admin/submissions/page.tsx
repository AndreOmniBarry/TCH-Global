import { listSubmissions, formsConfigured, FormType, FormSubmission } from '@/lib/forms';
import { SiteHeader, SiteFooter } from '@/components/SiteChrome';
import AdminNav from '@/components/AdminNav';
import TestimonyAdmin from '@/components/testimonies/TestimonyAdmin';
import { getTestimonies } from '@/lib/sanity';
import { listMembers } from '@/lib/auth';

export const metadata = { title: 'Submissions | TCH Global Admin' };
export const dynamic = 'force-dynamic';

const SECTIONS: { type: FormType; title: string; fieldOrder: string[] }[] = [
  { type: 'salvation', title: 'Prayed the Prayer of Salvation (follow up!)', fieldOrder: ['name', 'phone', 'email', 'city', 'note'] },
  { type: 'prayer', title: 'Prayer Requests', fieldOrder: ['message'] },
  { type: 'volunteer', title: 'Volunteer Interest', fieldOrder: ['name', 'email', 'team'] },
  { type: 'join', title: 'Membership (Join Us)', fieldOrder: ['name', 'email'] },
  { type: 'give', title: 'Giving Intent', fieldOrder: ['name', 'email', 'amount', 'fund'] },
  { type: 'newsletter', title: 'Newsletter Sign-ups', fieldOrder: ['email', 'source'] },
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

  const [results, pendingTestimonies, liveTestimonies] = await Promise.all([
    Promise.all(SECTIONS.map((s) => listSubmissions(s.type, 100))),
    listSubmissions('testimony', 200),
    getTestimonies(),
  ]);
  const members = await listMembers();

  return (
    <>
      <SiteHeader />
      <section className="section">
        <div className="container" style={{ maxWidth: 720 }}>
          <AdminNav current="/admin/submissions" />
          <div className="section-header">
            <span className="eyebrow">Admin</span>
            <h2 style={{ textTransform: 'none', fontSize: '1.8rem' }}>Submissions</h2>
            <p>Prayer requests, volunteer interest, membership, and giving-intent forms — newest first.</p>
          </div>

          <div style={{ marginBottom: 36 }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>Registered members <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>({members.length}, {members.filter((m) => m.newsletter).length} subscribed)</span></h3>
            {members.length === 0 ? (
              <p style={{ fontSize: '.85rem', color: 'var(--text-faint)' }}>No members yet.</p>
            ) : (
              <div style={{ border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-card)', overflow: 'auto' }}>
                <table className="an-table">
                  <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Emails</th><th>Joined</th></tr></thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.id}><td>{m.name}</td><td>{m.email}</td><td>{m.phone || ''}</td><td>{m.newsletter ? 'Yes' : 'No'}</td><td>{new Date(m.createdAt).toLocaleDateString('en-US', { dateStyle: 'medium' })}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <TestimonyAdmin pending={pendingTestimonies ?? []} live={(liveTestimonies ?? []).map((t) => ({ _id: t._id, name: t.name, quote: t.quote, category: t.category, featured: t.featured, submittedAt: t.submittedAt }))} />

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
