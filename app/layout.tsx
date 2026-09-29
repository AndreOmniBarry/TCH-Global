import type { Metadata, Viewport } from 'next';
import '@fontsource/syne/latin-700.css';
import '@fontsource/syne/latin-800.css';
import '@fontsource/plus-jakarta-sans/latin-400.css';
import '@fontsource/plus-jakarta-sans/latin-500.css';
import '@fontsource/plus-jakarta-sans/latin-600.css';
import '@fontsource/jetbrains-mono/latin-600.css';
import Script from 'next/script';
import RotatingBackdrop from '@/components/decor/RotatingBackdrop';
import CrystalLiquid from '@/components/decor/CrystalLiquid';

export const metadata: Metadata = {
  title: "TCH Global | The Comforter's House Global",
  description:
    "TCH Global (The Comforter's House Global) is a church for every nation, led by Pastor Uzor Echiejile.",
  // Dynamically rendered — bold circular badge, a status dot (live now /
  // fresh post), and a small seasonal accent near Christmas. See
  // app/api/favicon/route.tsx.
  icons: { icon: '/api/favicon' },
};

const SPLASH_SCRIPT = `(function(){var el=document.getElementById('splash');if(!el)return;
try{if(sessionStorage.getItem('tch_splash_seen')){el.classList.add('splash--gone');return}sessionStorage.setItem('tch_splash_seen','1')}catch(e){}
document.documentElement.classList.add('splash-lock');
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,pct=document.getElementById('splash-pct'),t0=performance.now(),p=0,target=.12,done=false;
function add(v){target=Math.min(1,target+v)}
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){add(.28)});else add(.28);
var img=new Image();img.onload=img.onerror=function(){add(.3)};img.src='/images/hero-worship.webp';
if(document.readyState==='complete')add(.3);else addEventListener('load',function(){add(.3)});
setTimeout(function(){target=1},4200);
function finish(){if(done)return;done=true;el.classList.add('splash--out');document.documentElement.classList.remove('splash-lock');setTimeout(function(){el.classList.add('splash--gone')},reduce?250:1100)}
function tick(now){p+=(target-p)*(reduce?1:.07);if(target-p<.002)p=target;el.style.setProperty('--p',p.toFixed(4));if(pct)pct.textContent=Math.round(p*100);
if(p>=1&&now-t0>(reduce?0:1100))return finish();requestAnimationFrame(tick)}
requestAnimationFrame(tick)})();`;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b0b12',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" as="image" href="/images/hero-worship.webp" fetchPriority="high" />
        <link rel="stylesheet" href="/css/styles.css" />
        <link rel="stylesheet" href="/css/blog.css" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body>
        <div className="blob-field" aria-hidden="true">
          <div className="blob blob-1" data-speed="0.04" />
          <div className="blob blob-2" data-speed="-0.06" />
          <div className="blob blob-3" data-speed="0.03" />
          <div className="blob blob-4" data-speed="-0.05" />
        </div>
        <RotatingBackdrop />
        <div id="splash" aria-hidden="true" suppressHydrationWarning>
          <div className="splash-orb splash-orb--a" />
          <div className="splash-orb splash-orb--b" />
          <div className="splash-core">
            <div className="splash-ring">
              <div className="splash-vessel">
                <div className="splash-liquid">
                  <svg className="splash-wave splash-wave--back" viewBox="0 0 240 20" preserveAspectRatio="none"><path d="M0 10 Q30 0 60 10 T120 10 T180 10 T240 10 V20 H0Z" /></svg>
                  <svg className="splash-wave" viewBox="0 0 240 20" preserveAspectRatio="none"><path d="M0 10 Q30 20 60 10 T120 10 T180 10 T240 10 V20 H0Z" /></svg>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/logo.jpg" alt="" width={64} height={64} className="splash-logo" />
              </div>
            </div>
            <div className="splash-word">{'TCH GLOBAL'.split('').map((c, i) => (<span key={i} style={{ animationDelay: `${0.15 + i * 0.05}s` }}>{c === ' ' ? '\u00a0' : c}</span>))}</div>
            <div className="splash-sub">The Comforter&rsquo;s House Global</div>
            <div className="splash-pct"><span id="splash-pct">0</span>%</div>
          </div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: SPLASH_SCRIPT }} />
        <CrystalLiquid />
        {children}
        <Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
          crossOrigin=""
          strategy="afterInteractive" />
        <Script src="/js/main.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
