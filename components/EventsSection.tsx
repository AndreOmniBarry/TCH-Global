import { getUpcomingEvents } from '@/lib/sanity';
import FloatingShape from '@/components/decor/FloatingShape';
import { Polygon, FluidBlob } from '@/components/decor/Shapes';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// Self-contained section (own <section>/.container), same pattern as
// AnnouncementsSection — each HTML-bridge chunk in app/page.tsx is
// parsed as its own isolated fragment, so a section can't be "handed
// off" half-open between the static HTML and a spliced component; it
// has to open and close cleanly on its own.
export default async function EventsSection() {
  const events = await getUpcomingEvents();

  return (
    <section className="section pop-stage shape-host" id="events" data-title="Events">
      <FloatingShape top="0%" left="-4%" depth={0.9} rotate={-10}>
        <FluidBlob size={240} color="var(--accent-violet)" style={{ opacity: 0.45 }} />
      </FloatingShape>
      <FloatingShape bottom="6%" right="4%" depth={0.7} rotate={8}>
        <Polygon size={110} color="var(--accent-gold)" filled style={{ opacity: 0.5 }} />
      </FloatingShape>
      <div className="container">
        <div className="section-header pop">
          <span className="eyebrow">Calendar</span>
          <h2>Upcoming Events</h2>
        </div>
        <div className="gather-list pop">
          {!events || events.length === 0 ? (
            <div className="gather-row">
              <div>
                <div className="gather-name">Nothing scheduled right now</div>
                <div className="gather-place">Conferences, revivals &amp; outreach days will be listed here</div>
              </div>
            </div>
          ) : (
            events.map((event) => (
              <a
                className="gather-row"
                key={event._id}
                href={event.link || undefined}
                target={event.link ? '_blank' : undefined}
                rel={event.link ? 'noopener' : undefined}
                style={{ textDecoration: 'none', color: 'inherit', cursor: event.link ? 'pointer' : 'default' }}
              >
                <div>
                  <div className="gather-name">{event.title}</div>
                  <div className="gather-place">
                    {formatDate(event.startsAt)}
                    {event.location ? ` · ${event.location}` : ''}
                  </div>
                </div>
                <span className="gather-time">{formatTime(event.startsAt)}</span>
              </a>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
