import WrappedStory from '@/components/wrapped/WrappedStory';
import { currentMember } from '@/lib/auth';
import { buildWrapped } from '@/lib/wrapped-track';

export const metadata = { title: 'My Year in the Word | TCH Global', robots: { index: false } };
export const dynamic = 'force-dynamic';

// A signed-in member's own story: ?p=2026 (the year, default) or ?p=2026-10.
export default async function WrappedPage({ searchParams }: { searchParams: { p?: string } }) {
  const me = await currentMember();
  const year = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }).slice(0, 4);
  const p = /^\d{4}(-\d{2})?$/.test(searchParams.p || '') ? searchParams.p! : year;
  const data = me && me.wrapped !== false ? await buildWrapped(me, p) : null;
  return (
    <main className="wr-page">
      <a className="wr-back" href="/">&larr; TCH Global</a>
      {data ? (
        <WrappedStory data={data} />
      ) : (
        <div className="wr-phone wr-t1 wr-empty">
          <div className="wr-card" style={{ cursor: 'default' }}>
            <p className="wr-eyebrow">My Year in the Word</p>
            <h2 className="wr-big">{!me ? 'Sign in to see your story' : me.wrapped === false ? 'Your story is switched off' : 'Your story is just beginning'}</h2>
            <p className="wr-lead">
              {!me ? 'Members get a private story of their time in the Word: messages, reading and prayer, every month and in December.'
                : me.wrapped === false ? 'Turn on “My Year in the Word” in your account and it will start building from today.'
                : 'Listen to a message in PUDLIB!, read a blog post or send a prayer while signed in, and your story starts filling in.'}
            </p>
            <a className="wr-cta" href={!me ? '/account' : me.wrapped === false ? '/account' : '/library'}>{!me ? 'Sign in' : me.wrapped === false ? 'Open my account' : 'Open PUDLIB!'}</a>
            <a className="wr-cta wr-cta--ghost" href="/wrapped/demo">See an example</a>
          </div>
        </div>
      )}
    </main>
  );
}
