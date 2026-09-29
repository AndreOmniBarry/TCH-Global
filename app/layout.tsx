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
  icons: {
    icon: [
      { url: '/api/favicon?v=5', sizes: '64x64', type: 'image/png' },
      { url: '/icon-192.png?v=5', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.ico?v=5',
    apple: [{ url: '/apple-touch-icon.png?v=5', sizes: '180x180' }],
  },
};

const SPLASH_HTML = `<div id="splash" aria-hidden="true"><div class="splash-orb splash-orb--a"></div><div class="splash-orb splash-orb--b"></div><div class="splash-core"><div class="splash-ring"><div class="splash-vessel"><div class="splash-liquid"><svg class="splash-wave splash-wave--back" viewBox="0 0 240 20" preserveAspectRatio="none"><path d="M0 10 Q30 0 60 10 T120 10 T180 10 T240 10 V20 H0Z"/></svg><svg class="splash-wave" viewBox="0 0 240 20" preserveAspectRatio="none"><path d="M0 10 Q30 20 60 10 T120 10 T180 10 T240 10 V20 H0Z"/></svg></div><img src="/images/logo.jpg" alt="" width="64" height="64" class="splash-logo"></div></div><div class="splash-word"><span style="animation-delay:0.15s">T</span><span style="animation-delay:0.20s">C</span><span style="animation-delay:0.25s">H</span><span style="animation-delay:0.30s">&nbsp;</span><span style="animation-delay:0.35s">G</span><span style="animation-delay:0.40s">L</span><span style="animation-delay:0.45s">O</span><span style="animation-delay:0.50s">B</span><span style="animation-delay:0.55s">A</span><span style="animation-delay:0.60s">L</span></div><div class="splash-sub">The Comforter&rsquo;s House Global</div><div class="splash-pct"><span id="splash-pct">0</span>%</div></div></div>`;

const SPLASH_SCRIPT = `(function(){var el=document.getElementById('splash');if(!el)return;
try{if(sessionStorage.getItem('tch_splash_seen')){el.classList.add('splash--gone');return}var last=+localStorage.getItem('tch_splash_at')||0;if(Date.now()-last<1800000&&performance.getEntriesByType('navigation')[0]&&performance.getEntriesByType('navigation')[0].type==='navigate'&&document.referrer.indexOf(location.host)>-1){el.classList.add('splash--gone');return}localStorage.setItem('tch_splash_at',Date.now())}catch(e){}
document.documentElement.classList.add('splash-lock');
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,pct=document.getElementById('splash-pct'),t0=performance.now(),p=0,target=.12,done=false;
function add(v){target=Math.min(1,target+v);if(target>.99)target=1}
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){add(.28)});else add(.28);
var img=new Image();img.onload=img.onerror=function(){add(.3)};img.src='/images/hero-worship.webp';
if(document.readyState==='complete')add(.3);else addEventListener('load',function(){add(.3)});
setTimeout(function(){target=1},3500);
function finish(){if(done)return;done=true;el.classList.add('splash--out');document.documentElement.classList.remove('splash-lock');setTimeout(function(){el.classList.add('splash--gone')},reduce?250:1100)}
function tick(now){p+=(target-p)*(reduce?1:.07);if(target-p<.002)p=target;el.style.setProperty('--p',p.toFixed(4));if(pct)pct.textContent=Math.round(p*100);
if(p>.995&&now-t0>(reduce?0:1100))return finish();requestAnimationFrame(tick)}
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
        <div dangerouslySetInnerHTML={{ __html: SPLASH_HTML }} suppressHydrationWarning />
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
