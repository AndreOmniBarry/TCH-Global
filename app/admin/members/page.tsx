import AdminNav from '@/components/AdminNav';
import MembersTools from './MembersTools';

export const metadata = { title: 'Member help | TCH Global Admin', robots: { index: false } };

export default function MembersPage() {
  return (
    <main className="section admin-page">
      <div className="container">
        <AdminNav current="/admin/members" />
        <h1 style={{ margin: '18px 0 6px' }}>Member help</h1>
        <p className="account-muted" style={{ marginBottom: 18 }}>Reset a member&rsquo;s password without waiting for email, and check that emails are going out.</p>
        <MembersTools />
      </div>
    </main>
  );
}
