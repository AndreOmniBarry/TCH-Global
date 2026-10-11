'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Story } from '@/lib/kids/stories';
import { shuffle } from '@/components/kids/games';

type Trivia = { q: string; options: string[]; a: number; from: string };
type Props = { story: Story; season: 'christmas' | 'easter' | null; dayNo: number; dateLabel: string; trivia: Trivia[] };

const BOOKS = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation'];

const PROMPTS = [
  'Where in your life right now do you need to see yourself the way God sees you?',
  'What would change this week if you really believed today’s verse?',
  'Which part of this story feels most like your life right now, and why?',
  'What is one lie you have believed about yourself that this story answers?',
  'Who around you needs to hear what you learned today?',
  'What is God asking you to trust Him with that you have been holding on to?',
  'If you said today’s declaration every morning for a month, what might be different?',
];

const XP = { read: 20, journal: 15, trivia: 40, books: 25, verse: 25 };
type Key = keyof typeof XP;

function useTeenProgress(dayNo: number) {
  const key = `tch_teens_${dayNo}`;
  const [done, setDone] = useState<Partial<Record<Key, boolean>>>({});
  const [streak, setStreak] = useState(0);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem(key) || '{}'));
      const s = JSON.parse(localStorage.getItem('tch_teens_streak') || '{"last":-1,"n":0}');
      setStreak(s.last === dayNo || s.last === dayNo - 1 ? s.n : 0);
      setTotal(Number(localStorage.getItem('tch_teens_xp') || 0));
    } catch {}
  }, [key, dayNo]);
  const mark = useCallback((k: Key) => setDone((d) => {
    if (d[k]) return d;
    const next = { ...d, [k]: true };
    try {
      localStorage.setItem(key, JSON.stringify(next));
      const t = Number(localStorage.getItem('tch_teens_xp') || 0) + XP[k];
      localStorage.setItem('tch_teens_xp', String(t)); setTotal(t);
      const s = JSON.parse(localStorage.getItem('tch_teens_streak') || '{"last":-1,"n":0}');
      if (s.last !== dayNo) { const n = s.last === dayNo - 1 ? s.n + 1 : 1; localStorage.setItem('tch_teens_streak', JSON.stringify({ last: dayNo, n })); setStreak(n); }
    } catch {}
    return next;
  }), [key, dayNo]);
  return { done, mark, streak, total };
}

const level = (xp: number) => {
  const names = ['Seeker', 'Disciple', 'Builder', 'Warrior', 'Ambassador', 'Pillar'];
  const i = Math.min(names.length - 1, Math.floor(xp / 300));
  return { name: names[i], into: xp % 300, next: i === names.length - 1 ? null : names[i + 1] };
};

/* ---------- Rapid fire: 10 questions, 12 seconds each, speed bonus ---------- */
function RapidFire({ qs, dayNo, onWin }: { qs: Trivia[]; dayNo: number; onWin: () => void }) {
  const [state, setState] = useState<'idle' | 'play' | 'over'>('idle');
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [left, setLeft] = useState(12);
  const [score, setScore] = useState(0);
  const [right, setRight] = useState(0);
  const [best, setBest] = useState(0);
  const tick = useRef<number>();
  useEffect(() => { try { setBest(Number(localStorage.getItem('tch_teens_best') || 0)); } catch {} }, []);
  useEffect(() => {
    if (state !== 'play' || pick !== null) return;
    tick.current = window.setInterval(() => setLeft((l) => l - 0.1), 100);
    return () => window.clearInterval(tick.current);
  }, [state, pick, i]);
  useEffect(() => { if (state === 'play' && pick === null && left <= 0) answer(-1); });
  function answer(k: number) {
    if (pick !== null) return;
    window.clearInterval(tick.current);
    setPick(k);
    const ok = k === qs[i].a;
    if (ok) { setRight((r) => r + 1); setScore((s) => s + 100 + Math.round(Math.max(0, left) * 10)); }
    window.setTimeout(() => {
      if (i + 1 < qs.length) { setI(i + 1); setPick(null); setLeft(12); }
      else {
        setState('over'); onWin();
        setScore((s) => { try { if (s > best) { localStorage.setItem('tch_teens_best', String(s)); setBest(s); } } catch {} return s; });
      }
    }, 900);
  }
  const start = () => { setState('play'); setI(0); setPick(null); setLeft(12); setScore(0); setRight(0); };
  if (state === 'idle') return (
    <div className="tg-intro"><h4>Rapid fire</h4><p>10 questions from across the whole Bible library. 12 seconds each. Faster answers score more.</p>{best > 0 && <p className="tg-best">Your best: <b>{best}</b></p>}<button type="button" className="tn-btn" onClick={start}>Start</button></div>
  );
  if (state === 'over') return (
    <div className="tg-intro"><h4>{right} / {qs.length} correct</h4><p className="tg-score">{score} pts{score >= best && score > 0 ? ' · new best' : ''}</p><button type="button" className="tn-btn" onClick={start}>Run it back</button></div>
  );
  const q = qs[i];
  return (
    <div className="tg-rf">
      <div className="tg-rf-top"><span>Q{i + 1}/{qs.length}</span><span className="tg-pts">{score} pts</span></div>
      <div className="tg-timer"><i style={{ transform: `scaleX(${Math.max(0, left) / 12})` }} className={left < 4 ? 'low' : ''} /></div>
      <h4>{q.q}</h4>
      <p className="tg-from">From: {q.from}</p>
      <div className="tg-options">{q.options.map((o, k) => <button type="button" key={k} className={pick === null ? '' : k === q.a ? 'right' : k === pick ? 'wrong' : 'dim'} onClick={() => answer(k)}>{o}</button>)}</div>
    </div>
  );
}

/* ---------- Books in order ---------- */
function BookOrder({ dayNo, onWin }: { dayNo: number; onWin: () => void }) {
  const set = useMemo(() => {
    const start = (dayNo * 13) % (BOOKS.length - 12);
    const chosen = shuffle(BOOKS.slice(start, start + 12), dayNo).slice(0, 6);
    return { chosen, answer: [...chosen].sort((a, b) => BOOKS.indexOf(a) - BOOKS.indexOf(b)) };
  }, [dayNo]);
  const [order, setOrder] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string | null>(null);
  const won = order.length === set.answer.length;
  useEffect(() => { if (won) onWin(); }, [won, onWin]);
  function tap(b: string) {
    if (order.includes(b) || won) return;
    if (set.answer[order.length] === b) setOrder([...order, b]);
    else { setWrong(b); window.setTimeout(() => setWrong(null), 500); }
  }
  return (
    <div className="tg-books">
      <p className="tg-help">Tap these books in the order they appear in the Bible.</p>
      <ol className="tg-slots">{set.answer.map((_, i) => <li key={i} className={order[i] ? 'on' : ''}>{order[i] ?? i + 1}</li>)}</ol>
      <div className="tg-chips">{set.chosen.map((b) => <button type="button" key={b} disabled={order.includes(b)} className={wrong === b ? 'shake' : ''} onClick={() => tap(b)}>{b}</button>)}</div>
      {won && <p className="tg-done">Locked in. {set.answer[0]} to {set.answer[set.answer.length - 1]} in order.</p>}
      {!won && order.length > 0 && <button type="button" className="tg-reset" onClick={() => setOrder([])}>Reset</button>}
    </div>
  );
}

/* ---------- Fill the verse ---------- */
function VerseFill({ story, onWin }: { story: Story; onWin: () => void }) {
  const words = story.verse.text.split(' ');
  const blanks = useMemo(() => {
    const idx = words.map((w, i) => ({ i, n: w.replace(/[^A-Za-z]/g, '').length })).filter((x) => x.n >= 4).sort((a, b) => b.n - a.n).slice(0, 4).map((x) => x.i);
    return new Set(idx);
  }, [story.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [vals, setVals] = useState<Record<number, string>>({});
  const clean = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
  const allRight = Array.from(blanks).every((i) => clean(vals[i] ?? '') === clean(words[i]));
  useEffect(() => { if (allRight) onWin(); }, [allRight, onWin]);
  return (
    <div className="tg-verse">
      <p className="tg-help">Fill in the missing words of today&rsquo;s verse ({story.verse.ref}). Read the Word section if you need a look.</p>
      <p className="tg-verse-line">
        {words.map((w, i) => blanks.has(i) ? (
          <input key={i} aria-label={`Missing word ${i + 1}`} className={clean(vals[i] ?? '') === clean(w) ? 'ok' : ''} style={{ width: `${Math.max(4, w.length) + 1}ch` }} value={vals[i] ?? ''} onChange={(e) => setVals({ ...vals, [i]: e.target.value })} autoCapitalize="off" autoComplete="off" />
        ) : <span key={i}>{w} </span>)}
      </p>
      {allRight && <p className="tg-done">Memorised. Say it out loud three times today.</p>}
    </div>
  );
}

const GAMES = [{ k: 'trivia', l: 'Rapid fire' }, { k: 'books', l: 'Books in order' }, { k: 'verse', l: 'Fill the verse' }] as const;

export default function TeensDaily({ story, season, dayNo, dateLabel, trivia }: Props) {
  const { done, mark, streak, total } = useTeenProgress(dayNo);
  const [game, setGame] = useState<(typeof GAMES)[number]['k']>('trivia');
  const [note, setNote] = useState('');
  const prompt = PROMPTS[dayNo % PROMPTS.length];
  const lv = level(total);
  const noteKey = `tch_teens_note_${dayNo}`;
  useEffect(() => { try { setNote(localStorage.getItem(noteKey) || ''); } catch {} }, [noteKey]);
  const readRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = readRef.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) mark('read'); }, { threshold: 1 });
    io.observe(el); return () => io.disconnect();
  }, [mark]);
  const winTrivia = useMemo(() => () => mark('trivia'), [mark]);
  const winBooks = useMemo(() => () => mark('books'), [mark]);
  const winVerse = useMemo(() => () => mark('verse'), [mark]);
  const count = Object.keys(done).length;

  return (
    <div className="td">
      <div className="td-bar">
        <div><span className="tn-kicker">{dateLabel}{season ? ` · ${season === 'christmas' ? 'Christmas series' : 'Easter series'}` : ''}</span><h2>Daily drop</h2></div>
        <div className="td-stats">
          <span><b>{streak}</b> day streak</span>
          <span><b>{total}</b> XP</span>
          <span className="td-level" title={lv.next ? `${300 - lv.into} XP to ${lv.next}` : 'Top level'}>{lv.name}<i style={{ width: `${(lv.into / 300) * 100}%` }} /></span>
          <span><b>{count}</b>/5 today</span>
        </div>
      </div>

      <article className="td-word">
        <span className="td-tag">The Word &middot; {story.ref}</span>
        <h3>{story.title}</h3>
        <div className="td-story">{story.pages.map((p, i) => <p key={i}>{p}</p>)}</div>
        <blockquote className="td-verse">&ldquo;{story.verse.text}&rdquo;<cite>{story.verse.ref} KJV</cite></blockquote>
        {story.deep && <div className="td-deep"><h4>Go deeper</h4><p>{story.deep}</p></div>}
        <div className="td-grid">
          <div className="td-card"><h4>Real talk</h4><p>{prompt}</p>
            <textarea value={note} placeholder="Write your honest answer. Only you can see this; it stays on this device." onChange={(e) => { setNote(e.target.value); try { localStorage.setItem(noteKey, e.target.value); } catch {} if (e.target.value.trim().length > 20) mark('journal'); }} rows={4} />
          </div>
          <div className="td-card"><h4>Pray it</h4><p>{story.prayer}</p><h4>Live it</h4><p>{story.challenge}</p></div>
        </div>
        {story.confess && <div className="td-declare" ref={readRef}><span>Declare it</span><p>{story.confess}</p></div>}
      </article>

      <section className="td-games" aria-label="Games">
        <div className="td-tabs" role="tablist">
          {GAMES.map((g) => <button key={g.k} type="button" role="tab" aria-selected={game === g.k} className={game === g.k ? 'on' : ''} onClick={() => setGame(g.k)}>{g.l}{done[g.k] && <i aria-label="done" />}</button>)}
        </div>
        <div className="td-game">
          {game === 'trivia' && <RapidFire qs={trivia} dayNo={dayNo} onWin={winTrivia} />}
          {game === 'books' && <BookOrder dayNo={dayNo} onWin={winBooks} />}
          {game === 'verse' && <VerseFill story={story} onWin={winVerse} />}
        </div>
      </section>
    </div>
  );
}
