import { SiteHeader, SiteFooter } from '@/components/SiteChrome';
import AdminLogin from './AdminLogin';

export const metadata = { title: 'Admin sign in | TCH Global', robots: { index: false } };

export default function AdminLoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const next = searchParams.next && searchParams.next.startsWith('/admin') ? searchParams.next : '/admin/submissions';
  return (
    <>
      <SiteHeader />
      <main className="section account-page">
        <div className="container"><AdminLogin next={next} /></div>
      </main>
      <SiteFooter />
    </>
  );
}
