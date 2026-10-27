'use client';

import { useEffect } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

const SELECTOR = '.btn, .liquid';

const vertex = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// Water, not effects: the surface is a real height field (see step()),
// and everything the shader draws is derived from it. Slope gives the
// glint on the waterline, curvature focuses light into caustics below,
// depth absorbs light (Beer-Lambert), and water wets the glass, so the
// line climbs a few pixels at each wall.
const N = 40;
const fragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform float uLevel;
uniform vec4 uH[10];
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;
uniform float uDark;
uniform float uSeed;

float bsp(float t) {
  t = abs(t);
  if (t < 0.5) return 0.75 - t * t;
  if (t < 1.5) { float a = 1.5 - t; return 0.5 * a * a; }
  return 0.0;
}
void acc(float i, float hv, vec3 fx, inout vec3 h, inout vec3 w) {
  vec3 k = vec3(bsp(fx.x - i), bsp(fx.y - i), bsp(fx.z - i));
  h += k * hv;
  w += k;
}
// Smooth (quadratic B-spline) surface at x-e, x, x+e.
vec3 surface(float x, float e) {
  vec3 fx = vec3(x - e, x, x + e) * ${N - 1}.0;
  vec3 h = vec3(0.0);
  vec3 w = vec3(1e-5);
  for (int j = 0; j < 10; j++) {
    vec4 q = uH[j];
    float b = float(j * 4);
    acc(b, q.x, fx, h, w);
    acc(b + 1.0, q.y, fx, h, w);
    acc(b + 2.0, q.z, fx, h, w);
    acc(b + 3.0, q.w, fx, h, w);
  }
  return h / w;
}
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;
  float px = 1.0 / uRes.y;
  float e = 2.0 / uRes.x;

  vec3 s = surface(uv.x, e);
  // Meniscus: water wets the glass and climbs ~3px at each wall.
  float wallPx = min(uv.x, 1.0 - uv.x) * uRes.x;
  float surf = uLevel + s.y + 3.0 * px * exp(-wallPx / 5.0);
  float d = surf - uv.y;
  if (d < -6.0 * px) { gl_FragColor = vec4(0.0); return; }

  // Slope in screen terms (height units per height unit).
  float slope = (s.z - s.x) / (2.0 * e) / aspect;
  float curv = (s.z - 2.0 * s.y + s.x) / (e * e);

  float inside = smoothstep(-0.9 * px, 0.9 * px, d);

  // Body colour: the brand liquid, lit from above and absorbed with depth.
  float g = clamp(0.62 * uv.x + 0.38 * (1.0 - uv.y), 0.0, 1.0);
  vec3 col = g < 0.5 ? mix(uColA, uColB, g * 2.0) : mix(uColB, uColC, g * 2.0 - 1.0);
  float depth = clamp(d, 0.0, 1.2);
  col *= exp(-depth * 0.42) * 1.12;

  // Caustics: light through a moving surface makes a soft, wavy net of
  // bright lines that drifts with the waves. The net is ridge noise warped
  // by the surface slope; where the surface curves like a lens it focuses
  // more light, so the net brightens under passing troughs.
  vec3 sr = surface(uv.x + slope * depth * 0.25, e * 4.0);
  float lens = -(sr.z - 2.0 * sr.y + sr.x) / (16.0 * e * e);
  vec2 cp = vec2(uv.x * aspect, uv.y) * vec2(4.2, 5.5) + vec2(slope * 3.0 + uSeed, -uTime * 0.18);
  float n1 = noise(cp + vec2(0.0, uTime * 0.11));
  float n2 = noise(cp * 1.7 + vec2(uTime * 0.07, 3.1));
  float ridge = pow(1.0 - abs(n1 + n2 - 1.0), 7.0);
  float caus = ridge * (0.6 + clamp(lens * 0.35, 0.0, 0.9));
  col += caus * (0.07 + 0.035 * uDark) * smoothstep(0.03, 0.2, depth) * (1.0 - smoothstep(0.55, 1.2, depth));

  // Just under the surface we see it from below at a grazing angle:
  // total internal reflection makes a bright silvery band.
  float under = exp(-max(d, 0.0) / (3.5 * px));
  col += under * (0.10 + clamp(abs(slope) * 2.0, 0.0, 0.25));

  // Waterline: a thin highlight whose brightness follows the slope facing
  // the light (from the upper left), so crests glint as they travel.
  float line = exp(-abs(d) / (1.0 * px));
  float spec = 0.55 + clamp(-slope * 3.0, -0.2, 0.45) + clamp(-curv * 0.002, 0.0, 0.15);
  col = mix(col, vec3(1.0), line * clamp(spec, 0.35, 1.0));
  // The surface seen from just above: a faint bright film over the line.
  col += exp(-max(-d, 0.0) / (2.0 * px)) * step(d, 0.0) * 0.12;

  // The glass in front: one soft diagonal reflection, and walls that
  // darken the liquid slightly where it touches them.
  float diag = uv.x * aspect * 0.18 - uv.y;
  col += exp(-pow((diag + 0.36) / 0.06, 2.0)) * 0.10;
  float rim = smoothstep(0.0, 0.08, min(min(uv.x, 1.0 - uv.x) * aspect, uv.y));
  col *= mix(0.88, 1.0, rim);
  col = mix(col, col * 1.06 + 0.015, uDark);

  float alpha = max(inside, line * 0.6);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0) * alpha, alpha);
}
`;

type Liquid = {
  el: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  visible: boolean;
  level: number;
  vel: number;
  /** Surface height (relative to the level) and vertical speed per column. */
  H: Float32Array;
  V: Float32Array;
  /** H plus the tilt plane: what the shader draws. */
  U: number[];
  plane: number;
  nextStir: number;
  seed: number;
  colA: number[];
  colB: number[];
  colC: number[];
  w: number;
  h: number;
  on: boolean;
  fillN: number;
  cleared: boolean;
  mx: number;
  my: number;
  hover: boolean;
  nextAt?: number;
};

// Shallow-water surface along the button's width: N columns, walls at both
// ends that reflect waves, viscosity that kills short ripples faster than
// the slosh (as in real water), and mean height held at zero so the volume
// never changes. Wave speed grows with depth (c = sqrt(g*depth)): a nearly
// empty button sloshes slowly, a full one quickly.
function step(l: Liquid, dt: number) {
  const H = l.H;
  const V = l.V;
  const depth = Math.min(Math.max(l.level, 0.05), 1);
  const c = 1.1 + 2.4 * Math.sqrt(depth); // button widths per second
  const k = (c * (N - 1)) ** 2;
  const n = Math.max(1, Math.ceil((c * dt * (N - 1)) / 0.4));
  const h = dt / n;
  const damp = 0.9; // overall loss
  const visc = 1.5 * h; // extra loss on short wavelengths
  for (let s = 0; s < n; s++) {
    for (let i = 0; i < N; i++) {
      const a = H[i === 0 ? 1 : i - 1];
      const b = H[i === N - 1 ? N - 2 : i + 1];
      const va = V[i === 0 ? 1 : i - 1];
      const vb = V[i === N - 1 ? N - 2 : i + 1];
      V[i] += (k * (a + b - 2 * H[i]) - damp * V[i]) * h + visc * (va + vb - 2 * V[i]);
    }
    let mean = 0;
    for (let i = 0; i < N; i++) { H[i] += V[i] * h; mean += H[i]; }
    mean /= N;
    for (let i = 0; i < N; i++) H[i] = Math.max(-0.45, Math.min(0.45, H[i] - mean));
  }
}

// Push the surface down around x (0-1): a drop, a fingertip, a pour.
function poke(l: Liquid, x: number, strength: number, width = 0.035) {
  for (let i = 0; i < N; i++) {
    const dx = i / (N - 1) - x;
    l.V[i] -= strength * Math.exp(-(dx * dx) / (2 * width * width));
  }
}

function parseHex(value: string, fallback: number[]): number[] {
  const hex = value.trim().replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return fallback;
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
}

function isDarkTheme() {
  const theme = document.documentElement.dataset.theme;
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Crystal-liquid fill for every button on the site. One shared WebGL
 * context renders each visible button's liquid in turn and copies it
 * into that button's own 2D canvas — browsers cap live WebGL contexts
 * at ~16, so a context per button would break on busy pages. Level,
 * slosh and waves are spring-simulated from scroll position/velocity,
 * so the liquid lags, overshoots and settles like a real fluid. When
 * WebGL or motion is unavailable, the CSS clip-path fill in styles.css
 * stays in charge. */
export default function CrystalLiquid() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let renderer: Renderer;
    try {
      renderer = new Renderer({
        dpr: 1,
        alpha: true,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        antialias: false,
        depth: false,
      });
    } catch {
      return;
    }
    const gl = renderer.gl;
    if (!gl) return;

    const program = new Program(gl, {
      vertex,
      fragment,
      depthTest: false,
      depthWrite: false,
      cullFace: false,
      uniforms: {
        uRes: { value: [1, 1] },
        uTime: { value: 0 },
        uLevel: { value: 0 },
        // A plain array: OGL only maps uniform arrays (uH[0]..) from Array values.
        uH: { value: new Array(N).fill(0) },
        uColA: { value: [1, 0, 0] },
        uColB: { value: [1, 0, 0] },
        uColC: { value: [1, 0, 0] },
        uDark: { value: 0 },
        uSeed: { value: 0 },
      },
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
    const glCanvas = gl.canvas as HTMLCanvasElement;
    let glW = 0;
    let glH = 0;
    let dark = isDarkTheme();
    let lost = false;

    const liquids = new Map<HTMLElement, Liquid>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const l = liquids.get(entry.target as HTMLElement);
          if (l) l.visible = entry.isIntersecting;
        }
      },
      { rootMargin: '40% 0px' }
    );

    function readColors(l: Liquid) {
      const cs = getComputedStyle(l.el);
      l.colA = parseHex(cs.getPropertyValue('--liquid-a'), [0.26, 0.22, 0.79]);
      l.colB = parseHex(cs.getPropertyValue('--liquid-b'), [0.49, 0.23, 0.93]);
      l.colC = parseHex(cs.getPropertyValue('--liquid-c'), [0.05, 0.45, 0.56]);
    }

    function attach(el: HTMLElement) {
      if (liquids.has(el)) return;
      const canvas = document.createElement('canvas');
      canvas.className = 'liquid-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      el.prepend(canvas);
      el.classList.add('btn--gl');
      const l: Liquid = {
        el,
        canvas,
        ctx,
        visible: false,
        level: -0.12,
        vel: 0,
        H: new Float32Array(N),
        V: new Float32Array(N),
        U: new Array(N).fill(0),
        plane: 0,
        nextStir: Math.random() * 2,
        seed: Math.random() * 100,
        colA: [],
        colB: [],
        colC: [],
        w: 0,
        h: 0,
        on: false,
        fillN: -1,
        cleared: true,
        mx: 0.5,
        my: 0.5,
        hover: false,
      };
      readColors(l);
      liquids.set(el, l);
      io.observe(el);
    }

    function detach(l: Liquid) {
      io.unobserve(l.el);
      l.canvas.remove();
      l.el.classList.remove('btn--gl');
      delete l.el.dataset.liquid;
      l.el.style.removeProperty('--fill-n');
      liquids.delete(l.el);
    }

    function scan() {
      document.querySelectorAll<HTMLElement>(SELECTOR).forEach(attach);
      liquids.forEach((l) => {
        if (!l.el.isConnected) detach(l);
      });
    }
    scan();

    let scanTimer = 0;
    const mo = new MutationObserver(() => {
      window.clearTimeout(scanTimer);
      scanTimer = window.setTimeout(scan, 250);
    });
    mo.observe(document.body, { childList: true, subtree: true });

    function onThemeChange() {
      dark = isDarkTheme();
      liquids.forEach(readColors);
    }
    const themeMo = new MutationObserver(onThemeChange);
    themeMo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', onThemeChange);

    // Phone tilt: the liquid levels against gravity as the phone rolls
    // (gamma). iOS needs a one-time permission from a user gesture.
    let deviceTilt = 0;
    function onOrient(e: DeviceOrientationEvent) {
      const g = Math.max(-35, Math.min(35, e.gamma ?? 0));
      deviceTilt += (-(g / 35) * 0.2 - deviceTilt) * 0.2;
    }
    let orientAsked = false;
    function enableTilt() {
      if (orientAsked) return;
      orientAsked = true;
      const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
      if (DOE && typeof DOE.requestPermission === 'function') {
        return;
      } else if ('DeviceOrientationEvent' in window) {
        window.addEventListener('deviceorientation', onOrient);
      }
    }
    if (window.matchMedia('(pointer: coarse)').matches) {
      window.addEventListener('touchend', enableTilt, { once: true, passive: true });
    }

    let hovered: Liquid | null = null;
    function onPointerMove(e: PointerEvent) {
      const target = (e.target as Element | null)?.closest?.(SELECTOR) as HTMLElement | null;
      const l = target ? liquids.get(target) ?? null : null;
      if (hovered && hovered !== l) hovered.hover = false;
      hovered = l;
      if (!l) return;
      const r = l.el.getBoundingClientRect();
      const mx = (e.clientX - r.left) / r.width;
      const my = 1 - (e.clientY - r.top) / r.height;
      // A fingertip moving through the water pushes a small wake.
      if (l.hover && my < l.level + 0.08) {
        const speed = Math.min(Math.abs(mx - l.mx) * 40, 2.5);
        if (speed > 0.05) poke(l, mx, speed, 0.05);
      }
      l.mx = mx;
      l.my = my;
      l.hover = true;
    }
    function onPointerLeaveDoc() {
      if (hovered) hovered.hover = false;
      hovered = null;
    }
    function onPointerDown(e: PointerEvent) {
      onPointerMove(e);
      if (hovered) {
        // A tap is a drop: one ring that runs out, bounces off the walls
        // and dies away.
        poke(hovered, hovered.mx, 6, 0.03);
        if (e.pointerType !== 'mouse') hovered.hover = false;
      }
    }
    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerleave', onPointerLeaveDoc);

    function onLost(e: Event) {
      e.preventDefault();
      lost = true;
      liquids.forEach(detach);
    }
    glCanvas.addEventListener('webglcontextlost', onLost);

    // Leaving the page: give the canvas memory back. iPhone Safari keeps
    // the previous page alive for the back button, and a page full of
    // button canvases plus the next page was enough to crash the tab.
    function onPageHide() {
      liquids.forEach((l) => { l.canvas.width = 0; l.canvas.height = 0; l.w = 0; l.h = 0; l.cleared = true; });
      glW = 0; glH = 0;
      renderer.setSize(1, 1);
    }
    window.addEventListener('pagehide', onPageHide);

    const coarse = window.matchMedia('(pointer: coarse)').matches;
    let frameNo = 0;
    let raf = 0;
    let last = performance.now();
    let lastScroll = window.scrollY;
    let splashEnd = 0;
    let scrollVel = 0;
    const t0 = last;

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (lost) return;
      const dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;
      const sy = window.scrollY;
      const rawVel = dt > 0 ? (sy - lastScroll) / dt : 0;
      lastScroll = sy;
      const prevVel = scrollVel;
      scrollVel += (rawVel - scrollVel) * 0.25;
      const scrollAcc = dt > 0 ? (scrollVel - prevVel) / dt : 0;

      const vh = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1);
      if (document.hidden) return;
      let drawnThisFrame = 0;
      frameNo += 1;
      const drawThisFrame = !coarse || frameNo % 2 === 0;
      const time = (now - t0) / 1000;

      const order = Array.from(liquids.values());
      const offset = order.length ? frameNo % order.length : 0;
      for (let k = 0; k < order.length; k++) {
        const l = order[(k + offset) % order.length];
        if (!l.visible) continue;
        const rect = l.el.getBoundingClientRect();
        // Layout size, not the on-screen (transformed) size: sections scale
        // as they scroll in, and resizing the canvas every frame wiped it,
        // which was the blinking.
        const bw = l.el.offsetWidth;
        const bh = l.el.offsetHeight;
        if (!bw || !bh) continue;

        // Buttons already on the first screen can't be scrolled any higher,
        // so they fill completely instead of sitting half full.
        const aboveFold = rect.top + sy < vh * 0.95;
        // Fill as the button comes fully into view from below, drain as it
        // leaves at the top. Anything fully on screen is full, so buttons at
        // the very bottom of the page (the footer icons) fill too.
        const band = Math.max(40, vh * 0.12);
        const entering = (vh * 0.98 - rect.bottom) / band;
        const leaving = (rect.top + rect.height * 0.3) / band;
        let progress = Math.min(Math.max(Math.min(entering, leaving), 0), 1);
        if (aboveFold) {
          // First-screen buttons can't be scrolled higher: once the splash
          // lifts they pour full over ~1.4s, staggered left to right.
          if (document.documentElement.classList.contains('splash-lock')) { splashEnd = 0; progress = 0; }
          else {
            if (!splashEnd) splashEnd = now;
            const delay = 250 + (rect.left / Math.max(1, window.innerWidth)) * 350 + (rect.top + sy) / vh * 200;
            const pour = Math.min(1, Math.max(0, (now - splashEnd - delay) / 1400));
            progress = pour;
          }
        }
        // Full means full: the surface settles just above the rim, so the
        // button is filled edge to edge and only waves dip below it.
        const target = -0.14 + progress * 1.18;

        // Level: critically damped. Water poured in doesn't overshoot; it
        // just arrives, and the pour stirs the surface where it lands.
        const acc = 110 * (target - l.level) - 21 * l.vel;
        l.vel += acc * dt;
        l.level += l.vel * dt;
        if (Math.abs(l.vel) > 0.08 && l.level > 0) {
          poke(l, 0.18 + Math.random() * 0.1, Math.min(Math.abs(l.vel), 1.2) * 40 * dt * Math.random(), 0.04);
        }

        // Phone tilt: the water stays level with the ground, so relative to
        // the screen its surface tilts. Shift the plane under the surface
        // and let the waves carry the change, which is the slosh.
        const aspect = bw / bh;
        const plane = Math.max(-0.6, Math.min(0.6, -deviceTilt * aspect));
        const dPlane = plane - l.plane;
        if (dPlane) {
          for (let i = 0; i < N; i++) l.H[i] -= dPlane * (i / (N - 1) - 0.5);
          l.plane = plane;
        }
        // A sharp stop or start of scrolling jolts the glass: a small
        // centre-versus-edges wobble.
        if (Math.abs(scrollAcc) > 4000) {
          const j = Math.max(-1, Math.min(1, scrollAcc / 40000)) * 3 * dt;
          for (let i = 0; i < N; i++) l.V[i] += j * Math.cos((2 * Math.PI * i) / (N - 1));
        }
        // Air never leaves water perfectly still: a faint stir now and then.
        if (time > l.nextStir) {
          poke(l, Math.random(), 0.15 + Math.random() * 0.15, 0.08);
          l.nextStir = time + 0.8 + Math.random() * 1.6;
        }
        step(l, dt);
        // Draw the tilt as part of the surface.
        if (l.plane) for (let i = 0; i < N; i++) l.U[i] = l.H[i] + l.plane * (i / (N - 1) - 0.5);
        else for (let i = 0; i < N; i++) l.U[i] = l.H[i];

        const fillN = Math.min(Math.max(l.level, 0), 1);
        if (Math.abs(fillN - l.fillN) > 0.004) {
          l.fillN = fillN;
          l.el.style.setProperty('--fill-n', fillN.toFixed(3));
        }
        const on = l.level > 0.52;
        if (on !== l.on) {
          l.on = on;
          l.el.dataset.liquid = on ? 'on' : 'off';
        }

        const w = Math.max(1, Math.round(bw * dpr));
        const h = Math.max(1, Math.round(bh * dpr));
        if (w !== l.w || h !== l.h) {
          l.w = w;
          l.h = h;
          l.canvas.width = w;
          l.canvas.height = h;
          l.cleared = true;
        }

        let energy = 0;
        for (let i = 0; i < N; i += 3) energy = Math.max(energy, Math.abs(l.V[i]));
        const settledEmpty = l.level < -0.1 && Math.abs(l.vel) < 0.01;
        if (settledEmpty) {
          if (!l.cleared) {
            l.ctx.clearRect(0, 0, w, h);
            l.cleared = true;
          }
          continue;
        }

        if (!drawThisFrame) continue;
        // Frame budget: moving liquid ~30fps, settled liquid ~11fps. Idle
        // buttons redrawing at 60fps was what made laptops feel laggy.
        const busy = l.hover || energy > 0.02 || Math.abs(l.vel) > 0.02;
        if (now < (l.nextAt ?? 0)) continue;
        l.nextAt = now + (busy ? 32 : 90);
        // Phones: at most 4 liquid buttons rendered per frame, rotating
        // which ones go first so every button keeps animating.
        if (coarse && drawnThisFrame >= 4) continue;
        drawnThisFrame += 1;

        if (w > glW || h > glH) {
          glW = Math.max(glW, w);
          glH = Math.max(glH, h);
          renderer.setSize(glW, glH);
        }

        const u = program.uniforms;
        u.uRes.value = [w, h];
        u.uTime.value = time;
        u.uLevel.value = l.level;
        u.uH.value = l.U;
        u.uColA.value = l.colA;
        u.uColB.value = l.colB;
        u.uColC.value = l.colC;
        u.uDark.value = dark ? 1 : 0;
        u.uSeed.value = l.seed;

        gl.viewport(0, 0, w, h);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        mesh.draw();

        l.ctx.clearRect(0, 0, w, h);
        l.ctx.drawImage(glCanvas, 0, glCanvas.height - h, w, h, 0, 0, w, h);
        l.cleared = false;
      }
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(scanTimer);
      mo.disconnect();
      themeMo.disconnect();
      mq.removeEventListener('change', onThemeChange);
      glCanvas.removeEventListener('webglcontextlost', onLost);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('deviceorientation', onOrient);
      window.removeEventListener('touchend', enableTilt);
      document.removeEventListener('pointerleave', onPointerLeaveDoc);
      liquids.forEach(detach);
      io.disconnect();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return null;
}
