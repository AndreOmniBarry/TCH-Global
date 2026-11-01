import { SiteHeader, SiteFooter } from '@/components/SiteChrome';
import ResetPassword from '@/components/members/ResetPassword';
import { authConfigured, resetIsValid } from '@/lib/auth';

export const metadata = { title: 'Choose a new password | TCH Global', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function ResetPage({ searchParams }: { searchParams: { t?: string } }) {
  const token = typeof searchParams.t === 'string' ? searchParams.t : '';
  const valid = authConfigured && token ? await resetIsValid(token).catch(() => false) : false;
  return (
    <>
      <SiteHeader />
      <main className="section account-page">
        <div className="container">
          <ResetPassword token={token} valid={valid} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
