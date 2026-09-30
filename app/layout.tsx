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
import BroadcastFrames from '@/components/decor/BroadcastFrames';

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

const SPLASH_HTML = `<style>@property --hole { syntax: '<percentage>'; inherits: false; initial-value: 0%; }html.splash-lock { overflow: hidden; }#splash {--p: 0;position: fixed; inset: 0; z-index: 9999;display: grid; place-items: center; overflow: hidden;background: radial-gradient(120% 90% at 50% 38%, #1d1340 0%, #0b0818 55%, #05040a 100%);color: #fff;-webkit-mask-image: radial-gradient(circle at 50% 44%, transparent var(--hole), #000 calc(var(--hole) + .5%));mask-image: radial-gradient(circle at 50% 44%, transparent var(--hole), #000 calc(var(--hole) + .5%));transition: --hole 1s cubic-bezier(.76, 0, .24, 1);}#splash.splash--out { --hole: 150%; }#splash.splash--gone { display: none; }.splash-orb { position: absolute; width: 60vmax; height: 60vmax; border-radius: 50%; opacity: .5; animation: splash-drift 9s ease-in-out infinite alternate; }.splash-orb--a { background: radial-gradient(circle, #7c3aed 0%, transparent 68%); top: -30vmax; left: -20vmax; }.splash-orb--b { background: radial-gradient(circle, #0891b2 0%, transparent 68%); bottom: -32vmax; right: -22vmax; animation-delay: -4s; }@keyframes splash-drift { to { transform: translate3d(6vmax, 4vmax, 0) scale(1.1); } }.splash-core { position: relative; display: flex; flex-direction: column; align-items: center; transition: transform 1s cubic-bezier(.76,0,.24,1), opacity .6s ease; }#splash.splash--out .splash-core { transform: scale(1.25); opacity: 0; }.splash-ring {position: relative; animation: splash-ring-in .6s 1.1s both; width: 132px; height: 132px; border-radius: 50%; padding: 5px;background: conic-gradient(from -90deg, #22d3ee, #7c3aed calc(var(--p) * 180deg), #f5c542 calc(var(--p) * 360deg), rgb(255 255 255 / .08) 0);box-shadow: 0 0 calc(20px + var(--p) * 40px) rgb(124 58 237 / calc(.25 + var(--p) * .35));}.splash-vessel { position: relative; width: 100%; height: 100%; border-radius: 50%; overflow: hidden; background: #0d0a1c; display: grid; place-items: center; box-shadow: inset 0 0 0 3px #0d0a1c; }.splash-liquid { position: absolute; left: 0; right: 0; bottom: 0; height: 100%; transform: translate3d(0, calc((1 - var(--p)) * 100% + 6%), 0); background: linear-gradient(180deg, #6d28d9, #0e7490 70%, #4338ca); }.splash-wave { position: absolute; left: 0; bottom: 100%; width: 200%; height: 14px; fill: #6d28d9; animation: splash-wave 2.2s linear infinite; margin-bottom: -1px; }.splash-wave--back { fill: #22d3ee; opacity: .55; animation-duration: 3.4s; animation-direction: reverse; height: 16px; }@keyframes splash-wave { to { transform: translate3d(-50%, 0, 0); } }.splash-logo { position: relative; width: 64px; height: 64px; border-radius: 50%; object-fit: cover; box-shadow: 0 0 0 3px rgb(255 255 255 / .9), 0 8px 24px rgb(0 0 0 / .5); }.splash-word { margin-top: 26px; font-family: var(--font-display, 'Syne', 'Arial Black', sans-serif); font-weight: 800; font-size: 1.9rem; letter-spacing: .02em; display: flex; }.splash-word span { display: inline-block; opacity: 0; transform: translateY(60%) rotateX(-70deg); transform-origin: 50% 100%; animation: splash-letter .7s cubic-bezier(.2, 1.4, .4, 1) forwards; }@keyframes splash-letter { to { opacity: 1; transform: none; } }.splash-sub { margin-top: 6px; font-size: .8rem; letter-spacing: .06em; color: rgb(255 255 255 / .7); opacity: 0; animation: splash-letter .8s 1.7s ease forwards; }.splash-pct { margin-top: 18px; font-family: var(--font-mono, 'JetBrains Mono', ui-monospace, monospace); font-size: .72rem; letter-spacing: .14em; color: #67e8f9; font-variant-numeric: tabular-nums; }@media (prefers-reduced-motion: reduce) {#splash { transition: opacity .25s ease; } #splash.splash--out { opacity: 0; }.splash-orb, .splash-wave, .splash-word span, .splash-sub { animation: none; opacity: 1; transform: none; }}.splash-draw { position: absolute; inset: -4px; width: calc(100% + 8px); height: calc(100% + 8px); z-index: 2; overflow: visible; animation: splash-draw-out .5s 1.25s forwards; }.sd-ring { fill: none; stroke: url(#sdg); stroke-width: 3; stroke-linecap: round; stroke-dasharray: 321; stroke-dashoffset: 321; transform: rotate(-90deg); transform-origin: center; animation: sd-draw 1.1s cubic-bezier(.6,0,.2,1) .1s forwards; }.sd-mono { font-family: var(--font-display, 'Syne', 'Arial Black', sans-serif); font-weight: 800; font-size: 23px; fill: transparent; stroke: #fff; stroke-width: .9; stroke-dasharray: 240; stroke-dashoffset: 240; animation: sd-draw 1s .3s ease forwards, sd-fill .35s 1s forwards; }.splash-vessel { animation: splash-vessel-in .5s 1.3s both; }@keyframes sd-draw { to { stroke-dashoffset: 0; } }@keyframes sd-fill { to { fill: #fff; stroke-width: 0; } }@keyframes splash-draw-out { to { opacity: 0; transform: scale(1.08); } }@keyframes splash-ring-in { from { background: transparent; box-shadow: none; } }@keyframes splash-vessel-in { from { opacity: 0; transform: scale(.85); } }@media (prefers-reduced-motion: reduce) { .splash-draw { display: none; } .splash-ring, .splash-vessel { animation: none; } }</style><div id="splash" aria-hidden="true"><div class="splash-orb splash-orb--a"></div><div class="splash-orb splash-orb--b"></div><div class="splash-core"><div class="splash-ring"><svg class="splash-draw" viewBox="0 0 110 110"><defs><linearGradient id="sdg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset=".5" stop-color="#7c3aed"/><stop offset="1" stop-color="#f5c542"/></linearGradient></defs><circle class="sd-ring" cx="55" cy="55" r="51"/><text class="sd-mono" x="55" y="65" text-anchor="middle">TCH</text></svg><div class="splash-vessel"><div class="splash-liquid"><svg class="splash-wave splash-wave--back" viewBox="0 0 240 20" preserveAspectRatio="none"><path d="M0 10 Q30 0 60 10 T120 10 T180 10 T240 10 V20 H0Z"/></svg><svg class="splash-wave" viewBox="0 0 240 20" preserveAspectRatio="none"><path d="M0 10 Q30 20 60 10 T120 10 T180 10 T240 10 V20 H0Z"/></svg></div><img src="/images/logo.jpg" alt="" width="64" height="64" class="splash-logo"></div></div><div class="splash-word"><span style="animation-delay:1.15s">T</span><span style="animation-delay:1.20s">C</span><span style="animation-delay:1.25s">H</span><span style="animation-delay:1.30s">&nbsp;</span><span style="animation-delay:1.35s">G</span><span style="animation-delay:1.40s">L</span><span style="animation-delay:1.45s">O</span><span style="animation-delay:1.50s">B</span><span style="animation-delay:1.55s">A</span><span style="animation-delay:1.60s">L</span></div><div class="splash-sub">The Comforter&rsquo;s House Global</div><div class="splash-pct"><span id="splash-pct">0</span>%</div></div></div>`;

const SPLASH_SCRIPT = `(function(){var el=document.getElementById('splash');if(!el)return;
try{if(localStorage.getItem('tch_splash_test_skip')){el.classList.add('splash--gone');return}var last=+localStorage.getItem('tch_splash_at')||0;if(Date.now()-last<1800000&&performance.getEntriesByType('navigation')[0]&&performance.getEntriesByType('navigation')[0].type==='navigate'&&document.referrer.indexOf(location.host)>-1){el.classList.add('splash--gone');return}localStorage.setItem('tch_splash_at',Date.now())}catch(e){}
document.documentElement.classList.add('splash-lock');
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,pct=document.getElementById('splash-pct'),t0=performance.now(),p=0,target=.12,done=false;
function add(v){target=Math.min(1,target+v);if(target>.99)target=1}
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){add(.28)});else add(.28);
var img=new Image();img.onload=img.onerror=function(){add(.3)};img.src='/images/hero-worship.webp';
if(document.readyState==='complete')add(.3);else addEventListener('load',function(){add(.3)});
setTimeout(function(){target=1},3500);
function finish(){if(done)return;done=true;el.classList.add('splash--out');document.documentElement.classList.remove('splash-lock');setTimeout(function(){el.classList.add('splash--gone')},reduce?250:1100)}
function tick(now){p+=(target-p)*(reduce?1:.07);if(target-p<.002)p=target;el.style.setProperty('--p',p.toFixed(4));if(pct)pct.textContent=Math.round(p*100);
if(p>.995&&now-t0>(reduce?0:2300))return finish();requestAnimationFrame(tick)}
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
        <BroadcastFrames />
        {children}
        <Script src="/js/main.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
