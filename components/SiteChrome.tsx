export function SiteHeader() {
  return (
    <header className="site-header" id="top">
      <div className="container">
        <a href="/" className="brand">
          <img src="/images/logo.jpg" alt="TCH Global logo" />
          <span>TCH GLOBAL<span className="tagline">The Comforters House Global</span></span>
        </a>
        <div className="header-actions">
          <button className="theme-toggle" id="theme-toggle" aria-label="Toggle dark mode"><span className="knob" id="theme-knob"></span></button>
          <button className="nav-toggle" aria-label="Menu" id="nav-toggle">
            <svg className="icon-menu" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <nav className="main-nav" id="main-nav">
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/#about-church">About Church</a></li>
              <li><a href="/#pastor-section">Meet the Pastor</a></li>
              <li><a href="/#testimonies">Testimonies</a></li>
              <li><a href="/blog">Blog</a></li>
              <li><a href="/#service">Service &amp; Events</a></li>
              <li><a href="/#media">Media &amp; Streaming</a></li>
              <li><a href="/#volunteer">Volunteer</a></li>
              <li><a href="/#contact">Contact Us</a></li>
              <li><a href="/#join">Join Us</a></li>
              <li><a href="/#give">Give</a></li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-bottom">&copy; {new Date().getFullYear()} TCH Global Church. All rights reserved.</div>
      </div>
    </footer>
  );
}
