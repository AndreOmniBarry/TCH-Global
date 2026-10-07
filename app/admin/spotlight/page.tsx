import { SiteHeader, SiteFooter } from '@/components/SiteChrome';
import AdminNav from '@/components/AdminNav';
import SpotlightAdmin from './SpotlightAdmin';

export const metadata = { title: 'Hero Spotlight | TCH Global Admin', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function SpotlightPage() {
  return (
    <>
      <SiteHeader />
      <main className="section">
        <div className="container" style={{ maxWidth: 1000 }}>
          <AdminNav current="/admin/spotlight" />
          <div className="section-header">
            <span className="eyebrow">Admin</span>
            <h2 style={{ textTransform: 'none', fontSize: '1.8rem' }}>Hero spotlight</h2>
            <p>Upload flyers, banners, programmes and announcements. They rotate on the homepage hero and leave on their own after the &ldquo;show until&rdquo; date.</p>
          </div>
          <SpotlightAdmin />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
