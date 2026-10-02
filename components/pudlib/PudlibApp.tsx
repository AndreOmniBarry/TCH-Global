'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LibItem, LibKind } from '@/lib/library';
import PudlibLogo from './PudlibLogo';

type History = Record<string, { at: number; progress: number }>;
const HIST_KEY = 'pudlib_history';

function loadHistory(): History {
  try { return JSON.parse(localStorage.getItem(HIST_KEY) || '{}'); } catch { return {}; }
}
function saveHistory(h: History) {
  try { localStorage.setItem(HIST_KEY, JSON.stringify(h)); } catch {}
}
function tokens(s: string) {
  return new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 3));
}
function fmtTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
  return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(s).padStart(2, '0')}`;
}
function track(id: string) {
  fetch('/api/track-view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: `media:${id}`, event: 'view' }) }).catch(() => {});
}

// Personal ranking: base score + similarity to what this visitor played
// recently (same series counts most), minus things already finished.
function personalise(items: LibItem[], history: History) {
  const recent = Object.entries(history).sort((a, b) => b[1].at - a[1].at).slice(0, 8);
  const byId = new Map(items.map((i) => [i.id, i]));
  const seenSeries = new Set<string>();
  const seenTokens = new Set<string>();
  for (const [id] of recent) {
    const it = byId.get(id);
    if (!it) continue;
    if (it.series) seenSeries.add(it.series.toLowerCase());
    tokens(it.title).forEach((t) => seenTokens.add(t));
  }
  return [...items]
    .map((it) => {
      let s = it.score;
      if (it.series && seenSeries.has(it.series.toLowerCase())) s += 0.6;
      let overlap = 0;
      tokens(it.title).forEach((t) => { if (seenTokens.has(t)) overlap += 1; });
      s += Math.min(0.4, overlap * 0.12);
      const h = history[it.id];
      if (h && h.progress > 0.92) s -= 0.8;
      return { it, s };
    })
    .sort((a, b) => b.s - a.s)
    .map((x) => x.it);
}

/* ---------------- YouTube player with PUDLIB! controls ---------------- */

declare global {
  interface Window { YT?: any; onYouTubeIframeAPIReady?: () => void }
}
let ytReady: Promise<void> | null = null;
function loadYT() {
  if (ytReady) return ytReady;
  ytReady = new Promise((resolve) => {
    if (window.YT?.Player) return resolve();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  });
  return ytReady;
}

function VideoPlayer({ item, upNext, onClose, onPlay, onProgress }: {
  item: LibItem; upNext: LibItem[]; onClose: () => void; onPlay: (it: LibItem) => void; onProgress: (id: string, p: number) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [muted, setMuted] = useState(false);
  const [idle, setIdle] = useState(false);
  const idleTimer = useRef(0);

  useEffect(() => {
    let cancelled = false;
    track(item.id);
    loadYT().then(() => {
      if (cancelled || !hostRef.current) return;
      const el = document.createElement('div');
      hostRef.current.innerHTML = '';
      hostRef.current.appendChild(el);
      playerRef.current = new window.YT.Player(el, {
        videoId: item.youtubeId,
        host: 'https://www.youtube-nocookie.com',
        playerVars: { autoplay: 1, controls: 0, modestbranding: 1, rel: 0, iv_load_policy: 3, playsinline: 1, disablekb: 1, fs: 0, cc_load_policy: 0 },
        events: {
          onReady: (e: any) => { setDur(e.target.getDuration() || 0); e.target.playVideo(); },
          onStateChange: (e: any) => {
            const S = window.YT.PlayerState;
            setPlaying(e.data === S.PLAYING);
            if (e.data === S.ENDED) {
              onProgress(item.id, 1);
              if (upNext[0]) onPlay(upNext[0]);
            }
          },
        },
      });
    });
    return () => { cancelled = true; try { playerRef.current?.destroy(); } catch {} playerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  useEffect(() => {
    const t = window.setInterval(() => {
      const p = playerRef.current;
      if (!p?.getCurrentTime) return;
      const ct = p.getCurrentTime() || 0, d = p.getDuration() || 0;
      setTime(ct); if (d) setDur(d);
      if (d > 0) onProgress(item.id, ct / d);
    }, 500);
    return () => window.clearInterval(t);
  }, [item.id, onProgress]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); toggle(); }
      if (e.key === 'ArrowRight') seekBy(10);
      if (e.key === 'ArrowLeft') seekBy(-10);
    }
    window.addEventListener('keydown', onKey);
    document.documentElement.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.documentElement.style.overflow = ''; };
  });

  function toggle() { const p = playerRef.current; if (!p) return; playing ? p.pauseVideo() : p.playVideo(); }
  function seekBy(s: number) { const p = playerRef.current; if (!p) return; p.seekTo(Math.max(0, (p.getCurrentTime() || 0) + s), true); }
  function seekTo(frac: number) { const p = playerRef.current; if (!p || !dur) return; p.seekTo(frac * dur, true); setTime(frac * dur); }
  function toggleMute() { const p = playerRef.current; if (!p) return; if (p.isMuted()) { p.unMute(); setMuted(false); } else { p.mute(); setMuted(true); } }
  function fullscreen() {
    const el = frameRef.current as any;
    if (document.fullscreenElement) document.exitFullscreen();
    else (el?.requestFullscreen || el?.webkitRequestFullscreen)?.call(el);
  }
  function wake() {
    setIdle(false);
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setIdle(true), 2600);
  }

  return (
    <div className="pl-modal" role="dialog" aria-modal="true" aria-label={item.title}>
      <div className="pl-modal-top">
        <PudlibLogo size={30} />
        <button type="button" className="pl-icon-btn" onClick={onClose} aria-label="Close player">&times;</button>
      </div>
      <div className={`pl-frame${idle && playing ? ' idle' : ''}`} ref={frameRef} onPointerMove={wake} onPointerDown={wake}>
        <div className="pl-yt" ref={hostRef} />
        <button type="button" className="pl-shield" aria-label={playing ? 'Pause' : 'Play'} onClick={toggle} />
        {!playing && <span className="pl-bigplay" aria-hidden="true">▶</span>}
        <div className="pl-controls">
          <input
            className="pl-seek" type="range" min={0} max={1000} aria-label="Seek"
            value={dur ? Math.round((time / dur) * 1000) : 0}
            onChange={(e) => seekTo(Number(e.target.value) / 1000)}
            style={{ ['--pct' as string]: `${dur ? (time / dur) * 100 : 0}%` }}
          />
          <div className="pl-row">
            <button type="button" className="pl-icon-btn" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>{playing ? '❚❚' : '▶'}</button>
            <button type="button" className="pl-icon-btn" onClick={() => seekBy(-10)} aria-label="Back 10 seconds">↺10</button>
            <button type="button" className="pl-icon-btn" onClick={() => seekBy(10)} aria-label="Forward 10 seconds">10↻</button>
            <button type="button" className="pl-icon-btn" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>{muted ? '🔇' : '🔊'}</button>
            <span className="pl-time">{fmtTime(time)} / {fmtTime(dur)}</span>
            <span className="pl-spacer" />
            {upNext[0] && <button type="button" className="pl-text-btn" onClick={() => onPlay(upNext[0])}>Next ›</button>}
            <button type="button" className="pl-icon-btn" onClick={fullscreen} aria-label="Fullscreen">⛶</button>
          </div>
        </div>
      </div>
      <div className="pl-meta">
        <h2>{item.title}</h2>
        {item.series && <span className="pl-chip">Series · {item.series}</span>}
      </div>
      {upNext.length > 0 && (
        <div className="pl-upnext">
          <h3>Up next</h3>
          <div className="pl-rail">
            {upNext.slice(0, 8).map((n) => (
              <button type="button" key={n.id} className="pl-card pl-card--sm" onClick={() => onPlay(n)}>
                <span className="pl-thumb"><img src={n.image} alt="" loading="lazy" /><i>{n.kind === 'audio' ? 'Audio' : 'Video'}</i></span>
                <span className="pl-title">{n.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Audio mini player ---------------- */

function AudioBar({ item, onClose, onProgress, onEnded }: { item: LibItem; onClose: () => void; onProgress: (id: string, p: number) => void; onEnded: () => void }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  useEffect(() => { track(item.id); ref.current?.play().catch(() => {}); }, [item.id]);
  return (
    <div className="pl-audiobar" role="region" aria-label="Audio player">
      <audio
        ref={ref} src={item.audioSrc} preload="metadata"
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => { const a = e.currentTarget; setTime(a.currentTime); if (a.duration) { setDur(a.duration); onProgress(item.id, a.currentTime / a.duration); } }}
        onEnded={() => { onProgress(item.id, 1); onEnded(); }}
      />
      <img src={item.image} alt="" className="pl-audiobar-art" />
      <div className="pl-audiobar-main">
        <div className="pl-audiobar-title">{item.title}</div>
        <input className="pl-seek" type="range" min={0} max={1000} aria-label="Seek"
          value={dur ? Math.round((time / dur) * 1000) : 0}
          onChange={(e) => { const a = ref.current; if (a && dur) a.currentTime = (Number(e.target.value) / 1000) * dur; }}
          style={{ ['--pct' as string]: `${dur ? (time / dur) * 100 : 0}%` }} />
        <div className="pl-time">{fmtTime(time)} / {fmtTime(dur)}</div>
      </div>
      <button type="button" className="pl-icon-btn" onClick={() => { const a = ref.current; if (a) a.currentTime = Math.max(0, a.currentTime - 15); }} aria-label="Back 15 seconds">↺15</button>
      <button type="button" className="pl-icon-btn pl-icon-btn--main" onClick={() => { const a = ref.current; if (!a) return; a.paused ? a.play() : a.pause(); }} aria-label={playing ? 'Pause' : 'Play'}>{playing ? '❚❚' : '▶'}</button>
      <button type="button" className="pl-icon-btn" onClick={onClose} aria-label="Close audio player">&times;</button>
    </div>
  );
}

/* ---------------- Library app ---------------- */

const TABS: { key: 'all' | LibKind; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'video', label: 'Videos' },
  { key: 'audio', label: 'Audio' },
  { key: 'book', label: 'Books' },
];

function Card({ it, onOpen, progress }: { it: LibItem; onOpen: (it: LibItem) => void; progress?: number }) {
  if (it.kind === 'book') {
    return (
      <div className="pl-card pl-card--book">
        <span className="pl-cover"><img src={it.image} alt={`${it.title} cover`} loading="lazy" /></span>
        <span className="pl-title">{it.title}</span>
        {it.price && <span className="pl-sub">{it.price}</span>}
        <a className="pl-order" href={it.orderHref} target="_blank" rel="noopener">Order hard copy</a>
      </div>
    );
  }
  const playable = Boolean(it.youtubeId || it.audioSrc);
  return (
    <button type="button" className="pl-card" onClick={() => onOpen(it)} disabled={!playable}>
      <span className="pl-thumb">
        <img src={it.image} alt="" loading="lazy" />
        <i>{it.kind === 'audio' ? 'Audio' : 'Video'}</i>
        <b className="pl-play" aria-hidden="true">▶</b>
        {progress !== undefined && progress > 0.02 && <span className="pl-progress" style={{ width: `${Math.min(100, progress * 100)}%` }} />}
      </span>
      <span className="pl-title">{it.title}</span>
      {it.series && <span className="pl-sub">{it.series}</span>}
    </button>
  );
}

function Row({ title, items, onOpen, history }: { title: string; items: LibItem[]; onOpen: (it: LibItem) => void; history: History }) {
  if (!items.length) return null;
  return (
    <section className="pl-section">
      <h2>{title}</h2>
      <div className="pl-rail">
        {items.map((it) => <Card key={it.id} it={it} onOpen={onOpen} progress={history[it.id]?.progress} />)}
      </div>
    </section>
  );
}

export default function PudlibApp({ items, videosConnected, initialPlay }: { items: LibItem[]; videosConnected: boolean; initialPlay?: string }) {
  const [tab, setTab] = useState<'all' | LibKind>('all');
  const [q, setQ] = useState('');
  const [history, setHistory] = useState<History>({});
  const [video, setVideo] = useState<LibItem | null>(null);
  const [audio, setAudio] = useState<LibItem | null>(null);
  const histRef = useRef<History>({});

  useEffect(() => { histRef.current = loadHistory(); setHistory(histRef.current); }, []);

  const onProgress = useCallback((id: string, p: number) => {
    const prev = histRef.current[id];
    if (prev && Math.abs(prev.progress - p) < 0.01 && p < 1) return;
    histRef.current = { ...histRef.current, [id]: { at: Date.now(), progress: p } };
    saveHistory(histRef.current);
    setHistory(histRef.current);
  }, []);

  const open = useCallback((it: LibItem) => {
    if (it.kind === 'video' && it.youtubeId) { setAudio(null); setVideo(it); }
    else if (it.kind === 'audio' && it.audioSrc) setAudio(it);
    onProgress(it.id, histRef.current[it.id]?.progress ?? 0.001);
  }, [onProgress]);

  useEffect(() => {
    if (!initialPlay) return;
    const it = items.find((i) => i.id === initialPlay);
    if (it) open(it);
  }, [initialPlay, items, open]);

  const ranked = useMemo(() => personalise(items, history), [items, history]);
  const media = ranked.filter((i) => i.kind !== 'book');
  const byKind = (k: LibKind) => ranked.filter((i) => i.kind === k);
  const continueItems = useMemo(
    () => Object.entries(history)
      .filter(([, h]) => h.progress > 0.02 && h.progress < 0.92)
      .sort((a, b) => b[1].at - a[1].at)
      .map(([id]) => items.find((i) => i.id === id))
      .filter((i): i is LibItem => Boolean(i && i.kind !== 'book')),
    [history, items]
  );
  const latest = [...items].filter((i) => i.kind !== 'book').sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 12);
  const popular = [...items].filter((i) => i.kind !== 'book' && i.views > 0).sort((a, b) => b.views - a.views).slice(0, 12);

  const upNext = useMemo(() => {
    if (!video) return [];
    const sameSeries = video.series ? media.filter((m) => m.id !== video.id && m.series === video.series) : [];
    const rest = media.filter((m) => m.id !== video.id && !sameSeries.includes(m) && m.kind === 'video');
    return [...sameSeries, ...rest].slice(0, 10);
  }, [video, media]);

  const query = q.trim().toLowerCase();
  const results = query
    ? ranked.filter((i) => (tab === 'all' || i.kind === tab) && `${i.title} ${i.series ?? ''} ${i.description ?? ''}`.toLowerCase().includes(query))
    : null;

  return (
    <div className={`pl-app${audio ? ' has-audio' : ''}`}>
      <header className="pl-hero">
        <PudlibLogo size={56} />
        <p>Pastor Uzor Digital Library &mdash; messages, audio and books in one place.</p>
        <div className="pl-search">
          <input type="search" placeholder="Search messages, series, books…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the library" />
        </div>
        <div className="pl-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>
      </header>

      {!videosConnected && (
        <p className="pl-note">Videos appear here automatically once the church&rsquo;s YouTube channel is connected.</p>
      )}

      {results ? (
        <section className="pl-section">
          <h2>{results.length} result{results.length === 1 ? '' : 's'}</h2>
          <div className="pl-grid">{results.map((it) => <Card key={it.id} it={it} onOpen={open} progress={history[it.id]?.progress} />)}</div>
        </section>
      ) : tab === 'all' ? (
        <>
          <Row title="Continue" items={continueItems} onOpen={open} history={history} />
          <Row title="Recommended for you" items={media.slice(0, 12)} onOpen={open} history={history} />
          <Row title="Latest" items={latest} onOpen={open} history={history} />
          <Row title="Most watched" items={popular} onOpen={open} history={history} />
          <Row title="Audio messages" items={byKind('audio').slice(0, 12)} onOpen={open} history={history} />
          <Row title="Books" items={byKind('book')} onOpen={open} history={history} />
        </>
      ) : (
        <section className="pl-section">
          <div className="pl-grid">{byKind(tab).map((it) => <Card key={it.id} it={it} onOpen={open} progress={history[it.id]?.progress} />)}</div>
          {byKind(tab).length === 0 && <p className="pl-note">Nothing here yet.</p>}
        </section>
      )}

      {video && <VideoPlayer item={video} upNext={upNext} onClose={() => setVideo(null)} onPlay={open} onProgress={onProgress} />}
      {audio && (
        <AudioBar
          item={audio} onClose={() => setAudio(null)} onProgress={onProgress}
          onEnded={() => { const next = byKind('audio').find((a) => a.id !== audio.id && (history[a.id]?.progress ?? 0) < 0.92); if (next) setAudio(next); }}
        />
      )}
    </div>
  );
}
