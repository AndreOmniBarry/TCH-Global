import { SiteHeader, SiteFooter } from '@/components/SiteChrome';
import GuardianReview from '@/components/members/GuardianReview';
import { authConfigured, guardianLookup } from '@/lib/auth';

export const metadata = { title: 'For parents and guardians | TCH Global', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function GuardianPage({ searchParams }: { searchParams: { t?: string } }) {
  const token = typeof searchParams.t === 'string' ? searchParams.t : '';
  const m = authConfigured && token ? await guardianLookup(token).catch(() => null) : null;
  return (
    <>
      <SiteHeader />
      <main className="section account-page">
        <div className="container">
          <GuardianReview token={token} name={m ? m.name.split(' ')[0] : null} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
