'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Story } from '@/lib/kids/stories';
import Scene from './Scene';
import { crossword, shuffle, wordSearch } from './games';

type Props = { story: Story; season: 'christmas' | 'easter' | null; dayNo: number; dateLabel: string };
type GameKey = 'quiz' | 'search' | 'cross' | 'verse';
const GAMES: { key: GameKey; label: string }[] = [
  { key: 'quiz', label: 'Quiz' }, { key: 'search', label: 'Word search' }, { key: 'cross', label: 'Crossword' }, { key: 'verse', label: 'Verse builder' },
];

function useProgress(dayNo: number) {
  const key = `tch_kids_${dayNo}`;
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    try {
      setDone(JSON.parse(localStorage.getItem(key) || '{}'));
      const s = JSON.parse(localStorage.getItem('tch_kids_streak') || '{"last":-1,"n":0}');
      setStreak(s.last === dayNo || s.last === dayNo - 1 ? s.n : 0);
    } catch {}
  }, [key, dayNo]);
  const mark = (k: string) => setDone((d) => {
    if (d[k]) return d;
    const next = { ...d, [k]: true };
    try {
      localStorage.setItem(key, JSON.stringify(next));
      const s = JSON.parse(localStorage.getItem('tch_kids_streak') || '{"last":-1,"n":0}');
      if (s.last !== dayNo) {
        const n = s.last === dayNo - 1 ? s.n + 1 : 1;
        localStorage.setItem('tch_kids_streak', JSON.stringify({ last: dayNo, n }));
        setStreak(n);
      }
    } catch {}
    return next;
  });
  return { done, mark, streak };
}

function Confetti({ k }: { k: number }) {
  if (!k) return null;
  return <span className="kd-confetti" key={k} aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ ['--x' as string]: `${(i * 37) % 100 - 50}px`, ['--d' as string]: `${(i % 6) * 0.05}s`, background: ['#ff4fd8', '#c6ff3d', '#3d7bff', '#ffb020'][i % 4] }} />)}</span>;
}

function StoryReader({ story, onDone }: { story: Story; onDone: () => void }) {
  const [p, setP] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const last = p === story.pages.length - 1;
  useEffect(() => { if (last) onDone(); }, [last, onDone]);
  useEffect(() => () => { try { speechSynthesis.cancel(); } catch {} }, []);
  function read() {
    try {
      if (speaking) { speechSynthesis.cancel(); setSpeaking(false); return; }
      const u = new SpeechSynthesisUtterance(story.pages[p]);
      u.rate = 0.92; u.pitch = 1.05;
      u.onend = () => setSpeaking(false);
      speechSynthesis.cancel(); speechSynthesis.speak(u); setSpeaking(true);
    } catch {}
  }
  return (
    <div className="kd-story">
      <div className="kd-scene"><Scene kind={story.scene} prop={story.prop} page={p} /></div>
      <div className="kd-page" key={p}>
        <span className="kd-page-no">Page {p + 1} of {story.pages.length}</span>
        <p>{story.pages[p]}</p>
      </div>
      <div className="kd-story-nav">
        <button type="button" className="kd-round" onClick={() => { setP(Math.max(0, p - 1)); setSpeaking(false); try { speechSynthesis.cancel(); } catch {} }} disabled={p === 0} aria-label="Previous page">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <button type="button" className={`kd-read${speaking ? ' on' : ''}`} onClick={read}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></svg>
          {speaking ? 'Stop' : 'Read to me'}
        </button>
        <div className="kd-dots">{story.pages.map((_, i) => <i key={i} className={i === p ? 'on' : i < p ? 'past' : ''} />)}</div>
        <button type="button" className="kd-round kd-round--go" onClick={() => { setP(Math.min(story.pages.length - 1, p + 1)); setSpeaking(false); try { speechSynthesis.cancel(); } catch {} }} disabled={last} aria-label="Next page">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      </div>
    </div>
  );
}

function Quiz({ story, onWin }: { story: Story; onWin: () => void }) {
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const q = story.quiz[i];
  function choose(k: number) {
    if (pick !== null) return;
    setPick(k);
    if (k === q.a) setScore((s) => s + 1);
    window.setTimeout(() => {
      if (i + 1 < story.quiz.length) { setI(i + 1); setPick(null); }
      else { setOver(true); onWin(); }
    }, 900);
  }
  if (over) return <div className="kd-result"><strong>{score} / {story.quiz.length}</strong><span>{score === story.quiz.length ? 'Perfect! You really listened.' : 'Well done! Read the story again to get them all.'}</span><button type="button" className="kd-btn" onClick={() => { setI(0); setPick(null); setScore(0); setOver(false); }}>Play again</button></div>;
  return (
    <div className="kd-quiz">
      <span className="kd-q-no">Question {i + 1} of {story.quiz.length}</span>
      <h4>{q.q}</h4>
      <div className="kd-options">
        {q.options.map((o, k) => <button type="button" key={o} className={pick === null ? '' : k === q.a ? 'right' : k === pick ? 'wrong' : 'dim'} onClick={() => choose(k)}>{o}</button>)}
      </div>
    </div>
  );
}

function WordSearch({ story, seed, onWin }: { story: Story; seed: number; onWin: () => void }) {
  const ws = useMemo(() => wordSearch(story.words.map((w) => w.w), seed), [story, seed]);
  const [found, setFound] = useState<string[]>([]);
  const [start, setStart] = useState<[number, number] | null>(null);
  const key = (r: number, c: number) => `${r},${c}`;
  const foundCells = new Set(ws.placed.filter((p) => found.includes(p.w)).flatMap((p) => p.cells.map(([r, c]) => key(r, c))));
  function tap(r: number, c: number) {
    if (!start) { setStart([r, c]); return; }
    const hit = ws.placed.find((p) => !found.includes(p.w) && ((p.cells[0][0] === start[0] && p.cells[0][1] === start[1] && p.cells.at(-1)![0] === r && p.cells.at(-1)![1] === c) || (p.cells.at(-1)![0] === start[0] && p.cells.at(-1)![1] === start[1] && p.cells[0][0] === r && p.cells[0][1] === c)));
    setStart(null);
    if (hit) { const next = [...found, hit.w]; setFound(next); if (next.length === ws.placed.length) onWin(); }
  }
  return (
    <div className="kd-ws">
      <p className="kd-hint">Tap the first letter of a word, then its last letter.</p>
      <div className="kd-ws-grid" style={{ gridTemplateColumns: `repeat(${ws.grid.length}, 1fr)` }}>
        {ws.grid.map((row, r) => row.map((ch, c) => (
          <button type="button" key={key(r, c)} className={`${foundCells.has(key(r, c)) ? 'found' : ''}${start && start[0] === r && start[1] === c ? ' start' : ''}`} onClick={() => tap(r, c)}>{ch}</button>
        )))}
      </div>
      <ul className="kd-ws-words">{ws.placed.map((p) => <li key={p.w} className={found.includes(p.w) ? 'got' : ''}>{p.w}</li>)}</ul>
    </div>
  );
}

function Crossword({ story, onWin }: { story: Story; onWin: () => void }) {
  const cw = useMemo(() => crossword(story.words), [story]);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const refs = useRef<Record<string, HTMLInputElement | null>>({});
  const numAt = new Map(cw.clues.map((c) => [`${c.r},${c.c}`, c.n]));
  const allRight = cw.cells.every((row, r) => row.every((v, c) => !v || (vals[`${r},${c}`] || '') === v));
  useEffect(() => { if (allRight && Object.keys(vals).length) onWin(); }, [allRight, vals, onWin]);
  function type(r: number, c: number, v: string) {
    const ch = v.slice(-1).toUpperCase().replace(/[^A-Z]/g, '');
    setVals((s) => ({ ...s, [`${r},${c}`]: ch }));
    setChecked(false);
    if (ch) { const right = refs.current[`${r},${c + 1}`]; const down = refs.current[`${r + 1},${c}`]; (right || down)?.focus(); }
  }
  return (
    <div className="kd-cw">
      <div className="kd-cw-grid" style={{ gridTemplateColumns: `repeat(${cw.cols}, minmax(0, 38px))` }}>
        {cw.cells.map((row, r) => row.map((v, c) => v ? (
          <label key={`${r},${c}`} className={`kd-cw-cell${checked ? ((vals[`${r},${c}`] || '') === v ? ' ok' : ' no') : ''}`}>
            {numAt.has(`${r},${c}`) && <small>{numAt.get(`${r},${c}`)}</small>}
            <input ref={(el) => { refs.current[`${r},${c}`] = el; }} value={vals[`${r},${c}`] || ''} onChange={(e) => type(r, c, e.target.value)} maxLength={2} autoCapitalize="characters" autoComplete="off" aria-label={`Row ${r + 1} column ${c + 1}`} />
          </label>
        ) : <span key={`${r},${c}`} className="kd-cw-blank" />))}
      </div>
      <div className="kd-cw-clues">
        {(['across', 'down'] as const).map((d) => (
          <div key={d}><h5>{d === 'across' ? 'Across' : 'Down'}</h5><ol>{cw.clues.filter((c) => c.dir === d).map((c) => <li key={`${d}${c.n}`}><b>{c.n}</b> {c.clue} <span>({c.w.length})</span></li>)}</ol></div>
        ))}
        <button type="button" className="kd-btn" onClick={() => setChecked(true)}>{allRight ? 'Solved!' : 'Check answers'}</button>
      </div>
    </div>
  );
}

function VerseBuilder({ story, seed, onWin }: { story: Story; seed: number; onWin: () => void }) {
  const words = useMemo(() => story.verse.text.split(' '), [story]);
  const pool0 = useMemo(() => shuffle(words.map((w, i) => ({ w, i })), seed), [words, seed]);
  const [answer, setAnswer] = useState<{ w: string; i: number }[]>([]);
  const pool = pool0.filter((x) => !answer.includes(x));
  const complete = answer.length === words.length;
  const right = complete && answer.every((x, k) => x.w === words[k]);
  useEffect(() => { if (right) onWin(); }, [right, onWin]);
  return (
    <div className="kd-vb">
      <p className="kd-hint">Tap the words in the right order to build today’s memory verse.</p>
      <div className={`kd-vb-answer${complete ? (right ? ' right' : ' wrong') : ''}`}>
        {answer.length ? answer.map((x) => <button type="button" key={x.i} onClick={() => setAnswer(answer.filter((y) => y !== x))}>{x.w}</button>) : <span className="kd-vb-empty">Your verse appears here</span>}
      </div>
      <div className="kd-vb-pool">{pool.map((x) => <button type="button" key={x.i} onClick={() => setAnswer([...answer, x])}>{x.w}</button>)}</div>
      {complete && <p className="kd-vb-msg">{right ? `Yes! ${story.verse.ref}` : 'Almost! Tap words in your answer to move them back.'}</p>}
    </div>
  );
}

export default function KidsDaily({ story, season, dayNo, dateLabel }: Props) {
  const { done, mark, streak } = useProgress(dayNo);
  const [game, setGame] = useState<GameKey>('quiz');
  const [boom, setBoom] = useState(0);
  const win = (k: string) => () => { if (!done[k]) { mark(k); setBoom(Date.now()); } };
  const stars = ['story', 'quiz', 'search', 'cross', 'verse'].filter((k) => done[k]).length;
  const seed = dayNo * 7919 + 13;
  return (
    <div className="kd">
      <Confetti k={boom} />
      <div className="kd-top">
        <div>
          <span className="kd-date">{dateLabel}</span>
          {season && <span className={`kd-season kd-season--${season}`}>{season === 'christmas' ? 'Christmas story series' : 'Easter story series'}</span>}
          <h2>{story.title}</h2>
          <span className="kd-ref">{story.ref}</span>
        </div>
        <div className="kd-meter" aria-label={`${stars} of 5 stars today`}>
          <div className="kd-stars">{Array.from({ length: 5 }, (_, i) => <svg key={i} viewBox="0 0 24 24" width="26" height="26" className={i < stars ? 'on' : ''}><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" /></svg>)}</div>
          <span>{streak > 1 ? `${streak}-day streak` : 'Collect 5 stars today'}</span>
        </div>
      </div>

      <StoryReader story={story} onDone={win('story')} />

      <section className="kd-devo">
        <div className="kd-verse"><span>Memory verse</span><blockquote>&ldquo;{story.verse.text}&rdquo;</blockquote><cite>{story.verse.ref}</cite></div>
        <div className="kd-devo-grid">
          <div><h4>Think about it</h4><p>{story.thought}</p></div>
          <div><h4>Let&rsquo;s pray</h4><p>{story.prayer}</p></div>
          <div><h4>Today&rsquo;s challenge</h4><p>{story.challenge}</p></div>
        </div>
        {story.deep && <div className="kd-deep"><h4>Going deeper <span>for older kids &amp; teens</span></h4><p>{story.deep}</p></div>}
        {story.confess && <div className="kd-confess"><h4>Say it out loud</h4><p>&ldquo;{story.confess}&rdquo;</p></div>}
      </section>

      <section className="kd-games">
        <div className="kd-game-tabs" role="tablist">
          {GAMES.map((g) => <button type="button" role="tab" key={g.key} aria-selected={game === g.key} className={game === g.key ? 'on' : ''} onClick={() => setGame(g.key)}>{done[g.key] && <i aria-hidden="true">&#10003;</i>}{g.label}</button>)}
        </div>
        <div className="kd-game" key={game}>
          {game === 'quiz' && <Quiz story={story} onWin={win('quiz')} />}
          {game === 'search' && <WordSearch story={story} seed={seed} onWin={win('search')} />}
          {game === 'cross' && <Crossword story={story} onWin={win('cross')} />}
          {game === 'verse' && <VerseBuilder story={story} seed={seed} onWin={win('verse')} />}
        </div>
      </section>
    </div>
  );
}
