import { getTestimonies } from '@/lib/sanity';

// Self-contained section (own <section>/.container) — see EventsSection
// for why: each dangerouslySetInnerHTML chunk in app/page.tsx is its own
// isolated fragment, so a section can't be handed off half-open to a
// spliced component.
//
// Testimonies are curated, not auto-published: members submit through
// the form below (POST /api/forms, type "testimony"), which lands in
// Vercel KV for the admin to read at /admin/submissions. Approving one
// means copying it into a "Testimony" document in Sanity Studio
// (/studio) — same pattern as drafting a post at /write, then
// publishing it in Studio. This keeps a real person in the loop before
// anything a member wrote appears publicly.
export default async function TestimoniesSection() {
  const testimonies = await getTestimonies();

  return (
    <section className="section pop-stage shape-host" id="testimonies" data-title="Testimonies">
      <div className="container section-duo section-duo--header-top">
        <div className="section-header pop">
          <span className="eyebrow">Changed Lives</span>
          <h2>Testimonies</h2>
          <p>Real stories from our church family.</p>
        </div>

        {testimonies && testimonies.length > 0 ? (
          <div className="testimony-grid pop">
            {testimonies.map((t) => (
              <div className="testimony-card" key={t._id}>
                <p className="testimony-quote">&ldquo;{t.quote}&rdquo;</p>
                <div className="testimony-name">{t.name}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="testimony-grid pop">
            <div className="testimony-card">
              <p className="testimony-quote">
                Be the first to share how God has moved in your life through TCH Global — every story here starts
                with someone willing to tell it.
              </p>
            </div>
          </div>
        )}

        <div className="join-card pop testimony-form">
          <h4 style={{ fontSize: '.9rem', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 14 }}>
            Share Your Testimony
          </h4>
          <form id="testimony-form">
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }}
              aria-hidden="true"
            />
            <label htmlFor="testimony-name">Your Name</label>
            <input type="text" id="testimony-name" placeholder="How you'd like to be credited" required />
            <label htmlFor="testimony-quote">Your Story</label>
            <textarea id="testimony-quote" rows={4} placeholder="Share how God has moved in your life..." required />
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Submit Testimony
            </button>
          </form>
          <div className="give-form done" id="testimony-done" hidden>
            <p style={{ color: 'var(--accent-cyan)', fontWeight: 700, marginBottom: 6 }}>Thank you for sharing.</p>
            <p style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>
              Our team reviews every submission before it&rsquo;s published here.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
