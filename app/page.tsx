import LibrarySection from '@/components/LibrarySection';
import AnnouncementsSection from '@/components/AnnouncementsSection';
import EventsSection from '@/components/EventsSection';
import TestimoniesSection from '@/components/TestimoniesSection';
import SectionTitleStage from '@/components/decor/SectionTitleStage';
import HeroExtras from '@/components/decor/HeroExtras';
import { getAllPosts, getUpcomingEvents, getTestimonies } from '@/lib/sanity';
import { fallbackPosts } from '@/lib/fallback-posts';

// This page bridges the original hand-authored static homepage into
// Next.js. Most of the markup below is an exact, mechanically-extracted
// copy of the former root index.html body content (paths rewritten to
// Next's root-relative routing) so the visual design didn't regress
// during migration. The interactive behavior (theme toggle, nav, scroll
// parallax, forms, map) is unchanged: it's still driven by
// /public/js/main.js, loaded globally in app/layout.tsx.
//
// The Library section has already been pulled out into a real Server
// Component (components/LibrarySection.tsx) that fetches live YouTube
// data server-side. This is the pattern for migrating the rest: as a
// section needs real data (events, announcements, testimonies), extract
// it from the HTML bridge below into its own component, the same way.

const ICON_YOUTUBE = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8zM9.7 15.1V8.9l5.8 3.1z"/></svg>`;
const ICON_FACEBOOK = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M14 8.5V6.6c0-.9.6-1.1 1-1.1h2.6V1.6H14c-4 0-4.9 3-4.9 4.9v2H6.8v4.1h2.3v9.8H14v-9.8h3.3l.4-4.1z"/></svg>`;
const ICON_INSTAGRAM = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5.5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none"/></svg>`;
const ICON_SPOTIFY = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10.2" stroke-width="1.8"/><path d="M6.9 9.5c3.4-1 7.3-.7 10.3 1M7.5 12.7c2.8-.8 5.9-.5 8.4.9M8.1 15.7c2.2-.6 4.5-.4 6.4.7" stroke-width="1.7"/></svg>`;

const HOME_HTML_BEFORE_LIBRARY = `

<header class="site-header" id="top">
  <div class="container">
    <a href="#top" class="brand">
      <img src="/images/logo.jpg" alt="TCH Global logo">
      <span>TCH GLOBAL<span class="tagline">The Comforters House Global</span></span>
    </a>
    <div class="header-actions">
      <button class="theme-toggle" id="theme-toggle" aria-label="Switch light or dark theme" title="Switch theme"><svg class="sun-and-moon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><mask id="moon-mask"><rect x="0" y="0" width="100%" height="100%" fill="white"/><circle class="moon" cx="24" cy="10" r="6" fill="black"/></mask><circle class="sun" cx="12" cy="12" r="6" mask="url(#moon-mask)" fill="currentColor"/><g class="sun-beams" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></g></svg></button>
      <button class="nav-toggle" aria-label="Menu" id="nav-toggle"><svg class="icon-menu" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>
      <nav class="main-nav" id="main-nav">
        <ul>
          <li><a href="#top">Home</a></li>
          <li><a href="#about-church">About Church</a></li>
          <li><a href="#pastor-section">Meet the Pastor</a></li>
          <li><a href="#testimonies">Testimonies</a></li>
          <li><a href="/blog">Blog</a></li>
          <li><a href="#service">Service &amp; Events</a></li>
          <li><a href="#media">Media &amp; Streaming</a></li>
          <li><a href="#volunteer">Volunteer</a></li>
          <li><a href="#contact">Contact Us</a></li>
          <li><a href="#join">Join Us</a></li>
          <li><a href="#give">Give</a></li>
        </ul>
      </nav>
    </div>
  </div>
</header>

<section class="hero-stage">
  <div class="hero-bg-photo" data-speed="0.22" role="img" aria-label="Worship service at TCH Global with congregation raising hands"></div>
  <div class="hero-spotlight" aria-hidden="true"></div>
  <div class="hero-cards" id="hero-cards"></div>
  <div class="hero-content container">
    <div id="hero-chip-mount" class="hero-chip-mount"></div>
    <h1 class="hero-title">TCH <em>Global</em></h1>
    <p class="hero-subtitle"><b>T</b>he <b>C</b>omforter&rsquo;s <b>H</b>ouse Global</p>
    <p class="hero-lead">Giving Comfort to Your Living.</p>
    <div class="hero-actions">
      <a href="#service" class="btn btn-primary">Plan Your Visit</a>
      <a href="#media" class="btn btn-ghost">Watch a Message</a>
    </div>
    <div class="stream-row">
      <a href="https://www.youtube.com" class="btn btn-ghost btn-sm btn-youtube" target="_blank" rel="noopener">${ICON_YOUTUBE} YouTube</a>
      <a href="https://www.facebook.com" class="btn btn-ghost btn-sm btn-facebook" target="_blank" rel="noopener">${ICON_FACEBOOK} Facebook</a>
      <a href="https://www.instagram.com" class="btn btn-ghost btn-sm btn-instagram" target="_blank" rel="noopener">${ICON_INSTAGRAM} Instagram</a>
    </div>
  </div>
  <div class="hero-marquee" aria-hidden="true">
    <div class="hero-marquee-track">
      ${Array(2).fill('<span>Worship</span><i>✦</i><em>the Word</em><i>✦</i><span>Comfort</span><i>✦</i><em>Prayer</em><i>✦</i><span>Family</span><i>✦</i><em>every Nation</em><i>✦</i>').join('')}
    </div>
  </div>
</section>

<section class="section pop-stage shape-host" id="about-church" data-title="About">
  <div class="container section-duo">
    <div class="section-header pop">
      <span class="eyebrow">Word &amp; Faith</span>
      <h2>Beyond Walls.<br><span class="accent">Into Light.</span></h2>
      <p>We don't replicate the traditions of the past for their own sake — we build a living, connected house rooted in the Word and in Faith.</p>
    </div>
    <div class="photo-cycle pop" data-broadcast="LIVE · SANCTUARY CAM 01">
      <img src="/images/pastor-teaching.webp" alt="Pastor teaching the congregation at TCH Global" style="--slot:0">
      <img src="/images/gallery-4.webp" alt="TCH Global congregation" loading="lazy" width="900" height="600" style="--slot:1">
      <img src="/images/gallery-1.webp" alt="Pastor ministering at TCH Global" loading="lazy" width="900" height="600" style="--slot:2">
      <img src="/images/gallery-6.webp" alt="Pastor Uzor Echiejile ministering" loading="lazy" width="900" height="599" style="--slot:3">
      <img src="/images/gallery-2.webp" alt="Pastor Uzor Echiejile at the podium" loading="lazy" width="900" height="600" style="--slot:4">
      <img src="/images/gallery-7.webp" alt="TCH Global worship service" loading="lazy" width="900" height="600" style="--slot:5">
      <img src="/images/gallery-5.webp" alt="Pastor ministering at TCH Global" loading="lazy" width="900" height="600" style="--slot:6">
      <span class="photo-tag">The Word &amp; Faith in Action</span>
    </div>
  </div>

  <div class="container about-deep">
    <div class="vm-grid">
      <article class="vm-card vm-card--vision pop">
        <span class="eyebrow">Our Vision</span>
        <h3>A house of comfort <em>in every nation.</em></h3>
        <p>To see a global family of believers — in cities and on campuses — who carry the comfort of Christ into every home, workplace and generation.</p>
      </article>
      <article class="vm-card vm-card--mission pop">
        <span class="eyebrow">Our Mission</span>
        <h3>Giving comfort <em>to your living.</em></h3>
        <p>We teach the Word with simplicity, pray with expectation, and build a connected church family that helps people know Christ and make Him known — beyond walls, into light.</p>
      </article>
    </div>

    <div class="about-subhead pop"><span class="eyebrow">What drives us</span><h3>Our Core Values</h3></div>
    <div class="values-grid"><div class="value-card pop"><span class="value-icon"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M9 7h6M9 11h6"/></svg></span><h4>The Word</h4><p>Scripture is our foundation — every message, decision and ministry starts from the Bible.</p></div><div class="value-card pop"><span class="value-icon"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v18M6 9h12"/></svg></span><h4>Faith</h4><p>We take God at His Word and expect to see Him move — in services, homes and campuses.</p></div><div class="value-card pop"><span class="value-icon"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"/></svg></span><h4>Comfort</h4><p>We are a house of comfort: a place where the hurting are held, heard and helped.</p></div><div class="value-card pop"><span class="value-icon"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 21V11l4-8 4 8v10M8 15h8"/></svg></span><h4>Prayer</h4><p>Prayer is how this house breathes — every week, every service, every request.</p></div><div class="value-card pop"><span class="value-icon"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2 20c0-3 3-5 6-5s6 2 6 5M12 20c0-3 3-5 6-5s4 1.5 4 3"/></svg></span><h4>Family</h4><p>One family across every nation — no one worships alone at TCH Global.</p></div><div class="value-card pop"><span class="value-icon"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.5 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg></span><h4>Excellence</h4><p>We give God our best — in worship, in teaching and in how we serve people.</p></div></div>

    <div class="believe-wrap">
      <div class="about-subhead pop"><span class="eyebrow">Foundations</span><h3>What We Believe</h3><p>The heart of our faith, in five lines.</p></div>
      <ol class="believe-list pop"><li>One God, eternally existing as Father, Son and Holy Spirit.</li><li>Jesus Christ — His death, resurrection and return — is the only way to salvation.</li><li>The Bible is the inspired, authoritative Word of God.</li><li>The Holy Spirit empowers believers today, with signs and wonders following.</li><li>The Church is a family called to comfort, disciple and reach every nation.</li></ol>
    </div>

    <div class="stat-band pop">
      <div><strong>4</strong><span>gatherings every week</span></div>
      <div><strong>2</strong><span>Sunday services</span></div>
      <div><strong>1</strong><span>family, many campuses</span></div>
      <div><strong>&infin;</strong><span>nations online</span></div>
    </div>
  </div>
</section>

`;

const HOME_HTML_AFTER_LIBRARY = `<section class="section pop-stage shape-host band-dark" id="pastor-section" data-title="Pastor">
  <div class="container section-duo">
    <div class="pastor-card pop">
      <div class="pastor-portrait"><img src="/images/pastor-portrait.webp" alt="Portrait of Pastor Uzor Echiejile"></div>
      <div class="pastor-role">Global Lead Pastor</div>
      <h3>Pastor Uzor Echiejile</h3>
      <p class="subtitle">TCH Global</p>
      <p class="pastor-bio">Pastor Uzor Echiejile is the Global Lead Pastor of TCH Global (The Comforter's House Global), a network of churches and campus fellowships. He is an anointed minister of the Gospel of our Lord Jesus Christ, who presents the Gospel of Christ in its simplicity, with signs and wonders following in his meetings.</p>
      <p class="pastor-bio-note">Full biography coming soon — placeholder text above, ready to be replaced with your write-up.</p>
    </div>
    <a href="#media" class="latest-message pop" data-broadcast="REC · THIS WEEK&rsquo;S WORD">
      <img src="/images/pastor-mic.webp" alt="Pastor Uzor Echiejile ministering with a microphone">
      <span class="latest-message-play"><svg class="icon-play" viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></span>
      <span class="latest-message-body">
        <span class="eyebrow">Latest Message</span>
        <h3>Watch This Week's Word</h3>
        <span class="latest-message-cta">Watch Now &rarr;</span>
      </span>
    </a>
  </div>
</section>
`;

const HOME_HTML_TESTIMONIES_TO_EVENTS = `
<section class="section pop-stage shape-host band-dark" id="blog" data-title="Blog">
  <div class="container">
    <div class="section-header pop">
      <span class="eyebrow">The Comforters Blog</span>
      <h2>Words for the Everyday Faith</h2>
      <p>Weekly reflections from TCH Global, published every Sunday — free to read, share, and grow from.</p>
    </div>

    <a href="/blog/walking-in-faith" class="blog-feature pop">
      <div class="blog-feature-media" data-broadcast="ON AIR · THE COMFORTERS BLOG">
        <img src="/images/pastor-teaching.webp" alt="Pastor Uzor Echiejile teaching at TCH Global">
      </div>
      <div class="blog-feature-body">
        <span class="blog-tag">Faith</span>
        <h3>Walking in Faith When You Can't See the Way</h3>
        <p>Faith was never meant to require full visibility. This week we look at what it means to take the next step when the whole path hasn't been shown to you yet.</p>
        <div class="blog-byline">
          <span class="blog-avatar"><img src="/images/pastor-portrait.webp" alt="Pastor Uzor Echiejile"></span>
          <span class="blog-byline-text">
            <strong>Pastor Uzor Echiejile</strong>
            <span>Sep 27, 2026 &middot; 6 min read</span>
          </span>
        </div>
      </div>
    </a>

    <div class="blog-grid pop">
      <a href="/blog/anchored-in-hope" class="blog-card">
        <span class="blog-tag">Hope</span>
        <h4>Anchored in Hope: A Word for Weary Seasons</h4>
        <span class="blog-meta">Pastor Uzor Echiejile &middot; Sep 20, 2026</span>
      </a>
      <a href="/blog/the-comforters-house" class="blog-card">
        <span class="blog-tag">Community</span>
        <h4>The Comforter's House: Why We Gather</h4>
        <span class="blog-meta">Pastor Uzor Echiejile &middot; Sep 13, 2026</span>
      </a>
    </div>
    <a href="/blog" class="resource-cta" style="display:inline-block;margin-top:20px;">Read The Comforters Blog &rarr;</a>
  </div>
</section>

<section class="section pop-stage shape-host" id="service" data-title="Service">
  <div class="container">
    <div class="section-header pop"><span class="eyebrow">Schedule</span><h2>Our Service Days</h2></div>
    <div class="gather-list pop">
      <div class="gather-row"><div><div class="gather-name">First Service</div><div class="gather-place">Sunday</div></div><span class="gather-time">7:30 AM</span></div>
      <div class="gather-row"><div><div class="gather-name">Second Service</div><div class="gather-place">Sunday</div></div><span class="gather-time">9:15 AM</span></div>
      <div class="gather-row"><div><div class="gather-name">Prayer Meeting</div><div class="gather-place">Monday</div></div><span class="gather-time">5:30 PM</span></div>
      <div class="gather-row"><div><div class="gather-name">Midweek Service</div><div class="gather-place">Wednesday</div></div><span class="gather-time">5:30 PM</span></div>
    </div>

    <div class="map-card pop">
      <div class="map-visual" style="position:relative;">
        <div id="church-map" style="position:absolute;inset:0;"></div>
        <span class="photo-tag" style="position:absolute;left:10px;bottom:10px;z-index:500;pointer-events:none;">The Comforters House Global &mdash; Benin &middot; Grace Dome Church</span>
      </div>
      <strong style="color:var(--text-high);font-size:.95rem;">The Comforters House Global &mdash; Benin</strong>
      <p style="font-size:.82rem;margin:4px 0 8px;">45 Edosomwan Street, Ikpoba Hill, Benin City</p>
      <a href="https://www.google.com/maps?q=6.353611,5.6975" target="_blank" rel="noopener" class="btn btn-ghost btn-sm" style="width:100%;">Get Directions</a>
    </div>
  </div>
</section>
`;

const HOME_HTML_EVENTS_TO_MEDIA = `
<section class="section pop-stage shape-host band-dark" id="media" data-title="Media">
  <div class="container">
    <div class="section-header pop"><span class="eyebrow">Media &amp; Streaming</span><h2>Watch &amp; Listen</h2><p>Our services stream live and are archived here shortly after.</p></div>
    <div class="stream-row pop">
      <a href="https://www.youtube.com" target="_blank" rel="noopener" class="btn btn-primary btn-youtube">${ICON_YOUTUBE} YouTube Channel</a>
      <a href="https://www.facebook.com" target="_blank" rel="noopener" class="btn btn-ghost btn-facebook">${ICON_FACEBOOK} Facebook Live</a>
      <a href="https://open.spotify.com" target="_blank" rel="noopener" class="btn btn-ghost btn-spotify">${ICON_SPOTIFY} Spotify</a>
    </div>
    <p style="font-size:.72rem;color:var(--text-faint);margin-top:12px;font-family:var(--font-mono);">Messages are also available as a podcast on Spotify.</p>
  </div>
</section>

<section class="section pop-stage shape-host" id="volunteer" data-title="Volunteer">
  <div class="container section-duo">
    <div class="section-header pop">
      <span class="eyebrow">Serve</span>
      <h2>Join the Workforce</h2>
      <p>Use your gifts to serve the house. Tell us where you'd like to plug in and our teams will reach out.</p>
    </div>
    <div class="join-card pop">
      <form id="volunteer-form">
        <input type="text" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0;" aria-hidden="true">
        <label for="volunteer-name">Full Name</label>
        <input type="text" id="volunteer-name" placeholder="Your name" required>
        <label for="volunteer-email">Email</label>
        <input type="email" id="volunteer-email" placeholder="you@example.com" required>
        <label for="volunteer-team">Team of Interest</label>
        <select id="volunteer-team">
          <option>Ushering &amp; Hospitality</option>
          <option>Media &amp; Live Stream</option>
          <option>Worship &amp; Music</option>
          <option>Children's Ministry</option>
          <option>Outreach &amp; Missions</option>
          <option>Administration</option>
        </select>
        <button type="submit" class="btn btn-primary" style="width:100%;">Submit Interest</button>
      </form>
      <div class="give-form done" id="volunteer-done" hidden>
        <p style="color:var(--accent-cyan);font-weight:700;">Thank you for offering to serve. Our team leads will reach out soon.</p>
      </div>
    </div>
  </div>
</section>

<section class="section pop-stage shape-host band-dark" id="contact" data-title="Contact">
  <div class="container section-duo section-duo--header-top">
    <div class="section-header pop"><span class="eyebrow">Prayer</span><h2>Need Prayer Right Now?</h2></div>
    <div class="prayer-card pop">
      <p style="font-size:.85rem;color:var(--text-muted);margin-bottom:16px;">Our pastoral team reads and prays over every request submitted here.</p>
      <form id="prayer-form">
        <input type="text" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0;" aria-hidden="true">
        <textarea id="prayer-message" rows="4" placeholder="Share your intention, burden, or praise..." required></textarea>
        <button type="submit" class="btn btn-primary" style="width:100%;">Send Prayer Request</button>
      </form>
      <div class="give-form done" id="prayer-done" hidden>
        <p style="color:var(--accent-cyan);font-weight:700;">Received. Our team will be praying with you.</p>
      </div>
    </div>

    <div class="contact-card pop" style="margin-top:16px;">
      <h4 style="font-size:.9rem;text-transform:uppercase;letter-spacing:.06em;margin-bottom:14px;">Contact Us</h4>
      <p style="font-size:.85rem;margin-bottom:8px;"><strong style="color:var(--text-high);">Address</strong><br>45 Edosomwan Street, Ikpoba Hill, Benin City</p>
      <p style="font-size:.85rem;margin-bottom:8px;"><strong style="color:var(--text-high);">Phone</strong><br>(placeholder) 000 000 0000</p>
      <p style="font-size:.85rem;"><strong style="color:var(--text-high);">Email</strong><br>info@tchglobal.org</p>
    </div>
  </div>
</section>

<section class="section pop-stage shape-host" id="join" data-title="Join Us">
  <div class="container section-duo">
    <div class="section-header pop"><span class="eyebrow">Membership</span><h2>Join Us</h2><p>Already part of the family and ready to take the next step? Start a membership conversation with our pastoral team here.</p></div>
    <div class="join-card pop">
      <p style="font-size:.88rem;color:var(--text-body);margin-bottom:16px;">Tell us a bit about yourself and someone from our membership team will follow up about next steps, including baptism and membership class.</p>
      <form id="join-form">
        <input type="text" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0;" aria-hidden="true">
        <label for="join-name">Full Name</label>
        <input type="text" id="join-name" placeholder="Your name" required>
        <label for="join-email">Email</label>
        <input type="email" id="join-email" placeholder="you@example.com" required>
        <button type="submit" class="btn btn-primary" style="width:100%;">Join Us</button>
      </form>
      <div class="give-form done" id="join-done" hidden>
        <p style="color:var(--accent-cyan);font-weight:700;">Welcome home. We'll be in touch soon.</p>
      </div>
    </div>
  </div>
</section>

<section class="section pop-stage shape-host" id="give" data-title="Give">
  <div class="container section-duo">
    <div class="section-header pop">
      <span class="eyebrow">Generous Stewardship</span>
      <h2>Give</h2>
      <p>Online giving with a secure payment gateway is coming soon. For now, tell us your intent and our finance team will follow up with safe giving options.</p>
    </div>
    <div class="give-form pop" id="give-form-wrap">
      <form id="give-form">
        <input type="text" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0;" aria-hidden="true">
        <label for="give-name">Full Name</label>
        <input type="text" id="give-name" placeholder="Your name" required>
        <label for="give-email">Email</label>
        <input type="email" id="give-email" placeholder="you@example.com" required>
        <label for="give-amount">Intended Amount</label>
        <input type="number" id="give-amount" placeholder="e.g. 100" min="1">
        <label for="give-fund">Fund</label>
        <select id="give-fund">
          <option>General Fund</option>
          <option>Missions</option>
          <option>Building Fund</option>
          <option>Outreach</option>
        </select>
        <button type="submit" class="btn btn-primary" style="width:100%;">Submit Giving Intent</button>
      </form>
      <div class="give-form done" id="give-done" hidden>
        <p style="color:var(--accent-cyan);font-weight:700;margin-bottom:6px;">Thank you.</p>
        <p style="font-size:.85rem;color:var(--text-muted);">Our finance team will reach out with secure giving instructions. No payment was processed.</p>
      </div>
    </div>
  </div>
</section>

<footer class="site-footer">
  <div class="container">
    <div class="footer-cta">
      <h3 style="font-size:1.2rem;text-transform:uppercase;margin-bottom:8px;">Stay Rooted in the Word</h3>
      <p style="font-size:.85rem;color:var(--text-muted);margin-bottom:16px;">Get new messages, series, and announcements in your inbox.</p>
      <form id="newsletter-form" data-source="home-footer" style="display:flex;gap:8px;max-width:360px;margin:0 auto;">
        <input type="email" id="newsletter-email" placeholder="Enter your email" required style="margin-bottom:0;" autocomplete="email">
        <input type="text" name="website" tabindex="-1" autocomplete="off" class="hp-field" aria-hidden="true">
        <button type="submit" class="btn btn-primary" style="flex-shrink:0;">Join</button>
      </form>
    </div>

    <div class="footer-grid">
      <div class="footer-col">
        <h4>TCH Global</h4>
        <p>The Comforter's House Global — a church for every nation, gathering people to know Christ and make Him known.</p>
        <div class="social-row">
          <a href="https://www.facebook.com" target="_blank" rel="noopener" aria-label="Facebook" class="liquid liquid-facebook">${ICON_FACEBOOK}</a>
          <a href="https://www.youtube.com" target="_blank" rel="noopener" aria-label="YouTube" class="liquid liquid-youtube">${ICON_YOUTUBE}</a>
          <a href="https://www.instagram.com" target="_blank" rel="noopener" aria-label="Instagram" class="liquid liquid-instagram">${ICON_INSTAGRAM}</a>
          <a href="https://open.spotify.com" target="_blank" rel="noopener" aria-label="Spotify" class="liquid liquid-spotify">${ICON_SPOTIFY}</a>
        </div>
      </div>
      <div class="footer-col">
        <h4>Explore</h4>
        <ul>
          <li><a href="#about-church">About Church</a></li>
          <li><a href="#pastor-section">Meet the Pastor</a></li>
          <li><a href="#testimonies">Testimonies</a></li>
          <li><a href="#library">Library</a></li>
          <li><a href="/blog">Blog</a></li>
          <li><a href="#media">Media &amp; Streaming</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Connect</h4>
        <ul>
          <li><a href="#service">Plan Your Visit</a></li>
          <li><a href="#volunteer">Volunteer</a></li>
          <li><a href="#contact">Contact Us</a></li>
          <li><a href="#join">Join Us</a></li>
          <li><a href="#give">Give</a></li>
          <li><a href="#contact">Prayer Request</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Visit</h4>
        <p>45 Edosomwan Street, Ikpoba Hill, Benin City</p>
        <p style="margin-top:6px;">Sun 7:30 &amp; 9:15 AM<br>Mon Prayer 5:30 PM<br>Wed 5:30 PM</p>
      </div>
    </div>
    <div class="footer-bottom"><span>&copy; ${new Date().getFullYear()} TCH Global Church. All rights reserved.</span><span class="footer-credit">Designed &amp; engineered by <b>OmniBarry Inc.</b></span></div>
  </div>
</footer>
`;

export default async function HomePage() {
  const [posts, events, testimonies] = await Promise.all([getAllPosts(), getUpcomingEvents(), getTestimonies()]);
  const latest = [...(posts ?? fallbackPosts)].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  )[0];
  const heroData = {
    latestPost: latest ? { title: latest.title, slug: latest.slug, meta: [latest.category, latest.readTime].filter(Boolean).join(' · ') } : null,
    events: (events ?? []).slice(0, 5).map((e) => ({ title: e.title, startsAt: e.startsAt, endsAt: e.endsAt, location: e.location })),
    testimony: testimonies?.[0] ? { name: testimonies[0].name, quote: testimonies[0].quote } : null,
  };
  return (
    <>
      <SectionTitleStage />
      <div dangerouslySetInnerHTML={{ __html: HOME_HTML_BEFORE_LIBRARY }} />
      <HeroExtras {...heroData} />
      <LibrarySection />
      <AnnouncementsSection />
      <div dangerouslySetInnerHTML={{ __html: HOME_HTML_AFTER_LIBRARY }} />
      <TestimoniesSection />
      <div dangerouslySetInnerHTML={{ __html: HOME_HTML_TESTIMONIES_TO_EVENTS }} />
      <EventsSection />
      <div dangerouslySetInnerHTML={{ __html: HOME_HTML_EVENTS_TO_MEDIA }} />
    </>
  );
}
