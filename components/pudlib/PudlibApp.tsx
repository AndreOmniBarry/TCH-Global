'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LibItem, LibKind } from '@/lib/library';
import PudlibLogo from './PudlibLogo';
import {
  IconPlay, IconPause, IconBack, IconForward, IconVolume, IconMute, IconFull, IconMinimize,
  IconExpand, IconClose, IconNext, IconHistory, IconBook, IconAudio, IconVideo,
} from './icons';

type HistoryEntry = { at: number; progress: number; t?: number };
type History = Record<string, HistoryEntry>;
const HIST_KEY = 'pudlib_history';
const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

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
function ago(ts: number) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
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

/* ---------------- Seek bar with hover-time preview ---------------- */

function SeekBar({ time, dur, onSeek }: { time: number; dur: number; onSeek: (sec: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const frac = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  };
  const shown = drag ?? (dur ? time / dur : 0);
  return (
    <div
      ref={ref}
      className="pl-seekbar"
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(dur)}
      aria-valuenow={Math.round(time)}
      aria-valuetext={`${fmtTime(time)} of ${fmtTime(dur)}`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') onSeek(Math.min(dur, time + 5));
        if (e.key === 'ArrowLeft') onSeek(Math.max(0, time - 5));
      }}
      onPointerMove={(e) => { const f = frac(e.clientX); setHover(f); if (drag !== null) setDrag(f); }}
      onPointerLeave={() => setHover(null)}
      onPointerDown={(e) => { (e.target as Element).setPointerCapture?.(e.pointerId); setDrag(frac(e.clientX)); }}
      onPointerUp={(e) => { const f = frac(e.clientX); setDrag(null); if (dur) onSeek(f * dur); }}
    >
      <div className="pl-seekbar-track">
        {hover !== null && <div className="pl-seekbar-hover" style={{ width: `${hover * 100}%` }} />}
        <div className="pl-seekbar-fill" style={{ width: `${shown * 100}%` }} />
        <div className="pl-seekbar-knob" style={{ left: `${shown * 100}%` }} />
      </div>
      {hover !== null && dur > 0 && (
        <span className="pl-seekbar-tip" style={{ left: `${hover * 100}%` }}>{fmtTime(hover * dur)}</span>
      )}
    </div>
  );
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

function VideoPlayer({ item, upNext, resumeAt, mini, setMini, onClose, onPlay, onProgress }: {
  item: LibItem; upNext: LibItem[]; resumeAt: number; mini: boolean; setMini: (v: boolean) => void;
  onClose: () => void; onPlay: (it: LibItem) => void; onProgress: (id: string, p: number, t: number) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [speed, setSpeed] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [idle, setIdle] = useState(false);
  const idleTimer = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setReady(false); setTime(0); setDur(0);
    track(item.id);
    loadYT().then(() => {
      if (cancelled || !hostRef.current) return;
      const el = document.createElement('div');
      hostRef.current.innerHTML = '';
      hostRef.current.appendChild(el);
      playerRef.current = new window.YT.Player(el, {
        videoId: item.youtubeId,
        host: 'https://www.youtube-nocookie.com',
        playerVars: { autoplay: 1, controls: 0, modestbranding: 1, rel: 0, iv_load_policy: 3, playsinline: 1, disablekb: 1, fs: 0, cc_load_policy: 0, start: Math.floor(resumeAt) },
        events: {
          onReady: (e: any) => { setReady(true); setDur(e.target.getDuration() || 0); e.target.playVideo(); },
          onStateChange: (e: any) => {
            const S = window.YT.PlayerState;
            setPlaying(e.data === S.PLAYING);
            if (e.data === S.ENDED) {
              const d = playerRef.current?.getDuration?.() || 0;
              onProgress(item.id, 1, d);
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
      if (d > 0 && ct > 1) onProgress(item.id, ct / d, ct);
    }, 500);
    return () => window.clearInterval(t);
  }, [item.id, onProgress]);

  useEffect(() => {
    if (mini) { document.documentElement.style.overflow = ''; return; }
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'Escape') setMini(true);
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); toggle(); }
      if (e.key === 'ArrowRight') seekBy(10);
      if (e.key === 'ArrowLeft') seekBy(-10);
      if (e.key === 'm') toggleMute();
      if (e.key === 'f') fullscreen();
    }
    window.addEventListener('keydown', onKey);
    document.documentElement.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.documentElement.style.overflow = ''; };
  });

  function toggle() { const p = playerRef.current; if (!p?.playVideo) return; playing ? p.pauseVideo() : p.playVideo(); }
  function seekTo(sec: number) { const p = playerRef.current; if (!p?.seekTo) return; p.seekTo(sec, true); setTime(sec); }
  function seekBy(s: number) { const p = playerRef.current; if (!p?.getCurrentTime) return; seekTo(Math.max(0, (p.getCurrentTime() || 0) + s)); }
  function toggleMute() { const p = playerRef.current; if (!p?.isMuted) return; if (p.isMuted()) { p.unMute(); setMuted(false); } else { p.mute(); setMuted(true); } }
  function changeVolume(v: number) { const p = playerRef.current; if (!p?.setVolume) return; p.setVolume(v); setVolume(v); if (v > 0 && p.isMuted()) { p.unMute(); setMuted(false); } }
  function changeSpeed(s: number) { playerRef.current?.setPlaybackRate?.(s); setSpeed(s); setSpeedOpen(false); }
  function fullscreen() {
    const el = frameRef.current as any;
    if (document.fullscreenElement) document.exitFullscreen();
    else (el?.requestFullscreen || el?.webkitRequestFullscreen)?.call(el);
  }
  function wake() {
    setIdle(false);
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setIdle(true), 2800);
  }

  const frame = (
    <div className={`pl-frame${idle && playing && !mini ? ' idle' : ''}`} ref={frameRef} onPointerMove={wake} onPointerDown={wake}>
      <div className="pl-yt" ref={hostRef} />
      <button type="button" className="pl-shield" aria-label={playing ? 'Pause' : 'Play'} onClick={mini ? () => setMini(false) : toggle} />
      {!ready && <div className="pl-loading" aria-hidden="true"><span /></div>}
      {ready && !playing && !mini && <span className="pl-bigplay" aria-hidden="true"><IconPlay size={34} /></span>}
      {mini ? (
        <div className="pl-mini-controls">
          <button type="button" className="pl-icon-btn" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <IconPause /> : <IconPlay />}</button>
          <button type="button" className="pl-icon-btn" onClick={() => setMini(false)} aria-label="Expand player"><IconExpand /></button>
          <button type="button" className="pl-icon-btn" onClick={onClose} aria-label="Close player"><IconClose /></button>
          <div className="pl-mini-progress" style={{ width: `${dur ? (time / dur) * 100 : 0}%` }} />
        </div>
      ) : (
        <>
          <div className="pl-frame-top">
            <span className="pl-frame-title">{item.title}</span>
          </div>
          <div className="pl-controls">
            <SeekBar time={time} dur={dur} onSeek={seekTo} />
            <div className="pl-row">
              <button type="button" className="pl-icon-btn pl-icon-btn--main" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <IconPause /> : <IconPlay />}</button>
              <button type="button" className="pl-icon-btn" onClick={() => seekBy(-10)} aria-label="Back 10 seconds"><IconBack /></button>
              <button type="button" className="pl-icon-btn" onClick={() => seekBy(10)} aria-label="Forward 10 seconds"><IconForward /></button>
              {upNext[0] && <button type="button" className="pl-icon-btn" onClick={() => onPlay(upNext[0])} aria-label={`Next: ${upNext[0].title}`}><IconNext /></button>}
              <div className="pl-volume">
                <button type="button" className="pl-icon-btn" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>{muted || volume === 0 ? <IconMute /> : <IconVolume />}</button>
                <input type="range" min={0} max={100} value={muted ? 0 : volume} onChange={(e) => changeVolume(Number(e.target.value))} aria-label="Volume" style={{ ['--pct' as string]: `${muted ? 0 : volume}%` }} />
              </div>
              <span className="pl-time">{fmtTime(time)} <span>/ {fmtTime(dur)}</span></span>
              <span className="pl-spacer" />
              <div className="pl-speed">
                <button type="button" className="pl-text-btn" onClick={() => setSpeedOpen((o) => !o)} aria-haspopup="menu" aria-expanded={speedOpen}>{speed}&times;</button>
                {speedOpen && (
                  <div className="pl-speed-menu" role="menu">
                    {SPEEDS.map((s) => (
                      <button type="button" role="menuitemradio" aria-checked={s === speed} key={s} className={s === speed ? 'on' : ''} onClick={() => changeSpeed(s)}>{s === 1 ? 'Normal' : `${s}×`}</button>
                    ))}
                  </div>
                )}
              </div>
              <button type="button" className="pl-icon-btn" onClick={() => setMini(true)} aria-label="Minimise player"><IconMinimize /></button>
              <button type="button" className="pl-icon-btn" onClick={fullscreen} aria-label="Fullscreen"><IconFull /></button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  if (mini) return <div className="pl-mini" role="region" aria-label={`Now playing: ${item.title}`}>{frame}</div>;

  return (
    <div className="pl-modal" role="dialog" aria-modal="true" aria-label={item.title}>
      <div className="pl-modal-top">
        <PudlibLogo size={26} />
        <div className="pl-modal-actions">
          <button type="button" className="pl-icon-btn" onClick={() => setMini(true)} aria-label="Minimise player"><IconMinimize /></button>
          <button type="button" className="pl-icon-btn" onClick={onClose} aria-label="Close player"><IconClose /></button>
        </div>
      </div>
      <div className="pl-theatre">
        <div className="pl-theatre-main">
          {frame}
          <div className="pl-meta">
            <h2>{item.title}</h2>
            <div className="pl-meta-row">
              {item.series && <span className="pl-chip">Series &middot; {item.series}</span>}
              {item.date && <span className="pl-chip">{new Date(item.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
              {item.views > 0 && <span className="pl-chip">{item.views.toLocaleString()} plays</span>}
            </div>
          </div>
        </div>
        {upNext.length > 0 && (
          <aside className="pl-queue" aria-label="Up next">
            <h3>Up next</h3>
            {upNext.slice(0, 10).map((n, i) => (
              <button type="button" key={n.id} className="pl-queue-item" onClick={() => onPlay(n)}>
                <span className="pl-queue-thumb"><img src={n.image} alt="" loading="lazy" />{i === 0 && <em>Next</em>}</span>
                <span className="pl-queue-text"><span className="pl-title">{n.title}</span>{n.series && <span className="pl-sub">{n.series}</span>}</span>
              </button>
            ))}
          </aside>
        )}
      </div>
    </div>
  );
}

/* ---------------- Audio mini player ---------------- */

function AudioBar({ item, resumeAt, onClose, onProgress, onEnded }: { item: LibItem; resumeAt: number; onClose: () => void; onProgress: (id: string, p: number, t: number) => void; onEnded: () => void }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [speed, setSpeed] = useState(1);
  useEffect(() => { track(item.id); ref.current?.play().catch(() => {}); }, [item.id]);
  return (
    <div className="pl-audiobar" role="region" aria-label="Audio player">
      <audio
        ref={ref} src={item.audioSrc} preload="metadata"
        onLoadedMetadata={(e) => { if (resumeAt > 1) e.currentTarget.currentTime = resumeAt; }}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => { const a = e.currentTarget; setTime(a.currentTime); if (a.duration) { setDur(a.duration); onProgress(item.id, a.currentTime / a.duration, a.currentTime); } }}
        onEnded={() => { onProgress(item.id, 1, dur); onEnded(); }}
      />
      <img src={item.image} alt="" className="pl-audiobar-art" />
      <div className="pl-audiobar-main">
        <div className="pl-audiobar-title">{item.title}</div>
        <SeekBar time={time} dur={dur} onSeek={(s) => { if (ref.current) ref.current.currentTime = s; }} />
        <div className="pl-time">{fmtTime(time)} <span>/ {fmtTime(dur)}</span></div>
      </div>
      <button type="button" className="pl-icon-btn" onClick={() => { const a = ref.current; if (a) a.currentTime = Math.max(0, a.currentTime - 10); }} aria-label="Back 10 seconds"><IconBack /></button>
      <button type="button" className="pl-icon-btn pl-icon-btn--main" onClick={() => { const a = ref.current; if (!a) return; a.paused ? a.play() : a.pause(); }} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <IconPause /> : <IconPlay />}</button>
      <button type="button" className="pl-icon-btn" onClick={() => { const a = ref.current; if (a) a.currentTime = Math.min(a.duration || 0, a.currentTime + 10); }} aria-label="Forward 10 seconds"><IconForward /></button>
      <button type="button" className="pl-text-btn pl-hide-sm" onClick={() => { const i = SPEEDS.indexOf(speed); const n = SPEEDS[(i + 1) % SPEEDS.length]; setSpeed(n); if (ref.current) ref.current.playbackRate = n; }} aria-label="Playback speed">{speed}&times;</button>
      <button type="button" className="pl-icon-btn" onClick={onClose} aria-label="Close audio player"><IconClose /></button>
    </div>
  );
}

/* ---------------- Library app ---------------- */

type Tab = 'all' | LibKind | 'history';
const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'For you' },
  { key: 'video', label: 'Videos' },
  { key: 'audio', label: 'Audio' },
  { key: 'book', label: 'Books' },
  { key: 'history', label: 'History' },
];

function KindBadge({ kind }: { kind: LibKind }) {
  return (
    <i className="pl-badge">
      {kind === 'audio' ? <IconAudio size={13} /> : kind === 'book' ? <IconBook size={13} /> : <IconVideo size={13} />}
      {kind === 'audio' ? 'Audio' : kind === 'book' ? 'Book' : 'Video'}
    </i>
  );
}

function Card({ it, onOpen, entry }: { it: LibItem; onOpen: (it: LibItem) => void; entry?: HistoryEntry }) {
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
  const p = entry?.progress ?? 0;
  return (
    <button type="button" className="pl-card" onClick={() => onOpen(it)} disabled={!playable}>
      <span className="pl-thumb">
        <img src={it.image} alt="" loading="lazy" />
        <KindBadge kind={it.kind} />
        <b className="pl-play" aria-hidden="true"><IconPlay size={18} /></b>
        {p > 0.02 && <span className="pl-progress"><span style={{ width: `${Math.min(100, p * 100)}%` }} /></span>}
      </span>
      <span className="pl-title">{it.title}</span>
      <span className="pl-sub">
        {entry ? (p > 0.92 ? `Watched · ${ago(entry.at)}` : p > 0.02 ? `${Math.round(p * 100)}% · ${ago(entry.at)}` : it.series ?? '') : it.series ?? ''}
      </span>
    </button>
  );
}

function Row({ title, items, onOpen, history, action }: { title: string; items: LibItem[]; onOpen: (it: LibItem) => void; history: History; action?: React.ReactNode }) {
  if (!items.length) return null;
  return (
    <section className="pl-section">
      <div className="pl-section-head"><h2>{title}</h2>{action}</div>
      <div className="pl-rail">
        {items.map((it) => <Card key={it.id} it={it} onOpen={onOpen} entry={history[it.id]} />)}
      </div>
    </section>
  );
}

export default function PudlibApp({ items, videosConnected, initialPlay }: { items: LibItem[]; videosConnected: boolean; initialPlay?: string }) {
  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');
  const [history, setHistory] = useState<History>({});
  const [video, setVideo] = useState<LibItem | null>(null);
  const [mini, setMini] = useState(false);
  const [audio, setAudio] = useState<LibItem | null>(null);
  const histRef = useRef<History>({});
  const lastSave = useRef(0);

  useEffect(() => { histRef.current = loadHistory(); setHistory(histRef.current); }, []);

  const onProgress = useCallback((id: string, p: number, t: number) => {
    histRef.current = { ...histRef.current, [id]: { at: Date.now(), progress: p, t } };
    const now = Date.now();
    if (p >= 1 || now - lastSave.current > 4000) {
      lastSave.current = now;
      saveHistory(histRef.current);
      setHistory(histRef.current);
    }
  }, []);

  const open = useCallback((it: LibItem) => {
    if (it.kind === 'video' && it.youtubeId) { setAudio(null); setVideo(it); setMini(false); }
    else if (it.kind === 'audio' && it.audioSrc) { setAudio(it); setVideo(null); }
    if (!histRef.current[it.id]) {
      histRef.current = { ...histRef.current, [it.id]: { at: Date.now(), progress: 0.001, t: 0 } };
      saveHistory(histRef.current);
      setHistory(histRef.current);
    }
  }, []);

  useEffect(() => {
    if (!initialPlay) return;
    const it = items.find((i) => i.id === initialPlay);
    if (it) open(it);
  }, [initialPlay, items, open]);

  const ranked = useMemo(() => personalise(items, history), [items, history]);
  const media = ranked.filter((i) => i.kind !== 'book');
  const byKind = (k: LibKind) => ranked.filter((i) => i.kind === k);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const recentlyPlayed = useMemo(
    () => Object.entries(history).sort((a, b) => b[1].at - a[1].at).map(([id]) => byId.get(id)).filter((i): i is LibItem => Boolean(i && i.kind !== 'book')),
    [history, byId]
  );
  const continueItems = recentlyPlayed.filter((i) => { const p = history[i.id]?.progress ?? 0; return p > 0.02 && p < 0.92; });
  const latest = [...items].filter((i) => i.kind !== 'book').sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 14);
  const popular = [...items].filter((i) => i.kind !== 'book' && i.views > 0).sort((a, b) => b.views - a.views).slice(0, 14);

  const upNext = useMemo(() => {
    if (!video) return [];
    const sameSeries = video.series ? media.filter((m) => m.id !== video.id && m.series === video.series) : [];
    const rest = media.filter((m) => m.id !== video.id && !sameSeries.includes(m) && m.kind === 'video' && (history[m.id]?.progress ?? 0) < 0.92);
    return [...sameSeries, ...rest].slice(0, 10);
  }, [video, media, history]);

  function clearHistory() {
    histRef.current = {};
    saveHistory({});
    setHistory({});
  }

  const query = q.trim().toLowerCase();
  const results = query
    ? ranked.filter((i) => (tab === 'all' || tab === 'history' || i.kind === tab) && `${i.title} ${i.series ?? ''} ${i.description ?? ''}`.toLowerCase().includes(query))
    : null;
  const resumeAt = (it: LibItem | null) => {
    if (!it) return 0;
    const h = history[it.id];
    return h && h.progress > 0.02 && h.progress < 0.92 ? h.t ?? 0 : 0;
  };

  return (
    <div className={`pl-app${audio || (video && mini) ? ' has-dock' : ''}`}>
      <header className="pl-hero">
        <PudlibLogo size={56} />
        <p>Pastor Uzor Digital Library. Messages, audio and books, in one place.</p>
        <div className="pl-search">
          <input type="search" placeholder="Search messages, series, books" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the library" />
        </div>
        <div className="pl-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>
              {t.key === 'history' && <IconHistory size={15} />}{t.label}
            </button>
          ))}
        </div>
      </header>

      {!videosConnected && <p className="pl-note">Videos appear here automatically once the church&rsquo;s YouTube channel is connected.</p>}

      {results ? (
        <section className="pl-section">
          <div className="pl-section-head"><h2>{results.length} result{results.length === 1 ? '' : 's'}</h2></div>
          <div className="pl-grid">{results.map((it) => <Card key={it.id} it={it} onOpen={open} entry={history[it.id]} />)}</div>
        </section>
      ) : tab === 'all' ? (
        <>
          <Row title="Continue" items={continueItems} onOpen={open} history={history} />
          <Row title="Recommended for you" items={media.slice(0, 14)} onOpen={open} history={history} />
          <Row title="Recently played" items={recentlyPlayed.slice(0, 14)} onOpen={open} history={history}
            action={<button type="button" className="pl-link-btn" onClick={() => setTab('history')}>See all</button>} />
          <Row title="Latest" items={latest} onOpen={open} history={history} />
          <Row title="Most played" items={popular} onOpen={open} history={history} />
          <Row title="Audio messages" items={byKind('audio').slice(0, 14)} onOpen={open} history={history} />
          <Row title="Books" items={byKind('book')} onOpen={open} history={history} />
        </>
      ) : tab === 'history' ? (
        <section className="pl-section">
          <div className="pl-section-head">
            <h2>Your history</h2>
            {recentlyPlayed.length > 0 && <button type="button" className="pl-link-btn" onClick={clearHistory}>Clear history</button>}
          </div>
          {recentlyPlayed.length ? (
            <div className="pl-grid">{recentlyPlayed.map((it) => <Card key={it.id} it={it} onOpen={open} entry={history[it.id]} />)}</div>
          ) : (
            <p className="pl-note">Nothing played yet. Messages you watch or listen to appear here, with where you stopped.</p>
          )}
        </section>
      ) : (
        <section className="pl-section">
          <div className="pl-grid">{byKind(tab).map((it) => <Card key={it.id} it={it} onOpen={open} entry={history[it.id]} />)}</div>
          {byKind(tab).length === 0 && <p className="pl-note">Nothing here yet.</p>}
        </section>
      )}

      {video && (
        <VideoPlayer
          item={video} upNext={upNext} resumeAt={resumeAt(video)} mini={mini} setMini={setMini}
          onClose={() => { setVideo(null); setMini(false); saveHistory(histRef.current); setHistory(histRef.current); }}
          onPlay={open} onProgress={onProgress}
        />
      )}
      {audio && (
        <AudioBar
          item={audio} resumeAt={resumeAt(audio)} onClose={() => { setAudio(null); saveHistory(histRef.current); setHistory(histRef.current); }} onProgress={onProgress}
          onEnded={() => { const next = byKind('audio').find((a) => a.id !== audio.id && (history[a.id]?.progress ?? 0) < 0.92); if (next) setAudio(next); }}
        />
      )}
    </div>
  );
}
