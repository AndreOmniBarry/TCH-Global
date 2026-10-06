import type { Metadata, Viewport } from 'next';
import '@fontsource/syne/latin-700.css';
import '@fontsource/syne/latin-800.css';
import '@fontsource/plus-jakarta-sans/latin-400.css';
import '@fontsource/plus-jakarta-sans/latin-500.css';
import '@fontsource/plus-jakarta-sans/latin-600.css';
import '@fontsource/jetbrains-mono/latin-600.css';
import Script from 'next/script';
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

const SPLASH_HTML = `<style>@property --hole{syntax:'<percentage>';inherits:false;initial-value:0%}html.splash-lock{overflow:hidden}#splash{--p:0;position:fixed;inset:0;z-index:9999;display:grid;place-items:center;overflow:hidden;color:#fff;background:radial-gradient(120% 90% at 50% 40%,#1d1340 0%,#0b0818 55%,#05040a 100%);-webkit-mask-image:radial-gradient(circle at 50% 42%,transparent var(--hole),#000 calc(var(--hole) + .5%));mask-image:radial-gradient(circle at 50% 42%,transparent var(--hole),#000 calc(var(--hole) + .5%));transition:--hole 1s cubic-bezier(.76,0,.24,1)}#splash.splash--out{--hole:150%}#splash.splash--gone{display:none}#splash-sparks{position:absolute;inset:0;width:100%;height:100%}.splash-core{position:relative;display:grid;justify-items:center;transform:translateY(-4vh);transition:transform 1s cubic-bezier(.76,0,.24,1),opacity .6s ease}#splash.splash--out .splash-core{transform:translateY(-4vh) scale(1.2);opacity:0}.splash-logo{width:84px;height:84px;border-radius:50%;object-fit:cover;opacity:0;transform:scale(.6);box-shadow:0 0 0 3px rgb(255 255 255 / .9),0 0 40px rgb(124 58 237 / .7),0 0 90px rgb(34 211 238 / .35);animation:sp-logo .7s 1.15s cubic-bezier(.3,1.5,.5,1) forwards}@keyframes sp-logo{to{opacity:1;transform:none}}.splash-slot{margin-top:78px;height:1.2em;overflow:hidden;font:800 clamp(1.7rem,8vw,2.6rem)/1.2 var(--font-display,'Syne','Arial Black',sans-serif);letter-spacing:-.01em}.splash-reel{display:grid;animation:sp-reel 2.1s .15s cubic-bezier(.7,0,.2,1) forwards}.splash-reel span{height:1.2em;text-align:center;white-space:nowrap}.splash-reel span:last-child{font-style:italic;background:linear-gradient(120deg,#a78bfa,#22d3ee 60%,#f5c542);-webkit-background-clip:text;background-clip:text;color:transparent}@keyframes sp-reel{0%{transform:translateY(0)}18%{transform:translateY(-1.2em)}36%{transform:translateY(-2.4em)}54%{transform:translateY(-3.6em)}72%,100%{transform:translateY(-4.8em)}}.splash-line{width:min(220px,60vw);height:2px;margin-top:14px;background:rgb(255 255 255 / .12);border-radius:2px;overflow:hidden}.splash-line i{display:block;height:100%;width:100%;transform-origin:left;transform:scaleX(var(--p));background:linear-gradient(90deg,#7c3aed,#22d3ee,#f5c542)}.splash-sub{margin-top:12px;font:500 .72rem var(--font-mono,'JetBrains Mono',ui-monospace,monospace);letter-spacing:.16em;text-transform:uppercase;color:rgb(255 255 255 / .6)}@media (prefers-reduced-motion:reduce){#splash{transition:opacity .25s ease}#splash.splash--out{opacity:0}.splash-reel{animation:none;transform:translateY(-4.8em)}.splash-logo{animation:none;opacity:1;transform:none}}</style><div id="splash" aria-hidden="true"><canvas id="splash-sparks"></canvas><div class="splash-core"><img src="/images/logo.jpg" alt="" width="84" height="84" class="splash-logo"><div class="splash-slot"><div class="splash-reel"><span>Worship</span><span>The Word</span><span>Prayer</span><span>Family</span><span>TCH Global</span></div></div><div class="splash-line"><i></i></div><div class="splash-sub">The Comforter&rsquo;s House Global</div></div></div>`;

const SPLASH_SCRIPT = `(function(){var el=document.getElementById('splash');if(!el)return;
try{if(localStorage.getItem('tch_splash_test_skip')){el.classList.add('splash--gone');return}var nav=performance.getEntriesByType('navigation')[0];var last=+localStorage.getItem('tch_splash_at')||0;if(Date.now()-last<1800000&&nav&&nav.type==='navigate'&&document.referrer.indexOf(location.host)>-1){el.classList.add('splash--gone');return}localStorage.setItem('tch_splash_at',Date.now())}catch(e){}
document.documentElement.classList.add('splash-lock');
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,t0=performance.now(),p=0,target=.12,done=false;
function add(v){target=Math.min(1,target+v);if(target>.99)target=1}
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){add(.28)});else add(.28);
var img=new Image();img.onload=img.onerror=function(){add(.3)};img.src='/images/hero-worship.webp';
if(document.readyState==='complete')add(.3);else addEventListener('load',function(){add(.3)});
setTimeout(function(){target=1},3500);
var cv=document.getElementById('splash-sparks'),cx=cv&&cv.getContext('2d'),parts=[],W=0,H=0,dpr=Math.min(devicePixelRatio||1,1.5);
function size(){W=cv.width=innerWidth*dpr;H=cv.height=innerHeight*dpr}
if(cx&&!reduce){size();var n=innerWidth<700?150:240,cols=['#22d3ee','#7c3aed','#f5c542','#ffffff','#a78bfa'];
for(var i=0;i<n;i++){var a=Math.random()*6.283,d=Math.max(W,H)*(.55+Math.random()*.5),ta=i/n*6.283;parts.push({a:a,d:d,ta:ta,dl:Math.random()*.45,c:cols[i%5],r:(1+Math.random()*1.6)*dpr})}}
function sparks(t){if(!cx||reduce)return;cx.clearRect(0,0,W,H);var lb=el.querySelector('.splash-logo').getBoundingClientRect(),ox=(lb.left+lb.width/2)*dpr,oy=(lb.top+lb.height/2)*dpr,R=64*dpr,spin=t*.35;
for(var i=0;i<parts.length;i++){var q=parts[i],k=Math.min(1,Math.max(0,(t-q.dl)/1.25)),e=1-Math.pow(1-k,4);
var sx=ox+Math.cos(q.a)*q.d,sy=oy+Math.sin(q.a)*q.d,ang=q.ta+spin*e,tx=ox+Math.cos(ang)*R,ty=oy+Math.sin(ang)*R;
cx.globalAlpha=.35+.65*e;cx.fillStyle=q.c;cx.beginPath();cx.arc(sx+(tx-sx)*e,sy+(ty-sy)*e,q.r,0,6.283);cx.fill()}
cx.globalAlpha=1;if(t>1.2){var g=Math.min(1,(t-1.2)/.6);cx.strokeStyle='rgba(167,139,250,'+(.55*g)+')';cx.lineWidth=2*dpr;cx.shadowColor='#22d3ee';cx.shadowBlur=18*dpr*g;cx.beginPath();cx.arc(ox,oy,R,0,6.283);cx.stroke();cx.shadowBlur=0}}
function finish(){if(done)return;done=true;el.classList.add('splash--out');document.documentElement.classList.remove('splash-lock');setTimeout(function(){el.classList.add('splash--gone');parts=[]},reduce?250:1100)}
function tick(now){var t=(now-t0)/1000;p+=(target-p)*(reduce?1:.07);if(target-p<.002)p=target;el.style.setProperty('--p',p.toFixed(4));sparks(t);
if(p>.995&&now-t0>(reduce?0:2400))return finish();requestAnimationFrame(tick)}
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
