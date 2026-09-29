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

const fragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform float uLevel;
uniform float uTilt;
uniform float uWave;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;
uniform float uDark;
uniform float uSeed;
uniform vec2 uMouse;
uniform float uRipple;
uniform vec3 uDrop;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
vec2 hash22(vec2 p) {
  float n = hash21(p);
  return vec2(n, hash21(p + n));
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + 17.1;
    a *= 0.5;
  }
  return v;
}
vec2 voronoi(vec2 p, float t) {
  vec2 n = floor(p);
  vec2 f = fract(p);
  float f1 = 8.0;
  float f2 = 8.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash22(n + g);
      o = 0.5 + 0.45 * sin(t + 6.2831 * o);
      float d = length(g + o - f);
      if (d < f1) { f2 = f1; f1 = d; }
      else if (d < f2) { f2 = d; }
    }
  }
  return vec2(f1, f2);
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * aspect, uv.y);
  float px = 1.0 / uRes.y;
  float t = uTime;

  // Free surface: level + slosh tilt + scroll-excited travelling waves
  // + a faint idle ripple so the liquid never looks frozen.
  float x = uv.x - 0.5;
  float X = p.x;
  float dropAge = t - uDrop.z;
  float dropAmp = dropAge > 0.0 ? exp(-dropAge * 1.4) : 0.0;
  float dropR = dropAge * 0.55;
  float mx = uMouse.x * aspect;
  float md = abs(X - mx);
  float surf = uLevel
    + uTilt * x * 2.0
    + uWave * (0.050 * sin(X * 6.0 - t * 4.2 + uSeed) + 0.028 * sin(X * 11.0 + t * 6.1 + uSeed * 1.7))
    + 0.022 * sin(X * 2.3 + t * 1.15 + uSeed) + 0.013 * sin(X * 4.7 - t * 1.6 + uSeed * 0.5)
    + 0.006 * sin(X * 9.0 - t * 2.4)
    + uRipple * 0.2 * sin(md * 14.0 - t * 8.0) * exp(-md * 1.3)
    + dropAmp * 0.07 * sin((abs(X - uDrop.x * aspect) - dropR) * 30.0) * exp(-abs(abs(X - uDrop.x * aspect) - dropR) * 9.0);
  float d = surf - uv.y;
  if (d < -14.0 * px) { gl_FragColor = vec4(0.0); return; }

  float inside = smoothstep(-1.25 * px, 1.25 * px, d);
  float line = exp(-abs(d) / (1.4 * px));
  float halo = exp(-abs(d) / (7.0 * px));

  // Refraction: domain-warped coordinates bend everything seen "through"
  // the liquid, like looking into cut crystal.
  vec2 m = vec2(mx, uMouse.y);
  float mdist = length(p - m);
  vec2 rippleWarp = (p - m) / max(mdist, 1e-3) * sin(mdist * 22.0 - t * 9.0) * 0.1 * uRipple * exp(-mdist * 1.4);
  vec2 dp = vec2(uDrop.x * aspect, uDrop.y);
  float dd = length(p - dp);
  float dring = exp(-abs(dd - dropR) * 18.0) * dropAmp;
  rippleWarp += (p - dp) / max(dd, 1e-3) * dring * 0.04;
  vec2 q = p * 1.6 + vec2(t * 0.35, -t * 0.12) + rippleWarp * 4.0;
  float w = fbm(q + 1.9 * fbm(q * 1.2 + vec2(-t * 0.2, t * 0.08)));
  vec2 rp = p + (w - 0.5) * 0.45 + rippleWarp;

  float g = clamp(0.5 * uv.x + 0.5 * (1.0 - uv.y) + (w - 0.5) * 0.5, 0.0, 1.0);
  vec3 col = g < 0.5 ? mix(uColA, uColB, g * 2.0) : mix(uColB, uColC, g * 2.0 - 1.0);

  float depth = clamp(d * 1.6, 0.0, 1.0);
  col *= mix(1.12, 0.74, depth);

  // Cut-glass facets: large slow voronoi cells, bright ridges on cell edges.
  vec2 vf = voronoi(rp * 2.4 + vec2(t * 0.25, 0.0), t * 0.5);
  col += (0.5 - vf.x) * 0.08;
  col += (1.0 - smoothstep(0.0, 0.22, vf.y - vf.x)) * 0.05;

  // Caustics: fine fast voronoi network, strongest near the surface.
  vec2 vc = voronoi(rp * 4.2 + vec2(t * 0.4, t * 0.3), t * 0.8);
  float caus = pow(1.0 - smoothstep(0.0, 0.32, vc.y - vc.x), 2.2);
  col += caus * (0.18 + 0.12 * uDark) * (1.0 - depth * 0.6);

  // Subsurface light just under the surface.
  float band = smoothstep(0.0, 0.06, d) * (1.0 - smoothstep(0.06, 0.35, d));
  col += vec3(0.09) * band;

  // Glossy specular streaks — light hitting the glass front.
  float diag = uv.x * aspect * 0.18 - uv.y;
  col += exp(-pow((diag + 0.32) / 0.05, 2.0)) * 0.22;
  col += exp(-pow((diag + 0.52) / 0.018, 2.0)) * 0.16;

  // Rising bubbles that pop at the surface.
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    float h1 = hash21(vec2(fi, uSeed));
    float h2 = hash21(vec2(fi * 3.1, uSeed + 1.3));
    float lvl = max(uLevel, 0.0);
    float y = fract(h1 * 7.0 + t * (0.08 + 0.12 * h2)) * lvl;
    float bx = h1 * aspect + 0.03 * sin(t * 1.7 + fi);
    float r = 0.018 + 0.022 * h2;
    float dist = length(vec2(p.x - bx, uv.y - y));
    float ring = smoothstep(1.2 * px, 0.0, abs(dist - r));
    float spot = smoothstep(r * 0.4, 0.0, length(vec2(p.x - bx + r * 0.35, uv.y - y - r * 0.35)));
    float fade = smoothstep(0.0, 0.08, surf - y) * smoothstep(0.0, 0.1, y);
    col += (ring * 0.28 + spot * 0.4) * fade;
  }

  // Container rim: liquid darkens slightly where it meets the glass walls.
  float rim = smoothstep(0.0, 0.1, min(min(uv.x, 1.0 - uv.x) * aspect, uv.y));
  col *= mix(0.86, 1.0, rim);

  // Meniscus: a crisp bright line plus a soft glow on both sides.
  col = mix(col, vec3(1.0), line * 0.55);
  col += halo * 0.08;

  col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, 1.24);
  col += min(uRipple, 1.4) * 0.5 * smoothstep(0.22, 0.0, abs(sin(mdist * 22.0 - t * 9.0))) * exp(-mdist * 1.6) * inside;
  col += dring * 0.45 * inside;
  col = mix(col, col * 1.08 + 0.02, uDark);

  float alpha = max(inside, line * 0.55);
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
  tilt: number;
  tiltVel: number;
  wave: number;
  seed: number;
  dir: number;
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
  ripple: number;
  hover: boolean;
  drop: number[];
  nextDrop: number;
};

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
        preserveDrawingBuffer: true,
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
        uTilt: { value: 0 },
        uWave: { value: 0 },
        uColA: { value: [1, 0, 0] },
        uColB: { value: [1, 0, 0] },
        uColC: { value: [1, 0, 0] },
        uDark: { value: 0 },
        uSeed: { value: 0 },
        uMouse: { value: [0.5, 0.5] },
        uRipple: { value: 0 },
        uDrop: { value: [0.5, 0.5, -99] },
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
      { rootMargin: '15% 0px' }
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
        tilt: 0,
        tiltVel: 0,
        wave: 0,
        seed: Math.random() * 100,
        dir: Math.random() < 0.5 ? -1 : 1,
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
        ripple: 0,
        hover: false,
        drop: [0.5, 0.5, -99],
        nextDrop: Math.random() * 3,
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

    let hovered: Liquid | null = null;
    function onPointerMove(e: PointerEvent) {
      const target = (e.target as Element | null)?.closest?.(SELECTOR) as HTMLElement | null;
      const l = target ? liquids.get(target) ?? null : null;
      if (hovered && hovered !== l) hovered.hover = false;
      hovered = l;
      if (!l) return;
      const r = l.el.getBoundingClientRect();
      l.mx = (e.clientX - r.left) / r.width;
      l.my = 1 - (e.clientY - r.top) / r.height;
      l.hover = true;
      l.wave = Math.min(1, l.wave + 0.04);
    }
    function onPointerLeaveDoc() {
      if (hovered) hovered.hover = false;
      hovered = null;
    }
    function onPointerDown(e: PointerEvent) {
      onPointerMove(e);
      if (hovered) {
        hovered.ripple = 2;
        hovered.drop = [hovered.mx, hovered.my, (performance.now() - t0) / 1000];
        hovered.wave = 1;
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

    let raf = 0;
    let last = performance.now();
    let lastScroll = window.scrollY;
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
      scrollVel += (rawVel - scrollVel) * 0.25;

      const vh = window.innerHeight;
      const start = vh * 0.98;
      const end = vh * 0.62;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const time = (now - t0) / 1000;

      liquids.forEach((l) => {
        if (!l.visible) return;
        const rect = l.el.getBoundingClientRect();
        if (!rect.width || !rect.height) return;

        const progress = Math.min(Math.max((start - rect.top) / (start - end), 0), 1);
        const target = -0.14 + progress * 1.34;

        // Level: slightly underdamped spring — lags the scroll, overshoots
        // a touch, settles.
        const acc = 70 * (target - l.level) - 11 * l.vel;
        l.vel += acc * dt;
        l.level += l.vel * dt;

        // Slosh: tilt chases scroll speed, then rings back and forth
        // (low damping) once scrolling stops.
        const drive = Math.max(-0.2, Math.min(0.2, scrollVel * 0.00011)) * l.dir;
        const accT = 38 * (drive - l.tilt) - 3.2 * l.tiltVel;
        l.tiltVel += accT * dt;
        l.tilt += l.tiltVel * dt;

        const waveTarget = Math.min(1, Math.abs(l.vel) * 1.4 + Math.abs(l.tiltVel) * 0.25 + Math.abs(scrollVel) * 0.0004);
        l.wave += (waveTarget - l.wave) * (1 - Math.exp(-dt * 6));
        l.ripple += ((l.hover ? 1.2 : 0) - l.ripple) * (1 - Math.exp(-dt * (l.hover ? 6 : 0.9)));
        if (time > l.nextDrop) {
          l.drop = [0.15 + Math.random() * 0.7, Math.max(0.1, Math.min(l.level, 1) * (0.3 + Math.random() * 0.5)), time];
          l.nextDrop = time + 1.8 + Math.random() * 3;
        }

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

        const w = Math.max(1, Math.round(rect.width * dpr));
        const h = Math.max(1, Math.round(rect.height * dpr));
        if (w !== l.w || h !== l.h) {
          l.w = w;
          l.h = h;
          l.canvas.width = w;
          l.canvas.height = h;
          l.cleared = true;
        }

        const settledEmpty = l.level < -0.1 && Math.abs(l.vel) < 0.01 && l.ripple < 0.01;
        if (settledEmpty) {
          if (!l.cleared) {
            l.ctx.clearRect(0, 0, w, h);
            l.cleared = true;
          }
          return;
        }

        if (w > glW || h > glH) {
          glW = Math.max(glW, w);
          glH = Math.max(glH, h);
          renderer.setSize(glW, glH);
        }

        const u = program.uniforms;
        u.uRes.value = [w, h];
        u.uTime.value = time;
        u.uLevel.value = l.level;
        u.uTilt.value = l.tilt;
        u.uWave.value = l.wave;
        u.uColA.value = l.colA;
        u.uColB.value = l.colB;
        u.uColC.value = l.colC;
        u.uDark.value = dark ? 1 : 0;
        u.uSeed.value = l.seed;
        u.uMouse.value = [l.mx, l.my];
        u.uRipple.value = l.ripple;
        u.uDrop.value = l.drop;

        gl.viewport(0, 0, w, h);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        mesh.draw();

        l.ctx.clearRect(0, 0, w, h);
        l.ctx.drawImage(glCanvas, 0, glCanvas.height - h, w, h, 0, 0, w, h);
        l.cleared = false;
      });
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(scanTimer);
      mo.disconnect();
      themeMo.disconnect();
      mq.removeEventListener('change', onThemeChange);
      glCanvas.removeEventListener('webglcontextlost', onLost);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointerleave', onPointerLeaveDoc);
      liquids.forEach(detach);
      io.disconnect();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return null;
}
