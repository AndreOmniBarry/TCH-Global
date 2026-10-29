'use client';

import { useEffect } from 'react';

const SELECTOR = '.btn, .liquid';
const N = 40; // surface columns per button

/* Water fill for every button on the site.
 *
 * The level is tied to scroll position, not time: a button below the
 * screen is empty, it fills as it rises up the screen, and it is full when
 * it reaches the top. Scroll back down and it drains in step. Buttons that
 * can never reach the top (the footer, at the end of the page) complete
 * their fill as the page reaches its end, so they are full there too.
 *
 * The surface is a small shallow-water simulation per button (reflecting
 * walls, viscosity, constant volume). Filling and draining stir it, taps
 * drop a ripple, a moving pointer leaves a wake, and phone tilt keeps the
 * water level with the ground.
 *
 * Drawing is plain Canvas 2D straight into each button's own canvas: one
 * path and a few gradients. No WebGL readback,
 * no per-button contexts, so it stays at full frame rate on laptops and
 * phones alike. Every frame reads all positions first and writes after,
 * so the browser never has to recompute layout mid-frame. */

type Liquid = {
  el: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  near: boolean;
  level: number;
  vel: number;
  H: Float32Array;
  V: Float32Array;
  plane: number;
  nextStir: number;
  seed: number;
  colA: string;
  colB: string;
  colC: string;
  /** Brand drawing variant from --liquid-brand (e.g. 'tiktok'). */
  brand: string;
  w: number;
  h: number;
  on: boolean;
  fillN: number;
  drawn: boolean;
  mx: number;
  hover: boolean;
  grad?: CanvasGradient;
  gradKey?: string;
};

// Shallow-water step: wave speed grows with depth (sqrt(g*depth)), short
// waves die faster than long ones, and the mean height stays zero so the
// volume never changes.
function step(l: Liquid, dt: number) {
  const H = l.H;
  const V = l.V;
  const depth = Math.min(Math.max(l.level, 0.05), 1);
  const c = 1.1 + 2.4 * Math.sqrt(depth);
  const k = (c * (N - 1)) ** 2;
  const n = Math.max(1, Math.ceil((c * dt * (N - 1)) / 0.4));
  const h = dt / n;
  const visc = 1.5 * h;
  for (let s = 0; s < n; s++) {
    for (let i = 0; i < N; i++) {
      const a = H[i === 0 ? 1 : i - 1];
      const b = H[i === N - 1 ? N - 2 : i + 1];
      const va = V[i === 0 ? 1 : i - 1];
      const vb = V[i === N - 1 ? N - 2 : i + 1];
      V[i] += (k * (a + b - 2 * H[i]) - 0.9 * V[i]) * h + visc * (va + vb - 2 * V[i]);
    }
    let mean = 0;
    for (let i = 0; i < N; i++) { H[i] += V[i] * h; mean += H[i]; }
    mean /= N;
    for (let i = 0; i < N; i++) H[i] = Math.max(-0.4, Math.min(0.4, H[i] - mean));
  }
}

// Push the surface down around x (0-1): a drop, a fingertip, a stir.
function poke(l: Liquid, x: number, strength: number, width = 0.035) {
  for (let i = 0; i < N; i++) {
    const dx = i / (N - 1) - x;
    l.V[i] -= strength * Math.exp(-(dx * dx) / (2 * width * width));
  }
}

// Smooth (Catmull-Rom) surface height at x in [0, 1].
function surfaceAt(H: Float32Array, x: number) {
  const f = x * (N - 1);
  const i = Math.min(N - 2, Math.max(0, Math.floor(f)));
  const t = f - i;
  const p0 = H[Math.max(0, i - 1)], p1 = H[i], p2 = H[i + 1], p3 = H[Math.min(N - 1, i + 2)];
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
}

function isDarkTheme() {
  const theme = document.documentElement.dataset.theme;
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export default function CrystalLiquid() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let dark = isDarkTheme();

    // Caustics: the light a rippled surface focuses into a web of sharp,
    // thin, bright threads meeting at junctions. They are recomputed every
    // frame (a periodic Voronoi edge field whose seeds wander), so the web
    // reshapes and shimmers like the real thing instead of sliding along
    // as a picture. One small shared texture, tinted copies for TikTok.
    const CS = 96, CELLS = 4;
    const cTex = document.createElement('canvas');
    cTex.width = CS; cTex.height = CS;
    const cCtx = cTex.getContext('2d');
    const cImg = cCtx ? cCtx.createImageData(CS, CS) : null;
    const seeds = Array.from({ length: CELLS * CELLS }, () => ({ ph: Math.random() * 6.28, sp: 0.6 + Math.random() * 0.8, ox: Math.random(), oy: Math.random() }));
    const tinted: Record<string, HTMLCanvasElement> = {};
    const rowWarp = new Float32Array(CS), colWarp = new Float32Array(CS);
    const rowSin = new Float32Array(CS), rowCos = new Float32Array(CS);
    const colSin = new Float32Array(CS), colCos = new Float32Array(CS);
    let cStamp = -1;
    function updateCaustics(t: number, needTint: boolean) {
      if (!cCtx || !cImg) return;
      const frameId = Math.floor(t * 24); // 24 fps is plenty for shimmer
      if (frameId === cStamp) return;
      cStamp = frameId;
      const px: number[] = [], py: number[] = [];
      for (let k = 0; k < seeds.length; k++) {
        const sd = seeds[k];
        const cx = (k % CELLS + sd.ox * 0.6 + 0.2 + 0.18 * Math.sin(t * sd.sp + sd.ph)) / CELLS;
        const cy = (Math.floor(k / CELLS) + sd.oy * 0.6 + 0.2 + 0.18 * Math.cos(t * sd.sp * 0.8 + sd.ph * 1.3)) / CELLS;
        px.push(cx); py.push(cy);
      }
      const d = cImg.data;
      const TAU = Math.PI * 2;
      // Everything that depends on only the row or only the column is
      // worked out once here, not per pixel: this is what keeps the web
      // cheap enough to recompute every frame.
      for (let i = 0; i < CS; i++) {
        const g = i / CS;
        // Bend the web (integer frequencies keep the tile seamless).
        rowWarp[i] = 0.045 * Math.sin(TAU * (g * 2 + t * 0.21)) + 0.02 * Math.sin(TAU * (g * 3 - t * 0.33));
        colWarp[i] = 0.045 * Math.sin(TAU * (g * 2 - t * 0.17)) + 0.02 * Math.sin(TAU * (g * 3 + t * 0.29));
        // Brightness pulse along the threads, split into row and column parts.
        const a = TAU * g * 2;
        colSin[i] = Math.sin(a); colCos[i] = Math.cos(a);
        const b = TAU * g * 3 + t * 1.7 + Math.sin(TAU * g * 2) * 2;
        rowSin[i] = Math.sin(b); rowCos[i] = Math.cos(b);
      }
      for (let y = 0; y < CS; y++) {
        const gy = y / CS;
        for (let x = 0; x < CS; x++) {
          const gx = x / CS;
          const fx = gx + rowWarp[y];
          const fy = gy + colWarp[x];
          // Each cell holds one seed, so only the 3x3 cells around this
          // point can be nearest.
          const ux = fx - Math.floor(fx), uy = fy - Math.floor(fy);
          const cx0 = Math.floor(ux * CELLS), cy0 = Math.floor(uy * CELLS);
          let f1 = 9, f2 = 9;
          for (let oy = -1; oy <= 1; oy++) {
            const ry = (cy0 + oy + CELLS) % CELLS;
            for (let ox = -1; ox <= 1; ox++) {
              const k = ry * CELLS + (cx0 + ox + CELLS) % CELLS;
              let dx = Math.abs(ux - px[k]); if (dx > 0.5) dx = 1 - dx;
              let dy = Math.abs(uy - py[k]); if (dy > 0.5) dy = 1 - dy;
              const dd = dx * dx + dy * dy;
              if (dd < f1) { f2 = f1; f1 = dd; } else if (dd < f2) f2 = dd;
            }
          }
          const e = (Math.sqrt(f2) - Math.sqrt(f1)) * CELLS; // 0 on the threads
          const o = (y * CS + x) * 4;
          if (e >= 0.2) { d[o + 3] = 0; continue; }
          // Thin bright core with a soft falloff; brightness pulses along
          // each thread, so some stretches flare while others fade.
          const pulse = 0.55 + 0.45 * (colSin[x] * rowCos[y] + colCos[x] * rowSin[y]);
          const v = (1 - e / 0.2) ** 2.6 * pulse;
          d[o] = 255; d[o + 1] = 255; d[o + 2] = 255; d[o + 3] = Math.round(v * 255);
        }
      }
      cCtx.putImageData(cImg, 0, 0);
      if (needTint) {
        for (const [key, col] of [['cyan', '#25f4ee'], ['pink', '#fe2c55']]) {
          const c = tinted[key] || (tinted[key] = Object.assign(document.createElement('canvas'), { width: CS, height: CS }));
          const g = c.getContext('2d');
          if (!g) continue;
          g.globalCompositeOperation = 'source-over';
          g.clearRect(0, 0, CS, CS);
          g.drawImage(cTex, 0, 0);
          g.globalCompositeOperation = 'source-in';
          g.fillStyle = col;
          g.fillRect(0, 0, CS, CS);
        }
      }
    }
    const liquids = new Map<HTMLElement, Liquid>();

    // "near" starts a quarter screen early, so a button has already caught
    // up with the scroll by the time it appears.
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const l = liquids.get(entry.target as HTMLElement);
          if (l) l.near = entry.isIntersecting;
        }
      },
      { rootMargin: '25% 0px' }
    );

    function readColors(l: Liquid) {
      const cs = getComputedStyle(l.el);
      l.colA = cs.getPropertyValue('--liquid-a').trim() || '#4338ca';
      l.colB = cs.getPropertyValue('--liquid-b').trim() || '#7c3aed';
      l.colC = cs.getPropertyValue('--liquid-c').trim() || '#0e7490';
      l.brand = cs.getPropertyValue('--liquid-brand').trim();
      l.gradKey = undefined;
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
        el, canvas, ctx, near: false, level: 0, vel: 0,
        H: new Float32Array(N), V: new Float32Array(N), plane: 0,
        nextStir: Math.random() * 2, seed: Math.random() * 1000,
        colA: '', colB: '', colC: '', brand: '', w: 0, h: 0, on: false, fillN: -1, drawn: false,
        mx: 0.5, hover: false,
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
      liquids.forEach((l) => { if (!l.el.isConnected) detach(l); });
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

    // Phone roll: the water stays level with the ground, so on screen its
    // surface tilts by the roll angle.
    let deviceTilt = 0;
    function onOrient(e: DeviceOrientationEvent) {
      const g = Math.max(-35, Math.min(35, e.gamma ?? 0));
      deviceTilt += (Math.tan((g * Math.PI) / 180) * 0.6 - deviceTilt) * 0.2;
    }
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> } | undefined;
    if (window.matchMedia('(pointer: coarse)').matches && DOE && typeof DOE.requestPermission !== 'function') {
      window.addEventListener('deviceorientation', onOrient);
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
      if (l.hover && my < l.level + 0.1) {
        const speed = Math.min(Math.abs(mx - l.mx) * 40, 2.5);
        if (speed > 0.05) poke(l, mx, speed, 0.05);
      }
      l.mx = mx;
      l.hover = true;
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
    function onPointerLeaveDoc() {
      if (hovered) hovered.hover = false;
      hovered = null;
    }
    document.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('pointerleave', onPointerLeaveDoc);

    const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
    const M = 48;
    const pts = new Float32Array((M + 1) * 2);

    function draw(l: Liquid, t: number) {
      const { ctx, w, h } = l;
      ctx.clearRect(0, 0, w, h);
      if (l.level < 0.004 && Math.abs(l.vel) < 0.01) { l.drawn = false; return; }
      const r = dpr();
      const wallPx = 5 * r;
      for (let j = 0; j <= M; j++) {
        const x = j / M;
        const xp = x * w;
        // Water wets the glass and climbs ~3px at each wall.
        const men = 3 * r * Math.exp(-Math.min(xp, w - xp) / wallPx);
        pts[j * 2] = xp;
        pts[j * 2 + 1] = h * (1 - l.level - surfaceAt(l.H, x) - l.plane * (x - 0.5)) - men;
      }

      // Water body in the button's brand colours.
      ctx.beginPath();
      ctx.moveTo(0, h + 2);
      for (let j = 0; j <= M; j++) ctx.lineTo(pts[j * 2], pts[j * 2 + 1]);
      ctx.lineTo(w, h + 2);
      ctx.closePath();
      const key = `${w}x${h}${l.colA}${l.colB}${l.colC}`;
      if (l.gradKey !== key) {
        const g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, l.colA); g.addColorStop(0.55, l.colB); g.addColorStop(1, l.colC);
        l.grad = g; l.gradKey = key;
      }
      ctx.fillStyle = l.grad!;
      ctx.fill();

      ctx.save();
      ctx.clip();
      const tiktok = l.brand === 'tiktok';
      const top = h * (1 - Math.min(Math.max(l.level, 0), 1.05));
      // Caustic web: two scales, brighter when the surface is disturbed,
      // and confined to the water (the depth shading then fades it).
      let energy = 0;
      for (let i = 0; i < N; i += 2) energy = Math.max(energy, Math.abs(l.V[i]));
      const lively = 0.75 + Math.min(1, energy * 1.5) * 0.5;
      const layers: [HTMLCanvasElement | undefined, number, number][] = tiktok
        ? [[tinted.cyan, 0.32, 1], [tinted.pink, 0.2, 1.04]]
        : [[cTex, (dark ? 0.16 : 0.12) * lively, 1], [cTex, (dark ? 0.09 : 0.07) * lively, 1.7]];
      for (const [img, alpha, k] of layers) {
        const pat = img && ctx.createPattern(img, 'repeat');
        if (!pat) continue;
        const sc = ((90 * r) / CS) * k; // ~22px cells
        pat.setTransform(new DOMMatrix().translateSelf((l.seed * 13) % (CS * sc), (l.seed * 7) % (CS * sc)).scaleSelf(sc, sc));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = pat;
        ctx.fillRect(0, top, w, h - top);
      }
      ctx.globalAlpha = 1;
      // Slightly lighter just under the surface, darker with depth.
      const deep = ctx.createLinearGradient(0, top, 0, h);
      deep.addColorStop(0, 'rgba(255,255,255,0.06)');
      deep.addColorStop(0.12, 'rgba(255,255,255,0)');
      deep.addColorStop(1, dark ? 'rgba(0,0,0,0.24)' : 'rgba(0,0,0,0.32)');
      ctx.fillStyle = deep;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();

      // Waterline as seen through glass: a fine meniscus line with a faint
      // refracted edge beneath it. Light comes from the upper left, so the
      // surface catches it where it rises to the right (canvas y points
      // down: negative slope).
      const line = (dx: number, dy: number, style: string) => {
        ctx.strokeStyle = style;
        ctx.beginPath();
        for (let j = 0; j <= M; j++) {
          if (j) ctx.lineTo(pts[j * 2] + dx, pts[j * 2 + 1] + dy);
          else ctx.moveTo(pts[0] + dx, pts[1] + dy);
        }
        ctx.stroke();
      };
      ctx.lineJoin = 'round';
      ctx.lineWidth = 1 * r;
      line(0, 1.5 * r, 'rgba(0,0,0,0.14)');
      if (tiktok) {
        // The TikTok split: cyan and pink edges offset either side.
        ctx.lineWidth = 1.4 * r;
        line(-1.6 * r, -1 * r, 'rgba(37,244,238,0.9)');
        line(1.6 * r, 1 * r, 'rgba(254,44,85,0.9)');
        ctx.lineWidth = 1 * r;
      }
      for (let j = 0; j < M; j++) {
        const slope = (pts[j * 2 + 3] - pts[j * 2 + 1]) / Math.max(1, pts[j * 2 + 2] - pts[j * 2]);
        const a = Math.min(0.62, Math.max(0.2, 0.34 - slope * 1.3));
        ctx.strokeStyle = `rgba(255,255,255,${a.toFixed(2)})`;
        ctx.beginPath();
        ctx.moveTo(pts[j * 2], pts[j * 2 + 1]);
        ctx.lineTo(pts[j * 2 + 2], pts[j * 2 + 3]);
        ctx.stroke();
      }
      // Glints: small specular flashes where a ripple's face turns toward
      // the light. They travel with the waves and vanish on still water.
      for (let j = 1; j < M - 1; j++) {
        const s0 = (pts[j * 2 + 1] - pts[j * 2 - 1]) / Math.max(1, pts[j * 2] - pts[j * 2 - 2]);
        const s1 = (pts[j * 2 + 3] - pts[j * 2 + 1]) / Math.max(1, pts[j * 2 + 2] - pts[j * 2]);
        const face = -s1;
        if (face < 0.12 || -s0 > face) continue; // local peak of light-facing slope only
        const strength = Math.min(1, (face - 0.12) * 4);
        const gx = pts[j * 2 + 2], gy = pts[j * 2 + 3];
        const rad = (3 + 5 * strength) * r;
        const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, rad);
        g.addColorStop(0, `rgba(255,255,255,${(0.75 * strength).toFixed(2)})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.save();
        ctx.translate(gx, gy); ctx.scale(1.8, 0.45); ctx.translate(-gx, -gy);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(gx, gy, rad, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      // The glass itself: one narrow, soft vertical reflection near the
      // left that stays put while the water moves behind it (it shifts a
      // little as a phone tilts, like a real reflection).
      const bx = w * 0.14 + deviceTilt * 18 * r;
      const band = ctx.createLinearGradient(bx - w * 0.03, 0, bx + w * 0.03, 0);
      band.addColorStop(0, 'rgba(255,255,255,0)');
      band.addColorStop(0.5, 'rgba(255,255,255,0.075)');
      band.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = band;
      ctx.fillRect(bx - w * 0.03, 0, w * 0.06, h);
      l.drawn = true;
    }

    let raf = 0;
    let last = performance.now();
    let lastScroll = window.scrollY;
    let scrollVel = 0;
    const t0 = last;

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (document.hidden) { last = now; return; }
      const dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;
      const time = (now - t0) / 1000;
      const sy = window.scrollY;
      const vh = window.innerHeight;
      const prevVel = scrollVel;
      scrollVel += ((dt > 0 ? (sy - lastScroll) / dt : 0) - scrollVel) * 0.3;
      lastScroll = sy;
      const scrollAcc = dt > 0 ? (scrollVel - prevVel) / dt : 0;
      const r = dpr();

      // Read phase: every position and size, before any writes.
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
      const live: [Liquid, DOMRect, number, number][] = [];
      liquids.forEach((l) => {
        if (!l.near) {
          if (l.drawn) { l.ctx.clearRect(0, 0, l.w, l.h); l.drawn = false; }
          return;
        }
        live.push([l, l.el.getBoundingClientRect(), l.el.offsetWidth, l.el.offsetHeight]);
      });

      // One caustic update per frame, shared by every button.
      if (live.length) updateCaustics(time, live.some(([l]) => l.brand === 'tiktok'));

      // Write phase.
      for (const [l, rect, bw, bh] of live) {
        if (!bw || !bh) continue;
        // Scroll-linked fill: empty as the button enters at the bottom of
        // the screen, full when it reaches the top (12% down). If the page
        // ends before it can get there, it completes at the end.
        const absY = rect.top + rect.height / 2 + sy;
        let s0 = absY - vh;
        let s1 = absY - vh * 0.12;
        if (s1 > maxScroll) { s1 = maxScroll; s0 = Math.min(s0, s1 - vh * 0.3); }
        const progress = Math.min(Math.max((sy - s0) / Math.max(1, s1 - s0), 0), 1);
        const target = progress * 1.04;

        // Follows the scroll closely, with just enough give to read as fluid.
        // Small fixed steps: stable however long the frame took.
        for (let rem = dt; rem > 0; rem -= 1 / 240) {
          const e = Math.min(rem, 1 / 240);
          l.vel += (260 * (target - l.level) - 32 * l.vel) * e;
          l.level += l.vel * e;
        }
        const lv = Math.abs(l.vel);
        if (lv > 0.06 && l.level > 0.02 && l.level < 1) {
          // Rising or falling water stirs its surface.
          poke(l, Math.random(), Math.min(lv, 2) * 14 * dt, 0.06);
        }
        // A sharp start or stop of scrolling jolts the glass: a small
        // centre-versus-edges wobble, the same way in every button.
        if (Math.abs(scrollAcc) > 4000) {
          const j = Math.max(-1, Math.min(1, scrollAcc / 40000)) * 2 * dt;
          for (let i = 0; i < N; i++) l.V[i] += j * Math.cos((2 * Math.PI * i) / (N - 1));
        }
        const plane = Math.max(-0.5, Math.min(0.5, deviceTilt * (bw / bh)));
        const dPlane = plane - l.plane;
        if (dPlane) {
          // Shift the plane under the surface and let the waves carry the
          // change: that is the slosh.
          for (let i = 0; i < N; i++) l.H[i] -= dPlane * (i / (N - 1) - 0.5);
          l.plane = plane;
        }
        if (time > l.nextStir) {
          poke(l, Math.random(), 0.15 + Math.random() * 0.15, 0.08);
          l.nextStir = time + 0.8 + Math.random() * 1.6;
        }
        step(l, dt);

        const fillN = Math.min(Math.max(l.level, 0), 1);
        if (Math.abs(fillN - l.fillN) > 0.01) {
          l.fillN = fillN;
          l.el.style.setProperty('--fill-n', fillN.toFixed(2));
        }
        const on = l.level > 0.52;
        if (on !== l.on) {
          l.on = on;
          l.el.dataset.liquid = on ? 'on' : 'off';
        }

        const w = Math.max(1, Math.round(bw * r));
        const h = Math.max(1, Math.round(bh * r));
        if (w !== l.w || h !== l.h) {
          l.w = w; l.h = h;
          l.canvas.width = w; l.canvas.height = h;
          l.gradKey = undefined;
        }
        if (rect.bottom > -40 && rect.top < vh + 40) draw(l, time);
      }
    }
    raf = requestAnimationFrame(frame);

    // Leaving the page: give the canvas memory back (iPhone Safari keeps
    // the previous page alive for the back button).
    function onPageHide() {
      liquids.forEach((l) => { l.canvas.width = 0; l.canvas.height = 0; l.w = 0; l.h = 0; l.drawn = false; });
    }
    window.addEventListener('pagehide', onPageHide);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(scanTimer);
      mo.disconnect();
      themeMo.disconnect();
      mq.removeEventListener('change', onThemeChange);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointerleave', onPointerLeaveDoc);
      window.removeEventListener('deviceorientation', onOrient);
      liquids.forEach(detach);
      io.disconnect();
    };
  }, []);

  return null;
}
