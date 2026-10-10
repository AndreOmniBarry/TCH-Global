import { rng } from '@/lib/kids/schedule';

export type WS = { grid: string[][]; placed: { w: string; cells: [number, number][] }[] };
const A = 'ABCDEFGHIJKLMNOPRSTUWY';

/** Word search: words across, down and diagonal, same grid for everyone today. */
export function wordSearch(words: string[], seed: number, size = 10): WS {
  const r = rng(seed);
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(''));
  const dirs: [number, number][] = [[0, 1], [1, 0], [1, 1], [-1, 1]];
  const placed: WS['placed'] = [];
  for (const raw of words) {
    const w = raw.replace(/[^A-Z]/g, '');
    if (w.length > size) continue;
    for (let t = 0; t < 200; t++) {
      const [dr, dc] = dirs[Math.floor(r() * dirs.length)];
      const r0 = Math.floor(r() * size), c0 = Math.floor(r() * size);
      const cells: [number, number][] = [];
      let ok = true;
      for (let i = 0; i < w.length; i++) {
        const rr = r0 + dr * i, cc = c0 + dc * i;
        if (rr < 0 || cc < 0 || rr >= size || cc >= size || (grid[rr][cc] && grid[rr][cc] !== w[i])) { ok = false; break; }
        cells.push([rr, cc]);
      }
      if (!ok) continue;
      cells.forEach(([rr, cc], i) => { grid[rr][cc] = w[i]; });
      placed.push({ w, cells });
      break;
    }
  }
  for (const row of grid) for (let c = 0; c < size; c++) if (!row[c]) row[c] = A[Math.floor(r() * A.length)];
  return { grid, placed };
}

export type CW = { rows: number; cols: number; cells: (string | null)[][]; clues: { n: number; dir: 'across' | 'down'; r: number; c: number; w: string; clue: string }[] };

/** Small crossword: words cross each other where letters match. */
export function crossword(entries: { w: string; clue: string }[]): CW {
  const N = 21;
  const g: (string | null)[][] = Array.from({ length: N }, () => Array(N).fill(null));
  const list = entries.map((e) => ({ ...e, w: e.w.replace(/[^A-Z]/g, '') })).sort((a, b) => b.w.length - a.w.length);
  const placed: { w: string; clue: string; r: number; c: number; dir: 'across' | 'down' }[] = [];
  const fits = (w: string, r: number, c: number, dir: 'across' | 'down') => {
    const dr = dir === 'down' ? 1 : 0, dc = dir === 'across' ? 1 : 0;
    if (r < 0 || c < 0 || r + dr * (w.length - 1) >= N || c + dc * (w.length - 1) >= N) return false;
    const before = g[r - dr]?.[c - dc], after = g[r + dr * w.length]?.[c + dc * w.length];
    if (before || after) return false;
    let crosses = 0;
    for (let i = 0; i < w.length; i++) {
      const rr = r + dr * i, cc = c + dc * i, cur = g[rr][cc];
      if (cur) { if (cur !== w[i]) return false; crosses++; continue; }
      const side1 = dir === 'across' ? g[rr - 1]?.[cc] : g[rr]?.[cc - 1];
      const side2 = dir === 'across' ? g[rr + 1]?.[cc] : g[rr]?.[cc + 1];
      if (side1 || side2) return false;
    }
    return crosses > 0 || placed.length === 0;
  };
  const put = (w: string, clue: string, r: number, c: number, dir: 'across' | 'down') => {
    for (let i = 0; i < w.length; i++) g[r + (dir === 'down' ? i : 0)][c + (dir === 'across' ? i : 0)] = w[i];
    placed.push({ w, clue, r, c, dir });
  };
  if (!list.length) return { rows: 0, cols: 0, cells: [], clues: [] };
  put(list[0].w, list[0].clue, 10, Math.floor((N - list[0].w.length) / 2), 'across');
  for (const e of list.slice(1)) {
    let done = false;
    for (const p of placed) {
      if (done) break;
      for (let i = 0; i < p.w.length && !done; i++) for (let j = 0; j < e.w.length && !done; j++) {
        if (p.w[i] !== e.w[j]) continue;
        const dir = p.dir === 'across' ? 'down' : 'across';
        const r = p.dir === 'across' ? p.r - j : p.r + i;
        const c = p.dir === 'across' ? p.c + i : p.c - j;
        if (fits(e.w, r, c, dir)) { put(e.w, e.clue, r, c, dir); done = true; }
      }
    }
  }
  let minR = N, maxR = 0, minC = N, maxC = 0;
  g.forEach((row, r) => row.forEach((v, c) => { if (v) { minR = Math.min(minR, r); maxR = Math.max(maxR, r); minC = Math.min(minC, c); maxC = Math.max(maxC, c); } }));
  const cells = g.slice(minR, maxR + 1).map((row) => row.slice(minC, maxC + 1));
  const starts = new Map<string, number>();
  let n = 0;
  const sorted = [...placed].sort((a, b) => a.r - b.r || a.c - b.c);
  const clues = sorted.map((p) => {
    const key = `${p.r},${p.c}`;
    if (!starts.has(key)) starts.set(key, ++n);
    return { n: starts.get(key)!, dir: p.dir, r: p.r - minR, c: p.c - minC, w: p.w, clue: p.clue };
  });
  return { rows: maxR - minR + 1, cols: maxC - minC + 1, cells, clues };
}

export function shuffle<T>(arr: T[], seed: number) {
  const r = rng(seed);
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
