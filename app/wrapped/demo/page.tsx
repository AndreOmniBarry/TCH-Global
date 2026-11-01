import WrappedStory from '@/components/wrapped/WrappedStory';
import { SAMPLE_WRAPPED } from '@/lib/wrapped';

export const metadata = { title: 'My Year in the Word (demo) | TCH Global', robots: { index: false } };

// Demo of "My Year in the Word" with sample data, so the team can see
// exactly what members will get before it goes live.
export default function WrappedDemoPage() {
  return (
    <main className="wr-page">
      <a className="wr-back" href="/">&larr; TCH Global</a>
      <WrappedStory data={SAMPLE_WRAPPED} demo />
      <p className="wr-foot">This is a preview. <a href="/wrapped/demo/email">See the email members receive</a>.</p>
    </main>
  );
}
