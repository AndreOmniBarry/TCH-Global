import { getUpcomingEvents } from '@/lib/sanity';
import EventsCalendar from '@/components/EventsCalendar';

// Self-contained section (own <section>/.container): each HTML-bridge
// chunk in app/page.tsx is parsed as its own fragment, so this has to
// open and close cleanly on its own.
export default async function EventsSection() {
  const events = await getUpcomingEvents();
  return (
    <section className="section pop-stage shape-host" id="events" data-title="Events">
      <div className="container">
        <div className="section-header pop">
          <span className="eyebrow">Calendar</span>
          <h2>Upcoming Events</h2>
          <p>All times are Benin City time (WAT). Tap a date to see what&rsquo;s on, or add anything straight to your phone&rsquo;s calendar.</p>
        </div>
        <EventsCalendar events={events ?? []} />
      </div>
    </section>
  );
}
