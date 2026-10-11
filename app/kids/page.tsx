import { SiteHeader, SiteFooter } from '@/components/SiteChrome';
import KidsDaily from '@/components/kids/KidsDaily';
import { lagosDay, storyFor } from '@/lib/kids/schedule';
import { getCmsStories } from '@/lib/kids/cms';

export const metadata = {
  title: 'TCH Kids | Daily Bible Story & Games',
  description: 'A new Bible story every day with pictures, a devotional, and games: quiz, word search, crossword and verse builder.',
};
export const revalidate = 600;

export default async function KidsPage() {
  const day = lagosDay();
  const { story, season, dayNo } = storyFor(day, await getCmsStories());
  const dateLabel = new Date(day).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
  return (
    <>
      <SiteHeader />
      <main className="kids">
        <section className="kids-hero">
          <div className="kids-bubbles" aria-hidden="true"><i /><i /><i /><i /></div>
          <div className="container">
            <span className="kids-kicker">TCH Kids &middot; ages 5&ndash;12</span>
            <h1>Today&rsquo;s Bible <em>Adventure</em></h1>
            <p>A new story every day, then games to play. Collect all five stars!</p>
          </div>
        </section>
        <section className="container kids-body">
          <KidsDaily story={story} season={season} dayNo={dayNo} dateLabel={dateLabel} />
          <div className="kids-foot">
            <a href="/teens" className="kids-teen-link">Older? Visit <strong>TCH Teens</strong> &rarr;</a>
            <p>Parents: stories follow the Bible closely, and every verse is from the King James Version. New stories every day, with special series at Christmas and Easter.</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
