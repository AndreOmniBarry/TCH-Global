import { SAMPLE_WRAPPED, wrappedEmail } from '@/lib/wrapped';

export const metadata = { title: 'My Year in the Word email (demo) | TCH Global', robots: { index: false } };

// The exact email a member would receive, rendered from the same sample data.
export default function WrappedEmailDemoPage() {
  const { subject, html } = wrappedEmail(SAMPLE_WRAPPED, 'https://tch-global.vercel.app/wrapped/demo');
  return (
    <main className="wr-page wr-page--email">
      <a className="wr-back" href="/wrapped/demo">&larr; Back to the story</a>
      <div className="wr-mail">
        <p className="wr-mail-meta"><b>From</b> TCH Global<br /><b>Subject</b> {subject}</p>
        <iframe title="Email preview" srcDoc={html} className="wr-mail-frame" />
      </div>
    </main>
  );
}
