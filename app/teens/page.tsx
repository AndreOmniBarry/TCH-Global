import { SiteHeader, SiteFooter } from '@/components/SiteChrome';
import { getTeenPosts, getUpcomingEvents } from '@/lib/sanity';
import { AskAnything, SquadPicker } from '@/components/teens/TeensForms';

export const metadata = {
  title: 'TCH Teens | The Comforters House Global',
  description: 'For ages 11 to 19: hangouts, worship, real talk and the Teens blog at The Comforters House Global.',
};
export const revalidate = 60;

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' });
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Lagos' });

export default async function TeensPage() {
  const [posts, events] = await Promise.all([getTeenPosts(), getUpcomingEvents()]);
  const teenEvents = (events ?? []).filter((e) => /teen|youth|young/i.test(`${e.title} ${e.description ?? ''}`)).slice(0, 3);
  const [lead, ...rest] = posts;
  return (
    <>
      <SiteHeader />
      <main className="tn">
        <section className="tn-hero">
          <div className="tn-orbs" aria-hidden="true"><i /><i /><i /></div>
          <div className="container tn-hero-in">
            <span className="tn-kicker">Ages 11&ndash;19 &middot; TCH Global</span>
            <h1 className="tn-title">
              <span>TCH</span>
              <span className="tn-title-teens">Teens</span>
            </h1>
            <p className="tn-lead">Real faith. Real friends. Real talk. A place to grow, ask anything and find where you fit.</p>
            <div className="tn-hero-actions">
              <a href="#squads" className="tn-btn">Find your squad</a>
              <a href="#ask" className="tn-btn tn-btn--ghost">Ask anything</a>
              <a href="/kids" className="tn-btn tn-btn--ghost">Daily story &amp; games</a>
            </div>
          </div>
          <div className="tn-marquee" aria-hidden="true">
            <div>{Array(2).fill('Worship · Real talk · Hangouts · Squads · The Word · Friends for life · ').join('')}</div>
          </div>
        </section>

        <section className="container tn-section">
          <div className="tn-head"><h2>Next hangout</h2><a href="/#events">Full calendar &rarr;</a></div>
          <div className="tn-events">
            {teenEvents.length ? teenEvents.map((e, i) => (
              <article key={e._id} className={`tn-event tn-tilt-${i % 3}`}>
                <span className="tn-event-date">{fmt(e.startsAt)}</span>
                <h3>{e.title}</h3>
                <p>{time(e.startsAt)} WAT{e.location ? ` · ${e.location}` : ''}</p>
              </article>
            )) : (
              <article className="tn-event tn-tilt-0">
                <span className="tn-event-date">Every Sunday</span>
                <h3>Teens Church</h3>
                <p>Join us at the 9:15 AM service, then hang out with the crew after.</p>
              </article>
            )}
          </div>
        </section>

        <section className="container tn-section">
          <div className="tn-head"><h2>Teens blog</h2>{posts.length > 3 && <a href="/teens/blog">All posts &rarr;</a>}</div>
          {lead ? (
            <div className="tn-blog">
              <a href={`/teens/blog/${lead.slug}`} className="tn-post tn-post--lead">
                <span className="tn-post-img"><img src={lead.coverImage} alt="" /></span>
                <span className="tn-post-body">{lead.category && <em>{lead.category}</em>}<strong>{lead.title}</strong>{lead.excerpt && <span>{lead.excerpt}</span>}</span>
              </a>
              {rest.slice(0, 4).map((p) => (
                <a key={p._id} href={`/teens/blog/${p.slug}`} className="tn-post">
                  <span className="tn-post-img"><img src={p.coverImage} alt="" loading="lazy" /></span>
                  <span className="tn-post-body">{p.category && <em>{p.category}</em>}<strong>{p.title}</strong></span>
                </a>
              ))}
            </div>
          ) : (
            <div className="tn-empty"><strong>First posts dropping soon.</strong> Stories, devotionals and real talk written for you.</div>
          )}
        </section>

        <section className="container tn-section tn-split" id="ask">
          <div>
            <span className="tn-kicker">No judgement zone</span>
            <h2>Ask anything</h2>
            <p>Got a question about God, life, school, relationships or anything else? Ask it here. You can stay anonymous.</p>
          </div>
          <AskAnything />
        </section>

        <section className="container tn-section tn-split" id="squads">
          <div>
            <span className="tn-kicker">Find where you fit</span>
            <h2>Join a squad</h2>
            <p>Use your gifts with friends who get you. Pick one or more and a leader will reach out.</p>
          </div>
          <SquadPicker />
        </section>

        <section className="container tn-section">
          <div className="tn-wall" aria-label="Photos">
            {['gallery-4', 'gallery-7', 'gallery-1', 'gallery-5', 'gallery-2', 'gallery-6'].map((g, i) => (
              <span key={g} className={`tn-photo tn-tilt-${i % 3}`}><img src={`/images/${g}.webp`} alt="" loading="lazy" /></span>
            ))}
          </div>
        </section>

        <section className="container tn-section">
          <div className="tn-parents">
            <strong>For parents</strong>
            <p>Every TCH Teens activity is led by trained, background-checked leaders, and parents are always welcome. Questions? Write to info@tchglobal.org.</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
