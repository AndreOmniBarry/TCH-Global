import { SiteHeader, SiteFooter } from '@/components/SiteChrome';
import AccountPanel from '@/components/members/AccountPanel';

export const metadata = { title: 'Your Account | TCH Global', robots: { index: false } };

export default function AccountPage({ searchParams }: { searchParams: { mode?: string; next?: string } }) {
  const next = searchParams.next && searchParams.next.startsWith('/') && !searchParams.next.startsWith('//') ? searchParams.next : '';
  return (
    <>
      <SiteHeader />
      <main className="section account-page">
        <div className="container">
          <AccountPanel initialMode={searchParams.mode === 'signup' ? 'signup' : 'signin'} next={next} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
