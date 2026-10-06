// PUDLIB! recommendation engine. Runs in the browser on the library the
// page already has, so it's instant and needs no extra service.
//
//  1. Content model: TF-IDF vectors over each message's title, series and
//     description (light stemming, church-aware stop words).
//  2. Taxonomy: keyword rules tag every message with topics (Faith,
//     Healing, Prayer...) for browsing and as a second similarity signal.
//  3. Visitor profile: a time-decayed, engagement-weighted average of the
//     vectors of what this visitor played (finishing counts more than
//     sampling; last week counts more than last month).
//  4. Collaborative signal: "people who played X also played Y" counts
//     from the server (item-to-item co-play), blended in when available.
//  5. Ranking: weighted blend of the above with freshness and popularity,
//     then MMR re-ranking so the list isn't five parts of one series.

import type { LibItem } from './library';

export const TOPICS: { name: string; words: string[] }[] = [
  { name: 'Faith', words: ['faith', 'believ', 'trust', 'doubt', 'confiden'] },
  { name: 'Prayer', words: ['pray', 'intercess', 'fast', 'altar', 'petition'] },
  { name: 'Healing', words: ['heal', 'sick', 'health', 'restor', 'whole', 'miracl'] },
  { name: 'Holy Spirit', words: ['spirit', 'holy ghost', 'anoint', 'power', 'fire', 'pentecost', 'comforter'] },
  { name: 'Grace', words: ['grace', 'mercy', 'favour', 'favor', 'forgiv'] },
  { name: 'Family', words: ['family', 'marriag', 'husband', 'wife', 'children', 'parent', 'home'] },
  { name: 'Purpose', words: ['purpose', 'destin', 'calling', 'vision', 'assign', 'kingdom'] },
  { name: 'Prosperity', words: ['prosper', 'wealth', 'financ', 'giving', 'seed', 'harvest', 'tith', 'provision', 'abundan'] },
  { name: 'Victory', words: ['victor', 'overcom', 'battle', 'warfare', 'break', 'deliver', 'freedom', 'chain'] },
  { name: 'Hope', words: ['hope', 'peace', 'comfort', 'anxi', 'fear', 'weary', 'rest', 'joy'] },
  { name: 'Worship', words: ['worship', 'praise', 'thanksgiv', 'glory', 'hymn', 'song'] },
  { name: 'Salvation', words: ['salvat', 'saved', 'cross', 'blood', 'jesus', 'christ', 'redemp', 'born again'] },
  { name: 'The Word', words: ['word', 'scriptur', 'bible', 'teaching', 'study', 'revelation'] },
];

const STOP = new Set(('a an and are as at be by for from has have he her his i in is it its me my of on or our she so that the their them they this to us was we were what when where which who will with you your ' +
  'sunday service live stream message part pastor uzor echiejile tch global comforters house church sermon episode full video official').split(' '));

function stem(w: string) {
  return w.replace(/(ings|ing|edly|ed|ies|es|s|ly|ment|ness)$/, '') || w;
}

export function tokenize(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)).map(stem);
}

export function topicsOf(it: Pick<LibItem, 'title' | 'series' | 'description'>): string[] {
  const text = ` ${`${it.title} ${it.series ?? ''} ${it.description ?? ''}`.toLowerCase()} `;
  const hits = TOPICS.map((t) => ({ name: t.name, n: t.words.reduce((s, w) => s + (text.includes(w) ? 1 : 0), 0) })).filter((t) => t.n > 0);
  return hits.sort((a, b) => b.n - a.n).slice(0, 3).map((t) => t.name);
}

type Vec = Map<string, number>;

function norm(v: Vec) {
  let s = 0;
  v.forEach((x) => { s += x * x; });
  const n = Math.sqrt(s) || 1;
  v.forEach((x, k) => v.set(k, x / n));
  return v;
}

export function cosine(a: Vec, b: Vec) {
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  let s = 0;
  small.forEach((x, k) => { const y = big.get(k); if (y) s += x * y; });
  return s;
}

export type Model = { vecs: Map<string, Vec>; topics: Map<string, string[]> };

export function buildModel(items: LibItem[]): Model {
  const docs = items.map((it) => {
    // Title words count double; series words three times (strong signal).
    const toks = [...tokenize(it.title), ...tokenize(it.title), ...tokenize(it.series ?? '').flatMap((t) => [t, t, t]), ...tokenize(it.description ?? '').slice(0, 80)];
    return { id: it.id, toks };
  });
  const df = new Map<string, number>();
  docs.forEach((d) => new Set(d.toks).forEach((t) => df.set(t, (df.get(t) ?? 0) + 1)));
  const N = docs.length || 1;
  const vecs = new Map<string, Vec>();
  docs.forEach((d) => {
    const tf = new Map<string, number>();
    d.toks.forEach((t) => tf.set(t, (tf.get(t) ?? 0) + 1));
    const v: Vec = new Map();
    tf.forEach((c, t) => v.set(t, (1 + Math.log(c)) * Math.log(1 + N / (df.get(t) ?? 1))));
    vecs.set(d.id, norm(v));
  });
  const topics = new Map(items.map((it) => [it.id, topicsOf(it)]));
  return { vecs, topics };
}

export type HistoryEntry = { at: number; progress: number; t?: number };
export type CoPlay = Record<string, Record<string, number>>;

export function profile(model: Model, history: Record<string, HistoryEntry>) {
  const v: Vec = new Map();
  const topicW = new Map<string, number>();
  const now = Date.now();
  Object.entries(history).forEach(([id, h]) => {
    const iv = model.vecs.get(id);
    if (!iv) return;
    const days = (now - h.at) / 86400000;
    const recency = Math.exp(-days / 21);
    const engagement = 0.3 + Math.min(1, h.progress) * 0.7;
    const w = recency * engagement;
    iv.forEach((x, k) => v.set(k, (v.get(k) ?? 0) + x * w));
    (model.topics.get(id) ?? []).forEach((t) => topicW.set(t, (topicW.get(t) ?? 0) + w));
  });
  const tSum = Array.from(topicW.values()).reduce((a, b) => a + b, 0) || 1;
  topicW.forEach((x, k) => topicW.set(k, x / tSum));
  return { vec: v.size ? norm(v) : null, topics: topicW };
}

/** Ranked recommendations for this visitor. */
export function recommend(items: LibItem[], model: Model, history: Record<string, HistoryEntry>, coplay: CoPlay = {}, limit = 20, exclude: Set<string> = new Set()): LibItem[] {
  const prof = profile(model, history);
  const recent = Object.entries(history).sort((a, b) => b[1].at - a[1].at).slice(0, 6).map(([id]) => id);
  const cand = items.filter((it) => it.kind !== 'book' && !exclude.has(it.id));
  const maxCo = Math.max(1, ...cand.map((it) => recent.reduce((s, r) => s + (coplay[r]?.[it.id] ?? 0), 0)));

  const scored = cand.map((it) => {
    const v = model.vecs.get(it.id)!;
    const content = prof.vec ? cosine(prof.vec, v) : 0;
    const topic = (model.topics.get(it.id) ?? []).reduce((s, t) => s + (prof.topics.get(t) ?? 0), 0);
    const co = recent.reduce((s, r) => s + (coplay[r]?.[it.id] ?? 0), 0) / maxCo;
    const h = history[it.id];
    const seenPenalty = h ? (h.progress > 0.92 ? 0.6 : h.progress > 0.05 ? -0.1 : 0) : 0; // unfinished gets a nudge up
    const cold = prof.vec ? 0 : 1;
    const s = cold
      ? it.score
      : 0.38 * content + 0.14 * Math.min(1, topic) + 0.18 * co + 0.3 * it.score - seenPenalty;
    return { it, s, v };
  });
  scored.sort((a, b) => b.s - a.s);

  // MMR: trade a little relevance for variety.
  const picked: typeof scored = [];
  const pool = scored.slice(0, Math.max(limit * 3, 30));
  while (picked.length < limit && pool.length) {
    let best = 0;
    let bestVal = -Infinity;
    pool.forEach((c, i) => {
      const redundancy = picked.length ? Math.max(...picked.map((p) => cosine(p.v, c.v))) : 0;
      const val = 0.75 * c.s - 0.25 * redundancy;
      if (val > bestVal) { bestVal = val; best = i; }
    });
    picked.push(pool.splice(best, 1)[0]);
  }
  return picked.map((p) => p.it);
}

/** Messages most like one message (for Up next). */
export function similar(item: LibItem, items: LibItem[], model: Model, coplay: CoPlay = {}, limit = 12): LibItem[] {
  const v = model.vecs.get(item.id);
  if (!v) return [];
  const co = coplay[item.id] ?? {};
  const maxCo = Math.max(1, ...Object.values(co));
  return items
    .filter((x) => x.id !== item.id && x.kind === item.kind)
    .map((x) => ({ x, s: 0.6 * cosine(v, model.vecs.get(x.id)!) + 0.25 * ((co[x.id] ?? 0) / maxCo) + 0.15 * x.score + (item.series && x.series === item.series ? 0.3 : 0) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((a) => a.x);
}
