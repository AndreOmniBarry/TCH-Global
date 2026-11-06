import type { Metadata, Viewport } from 'next';
import { asset } from '@/lib/asset-version';
import { SITE_URL } from '@/lib/site';
import '@fontsource/syne/latin-700.css';
import '@fontsource/syne/latin-800.css';
import '@fontsource/plus-jakarta-sans/latin-400.css';
import '@fontsource/plus-jakarta-sans/latin-500.css';
import '@fontsource/plus-jakarta-sans/latin-600.css';
import '@fontsource/jetbrains-mono/latin-600.css';
import Script from 'next/script';
import CrystalLiquid from '@/components/decor/CrystalLiquid';
import QuickDock from '@/components/QuickDock';
import TouchGlow from '@/components/decor/TouchGlow';
import JoinNudge from '@/components/members/JoinNudge';
import SessionWatcher from '@/components/members/SessionWatcher';
import BroadcastFrames from '@/components/decor/BroadcastFrames';

const DESCRIPTION = "TCH Global (The Comforter's House Global) is a church for every nation, led by Pastor Uzor Echiejile.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "TCH Global | The Comforter's House Global", template: '%s' },
  description: DESCRIPTION,
  applicationName: 'TCH Global',
  openGraph: {
    type: 'website',
    siteName: 'TCH Global',
    locale: 'en_NG',
    title: "TCH Global | The Comforter's House Global",
    description: DESCRIPTION,
    images: [{ url: '/images/hero-worship.webp', alt: 'Worship at TCH Global' }],
  },
  twitter: { card: 'summary_large_image', title: "TCH Global | The Comforter's House Global", description: DESCRIPTION, images: ['/images/hero-worship.webp'] },
  formatDetection: { telephone: false },
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

// Splash (home page, first visit per 30 min). Restrained by design: a slow
// aurora, the logo in a glowing ring that *is* the progress indicator
// (fonts + hero image + window load), a letter-by-letter wordmark, then an
// iris opens from the logo onto the page. No canvas, no particles: it costs
// almost nothing on low-end phones and never holds anyone for long.
const SPLASH_HTML = `<style>@property --hole{syntax:'<percentage>';inherits:false;initial-value:0%}html.splash-lock{overflow:hidden}
#splash{--p:0;position:fixed;inset:0;z-index:9999;display:none;place-items:center;overflow:hidden;color:#fff;background:#06050c;-webkit-mask-image:radial-gradient(circle at 50% 40%,transparent var(--hole),#000 calc(var(--hole) + .6%));mask-image:radial-gradient(circle at 50% 40%,transparent var(--hole),#000 calc(var(--hole) + .6%));transition:--hole .95s cubic-bezier(.7,0,.2,1)}
#splash.splash--out{--hole:150%}html.splash-show #splash{display:grid}#splash.splash--gone{display:none!important}
.sp-aura{position:absolute;inset:-20%;pointer-events:none;filter:blur(60px);opacity:.9}
.sp-aura i{position:absolute;border-radius:50%;mix-blend-mode:screen}
.sp-aura i:nth-child(1){width:70vmax;height:70vmax;left:-10%;top:-15%;background:radial-gradient(closest-side,rgb(124 58 237/.55),transparent);animation:sp-drift1 9s ease-in-out infinite alternate}
.sp-aura i:nth-child(2){width:60vmax;height:60vmax;right:-15%;bottom:-10%;background:radial-gradient(closest-side,rgb(34 211 238/.32),transparent);animation:sp-drift2 11s ease-in-out infinite alternate}
.sp-aura i:nth-child(3){width:40vmax;height:40vmax;left:30%;top:35%;background:radial-gradient(closest-side,rgb(245 197 66/.12),transparent);animation:sp-drift1 13s ease-in-out infinite alternate-reverse}
@keyframes sp-drift1{to{transform:translate3d(8%,6%,0) scale(1.1)}}@keyframes sp-drift2{to{transform:translate3d(-7%,-5%,0) scale(1.08)}}
.sp-grain{position:absolute;inset:0;pointer-events:none;opacity:.07;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.sp-core{position:relative;display:grid;justify-items:center;transform:translateY(-6vh);transition:transform .95s cubic-bezier(.7,0,.2,1),opacity .5s ease}
#splash.splash--out .sp-core{transform:translateY(-6vh) scale(1.12);opacity:0}
.sp-mark{position:relative;width:132px;height:132px;display:grid;place-items:center}
.sp-ring{position:absolute;inset:0;transform:rotate(-90deg);overflow:visible}
.sp-ring circle{fill:none;stroke-width:2;stroke-linecap:round}
.sp-ring .sp-track{stroke:rgb(255 255 255/.08)}
.sp-ring .sp-fill{stroke:url(#sp-g);stroke-dasharray:100;stroke-dashoffset:calc(100 - var(--p)*100);filter:drop-shadow(0 0 6px rgb(34 211 238/.55))}
.sp-glow{position:absolute;inset:14px;border-radius:50%;background:radial-gradient(closest-side,rgb(124 58 237/.55),transparent 75%);filter:blur(14px);opacity:calc(.35 + var(--p)*.65)}
.sp-logo{position:relative;width:92px;height:92px;border-radius:50%;object-fit:cover;opacity:0;transform:scale(.86);filter:blur(10px);box-shadow:0 0 0 1px rgb(255 255 255/.14),0 18px 40px -12px rgb(0 0 0/.8);animation:sp-in .9s .1s cubic-bezier(.2,.8,.2,1) forwards}
@keyframes sp-in{to{opacity:1;transform:none;filter:none}}
.sp-word{margin-top:30px;display:flex;gap:.02em;font:800 clamp(1.8rem,8.2vw,2.8rem)/1 var(--font-display,'Syne','Arial Black',sans-serif);letter-spacing:-.02em;overflow:hidden;padding:.08em .04em .14em}
.sp-word span{display:inline-block;transform:translateY(110%);animation:sp-up .8s cubic-bezier(.2,.9,.2,1) forwards}
.sp-word .sp-sp{width:.28em}
.sp-word em{font-style:normal;display:inline-block;transform:translateY(110%);animation:sp-up .8s cubic-bezier(.2,.9,.2,1) forwards}
@keyframes sp-up{to{transform:none}}
.sp-sub{margin-top:14px;font:500 .7rem var(--font-mono,'JetBrains Mono',ui-monospace,monospace);letter-spacing:.24em;text-transform:uppercase;color:rgb(255 255 255/.55);opacity:0;animation:sp-fade .8s .85s ease forwards}
@keyframes sp-fade{to{opacity:1}}
@media (prefers-reduced-motion:reduce){#splash{transition:opacity .25s ease}#splash.splash--out{opacity:0}.sp-aura i,.sp-logo,.sp-word span,.sp-word em,.sp-sub{animation:none!important;opacity:1;transform:none;filter:none}}
</style><div id="splash" aria-hidden="true"><div class="sp-aura"><i></i><i></i><i></i></div><div class="sp-grain"></div><div class="sp-core"><div class="sp-mark"><div class="sp-glow"></div><svg class="sp-ring" viewBox="0 0 132 132"><defs><linearGradient id="sp-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a78bfa"/><stop offset=".6" stop-color="#22d3ee"/><stop offset="1" stop-color="#f5c542"/></linearGradient></defs><circle class="sp-track" cx="66" cy="66" r="62"/><circle class="sp-fill" cx="66" cy="66" r="62" pathLength="100"/></svg><img src="/images/logo.jpg" alt="" width="92" height="92" class="sp-logo"></div><div class="sp-word">${'TCH'.split('').map((c, i) => `<span style="animation-delay:${0.3 + i * 0.05}s">${c}</span>`).join('')}<span class="sp-sp"></span>${'Global'.split('').map((c, i) => { const k = i / 5; const mix = (a: number, b: number) => Math.round(a + (b - a) * k); return `<em style="animation-delay:${(0.48 + i * 0.05).toFixed(2)}s;color:rgb(${mix(196, 103)} ${mix(181, 232)} ${mix(253, 249)})">${c}</em>`; }).join('')}</div><div class="sp-sub">The Comforter&rsquo;s House Global</div></div></div>`;
const SPLASH_SCRIPT = `(function(){var el=document.getElementById('splash');if(!el)return;
try{if(location.pathname!=='/'||localStorage.getItem('tch_splash_test_skip')){el.classList.add('splash--gone');return}var nav=performance.getEntriesByType('navigation')[0];var last=+localStorage.getItem('tch_splash_at')||0;if(Date.now()-last<1800000&&nav&&nav.type==='navigate'&&document.referrer.indexOf(location.host)>-1){el.classList.add('splash--gone');return}localStorage.setItem('tch_splash_at',Date.now())}catch(e){}
document.documentElement.classList.add('splash-lock','splash-show');
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,t0=performance.now(),p=0,target=.1,done=false;
function add(v){target=Math.min(1,target+v);if(target>.99)target=1}
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){add(.3)});else add(.3);
var img=new Image();img.onload=img.onerror=function(){add(.3)};img.src='/images/hero-worship.webp';
if(document.readyState==='complete')add(.3);else addEventListener('load',function(){add(.3)});
setTimeout(function(){target=1},2600);
function finish(){if(done)return;done=true;el.classList.add('splash--out');document.documentElement.classList.remove('splash-lock');setTimeout(function(){el.classList.add('splash--gone');document.documentElement.classList.remove('splash-show')},reduce?250:1000)}
function tick(now){p+=(target-p)*(reduce?1:.09);if(target-p<.002)p=target;el.style.setProperty('--p',p.toFixed(4));
if(p>.995&&now-t0>(reduce?0:1750))return finish();requestAnimationFrame(tick)}
requestAnimationFrame(tick)})();`;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b0b12',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preload" as="image" href="/images/hero-worship.webp" fetchPriority="high" />
        <link rel="stylesheet" href={asset("/css/styles.css")} />
        <link rel="stylesheet" href="/css/blog.css" />
      </head>
      <body>
        <div className="blob-field" aria-hidden="true">
          <div className="blob blob-1" data-speed="0.04" />
          <div className="blob blob-2" data-speed="-0.06" />
          <div className="blob blob-3" data-speed="0.03" />
          <div className="blob blob-4" data-speed="-0.05" />
        </div>
        <div dangerouslySetInnerHTML={{ __html: SPLASH_HTML }} suppressHydrationWarning />
        <script dangerouslySetInnerHTML={{ __html: SPLASH_SCRIPT }} />
        <CrystalLiquid />
        <QuickDock />
        <TouchGlow />
        <JoinNudge />
        <SessionWatcher />
        <BroadcastFrames />
        {children}
        <Script src={asset("/js/main.js")} strategy="afterInteractive" />
      </body>
    </html>
  );
}
