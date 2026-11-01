'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Wrapped } from '@/lib/wrapped';

const DURATION = 6500;

// Counts up to n over ~1.4s once its card is showing.
function CountUp({ n, active }: { n: number; active: boolean }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active) { setV(0); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 1400);
      setV(Math.round(n * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [n, active]);
  return <>{v.toLocaleString('en-NG')}</>;
}

type Card = { key: string; theme: string; share: string; render: (active: boolean) => React.ReactNode };

function cards(w: Wrapped): Card[] {
  const services = Math.round(w.minutes / 60);
  const span = /^\d{4}$/.test(w.period) ? 'all year' : 'all month';
  return [
    {
      key: 'intro', theme: 'wr-t1', share: `My ${w.period} in the Word`,
      render: () => (
        <>
          <p className="wr-eyebrow">TCH Global</p>
          <h2 className="wr-huge">My {w.period}<br />in the Word</h2>
          <p className="wr-lead">{w.name}, God&rsquo;s Word kept you company {span}. Here is what it looked like.</p>
          <p className="wr-hint">Tap to begin</p>
        </>
      ),
    },
    {
      key: 'minutes', theme: 'wr-t2', share: `${w.minutes.toLocaleString('en-NG')} minutes in the Word`,
      render: (a) => (
        <>
          <p className="wr-eyebrow">Time in the Word</p>
          <p className="wr-number"><CountUp n={w.minutes} active={a} /></p>
          <p className="wr-unit">minutes listening and watching</p>
          {services >= 1
            ? <p className="wr-lead">That&rsquo;s about <b>{services} Sunday {services === 1 ? 'service' : 'services'}</b> worth of teaching, carried with you through the week.</p>
            : <p className="wr-lead">Every minute counts. Press play on a message in PUDLIB! and watch this grow.</p>}
          {w.minutes > 0 && w.topPercent < 50 && <p className="wr-chip">More than {100 - w.topPercent}% of TCH listeners</p>}
        </>
      ),
    },
    {
      key: 'days', theme: 'wr-t3', share: `${w.days} days in the Word, ${w.streak}-day streak`,
      render: (a) => (
        <>
          <p className="wr-eyebrow">Showing up</p>
          <p className="wr-number"><CountUp n={w.days} active={a} /></p>
          <p className="wr-unit">days you opened the Word</p>
          <div className="wr-weeks" aria-label="Your year, week by week">
            {w.weeks.map((v, i) => <i key={i} data-v={v} style={{ animationDelay: `${a ? i * 18 : 0}ms` }} />)}
          </div>
          <p className="wr-lead">Your longest run: <b>{w.streak} days in a row</b>.</p>
        </>
      ),
    },
    {
      key: 'top', theme: 'wr-t4', share: `My #1 message: ${w.topMessages[0].title}`,
      render: () => (
        <>
          <p className="wr-eyebrow">Your top messages</p>
          <ol className="wr-list">
            {w.topMessages.map((m, i) => (
              <li key={m.title} style={{ animationDelay: `${150 + i * 120}ms` }}>
                <b>{i + 1}</b>
                <span><strong>{m.title}</strong><em>{m.plays} {m.plays === 1 ? 'play' : 'plays'}{m.series ? ` · ${m.series}` : ''}</em></span>
              </li>
            ))}
          </ol>
        </>
      ),
    },
    {
      key: 'series', theme: 'wr-t5', share: `My series: ${w.topSeries.title}`,
      render: () => {
        const pct = Math.round((w.topSeries.finished / w.topSeries.parts) * 100);
        return (
          <>
            <p className="wr-eyebrow">The series you lived in</p>
            <h2 className="wr-big">{w.topSeries.title}</h2>
            <div className="wr-meter" style={{ ['--p' as string]: `${pct}%` }}><i /></div>
            <p className="wr-lead">You finished <b>{w.topSeries.finished} of {w.topSeries.parts} parts</b>. {w.topSeries.parts - w.topSeries.finished} more are waiting for you in PUDLIB!</p>
          </>
        );
      },
    },
    {
      key: 'reads', theme: 'wr-t6', share: `${w.reads.posts} posts read, top topic ${w.reads.topTopic}`,
      render: (a) => (
        <>
          <p className="wr-eyebrow">Reading</p>
          <p className="wr-number"><CountUp n={w.reads.posts} active={a} /></p>
          <p className="wr-unit">blog posts read to the end</p>
          <p className="wr-lead">Your favourite topic was <b>{w.reads.topTopic}</b>{w.reads.book ? <>, and you opened <b>{w.reads.book}</b> by Pastor Uzor</> : null}.</p>
        </>
      ),
    },
    {
      key: 'prayer', theme: 'wr-t7', share: `${w.prayers.prayed} prayers prayed along`,
      render: (a) => (
        <>
          <p className="wr-eyebrow">Prayer &amp; community</p>
          <p className="wr-number"><CountUp n={w.prayers.prayed} active={a} /></p>
          <p className="wr-unit">times you prayed along</p>
          {w.prayers.testimonies > 0
            ? <p className="wr-lead">And you read <b>{w.prayers.testimonies} testimonies</b> of what God did for others at TCH.</p>
            : <p className="wr-lead">Every request reaches the prayer team, and they stand with you.</p>}
        </>
      ),
    },
    {
      key: 'persona', theme: 'wr-t8', share: `I'm ${w.persona.name}`,
      render: () => (
        <>
          <p className="wr-eyebrow">Your listening personality</p>
          <div className="wr-sun" aria-hidden="true" />
          <h2 className="wr-big">{w.persona.name}</h2>
          <p className="wr-lead">{w.persona.line}</p>
        </>
      ),
    },
    {
      key: 'blessing', theme: 'wr-t9', share: `${w.blessing.ref}`,
      render: () => (
        <>
          <p className="wr-eyebrow">A word for the year ahead</p>
          <blockquote className="wr-verse">&ldquo;{w.blessing.verse}&rdquo;<cite>{w.blessing.ref}</cite></blockquote>
          <p className="wr-lead">{w.blessing.text}</p>
          <p className="wr-sign">Pastor Uzor Echiejile</p>
        </>
      ),
    },
  ];
}

// Draws a card as a 1080x1920 status image (canvas, no external libs).
function saveImage(w: Wrapped, c: Card, theme: [string, string]) {
  const cv = document.createElement('canvas');
  cv.width = 1080; cv.height = 1920;
  const g = cv.getContext('2d');
  if (!g) return;
  const bg = g.createLinearGradient(0, 0, 1080, 1920);
  bg.addColorStop(0, theme[0]); bg.addColorStop(1, theme[1]);
  g.fillStyle = bg; g.fillRect(0, 0, 1080, 1920);
  g.fillStyle = 'rgba(255,255,255,.85)';
  g.font = '800 42px Syne, Arial, sans-serif';
  g.fillText('TCH GLOBAL', 90, 170);
  g.font = '600 46px Arial, sans-serif';
  g.fillText(`My ${w.period} in the Word`, 90, 240);
  g.fillStyle = '#fff';
  g.font = '800 104px Syne, Arial, sans-serif';
  const words = c.share.split(' ');
  let line = ''; let y = 760;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (g.measureText(test).width > 900 && line) { g.fillText(line, 90, y); line = word; y += 124; }
    else line = test;
  }
  g.fillText(line, 90, y);
  g.fillStyle = 'rgba(255,255,255,.8)';
  g.font = '600 44px Arial, sans-serif';
  g.fillText('tch-global.vercel.app', 90, 1800);
  const a = document.createElement('a');
  a.download = `my-${w.period}-in-the-word-${c.key}.png`;
  a.href = cv.toDataURL('image/png');
  a.click();
}

const THEMES: Record<string, [string, string]> = {
  'wr-t1': ['#7c3aed', '#22d3ee'], 'wr-t2': ['#0e7490', '#4f46e5'], 'wr-t3': ['#1e1b4b', '#7c3aed'],
  'wr-t4': ['#be185d', '#7c3aed'], 'wr-t5': ['#0f766e', '#1e3a8a'], 'wr-t6': ['#c2410c', '#be185d'],
  'wr-t7': ['#312e81', '#0e7490'], 'wr-t8': ['#f59e0b', '#db2777'], 'wr-t9': ['#0b0816', '#4c1d95'],
};

export default function WrappedStory({ data, demo = false }: { data: Wrapped; demo?: boolean }) {
  const list = cards(data);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const last = useRef(0);
  const acc = useRef(0);
  const holdAt = useRef(0);

  const go = useCallback((d: number) => {
    setI((v) => Math.max(0, Math.min(list.length - 1, v + d)));
    acc.current = 0;
    setElapsed(0);
  }, [list.length]);

  // Auto-advance, paused while holding or on the last card.
  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      const dt = last.current ? now - last.current : 0;
      last.current = now;
      if (!paused && i < list.length - 1) {
        acc.current += dt;
        if (acc.current >= DURATION) { acc.current = 0; setI((v) => Math.min(list.length - 1, v + 1)); }
        setElapsed(acc.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); last.current = 0; };
  }, [paused, i, list.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  const c = list[i];
  return (
    <div className="wr-stage">
      <div className={`wr-phone ${c.theme}`}>
        <div className="wr-bars" aria-hidden="true">
          {list.map((x, k) => <span key={x.key}><i style={{ width: k < i ? '100%' : k === i ? `${(elapsed / DURATION) * 100}%` : '0%' }} /></span>)}
        </div>
        {demo && <p className="wr-demo">Demo with sample data</p>}
        <div
          className="wr-card"
          key={c.key}
          onPointerDown={() => { holdAt.current = performance.now(); setPaused(true); }}
          onPointerUp={(e) => {
            setPaused(false);
            if (performance.now() - holdAt.current > 350) return; // a hold, not a tap
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            go(e.clientX - r.left < r.width * 0.33 ? -1 : 1);
          }}
          onPointerLeave={() => setPaused(false)}
        >
          {c.render(true)}
        </div>
        <div className="wr-actions">
          <button type="button" onClick={() => saveImage(data, c, THEMES[c.theme])}>Save image</button>
          {i === list.length - 1 && <button type="button" onClick={() => { acc.current = 0; setI(0); setElapsed(0); }}>Watch again</button>}
        </div>
      </div>
      <p className="wr-help">Tap right for next, left to go back, hold to pause. Arrow keys work on a laptop.</p>
    </div>
  );
}
