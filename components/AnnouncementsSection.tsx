import { getAnnouncements } from '@/lib/sanity';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function AnnouncementsSection() {
  const announcements = await getAnnouncements();

  // No Sanity connection yet, or nothing scheduled — don't show an
  // empty/placeholder section on the live site, just skip it quietly.
  // (Handler sees it appear the moment they publish one in the Studio.)
  if (!announcements || announcements.length === 0) return null;

  return (
    <section className="section pop-stage" id="announcements">
      <div className="container">
        <div className="section-header pop">
          <span className="eyebrow">What&rsquo;s Happening</span>
          <h2>Announcements</h2>
          <p>Upcoming programs and flyers, posted by the church admin team.</p>
        </div>
        <div className="resource-scroll pop">
          {announcements.map((a) => (
            <div className="resource-card" key={a._id}>
              {a.flyerImage && (
                <div className="resource-cover"><img src={a.flyerImage} alt={a.title} /></div>
              )}
              <div className="resource-body">
                <div className="resource-kind">{formatDate(a.startsAt)}</div>
                <h4>{a.title}</h4>
                <p style={{ fontSize: '.82rem', color: 'var(--text-muted)', marginBottom: 10 }}>{a.body}</p>
                {a.link && (
                  <a className="resource-cta" href={a.link} target="_blank" rel="noopener">Learn More &rarr;</a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
