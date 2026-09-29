export function SiteHeader() {
  return (
    <header className="site-header" id="top">
      <div className="container">
        <a href="/" className="brand">
          <img src="/images/logo.jpg" alt="TCH Global logo" />
          <span>TCH GLOBAL<span className="tagline">The Comforters House Global</span></span>
        </a>
        <div className="header-actions">
          <button className="theme-toggle" id="theme-toggle" aria-label="Switch light or dark theme" title="Switch theme"><svg className="sun-and-moon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><mask id="moon-mask"><rect x="0" y="0" width="100%" height="100%" fill="white" /><circle className="moon" cx="24" cy="10" r="6" fill="black" /></mask><circle className="sun" cx="12" cy="12" r="6" mask="url(#moon-mask)" fill="currentColor" /><g className="sun-beams" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></g></svg></button>
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
        <div className="footer-bottom"><span>&copy; {new Date().getFullYear()} TCH Global Church. All rights reserved.</span><span className="footer-credit">Designed &amp; engineered by <b>OmniBarry Inc.</b></span></div>
      </div>
    </footer>
  );
}
