'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LibItem, LibKind } from '@/lib/library';
import { buildModel, recommend, similar, TOPICS, type CoPlay } from '@/lib/recommend';
import PudlibLogo from './PudlibLogo';
import MotionPlay from '@/components/MotionPlay';
import { useSlidingPill } from '@/components/useSlidingPill';
import {
  IconBack, IconForward, IconVolume, IconMute, IconMinimize,
  IconExpand, IconClose, IconNext, IconHistory, IconBook, IconAudio, IconVideo,
  IconPortrait, IconLandscape, IconExitFull, IconPlaylist, IconPlus, IconCheck,
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
  const [fs, setFs] = useState<null | 'landscape' | 'portrait'>(null);

  useEffect(() => {
    function onChange() { if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) setFs(null); }
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => { document.removeEventListener('fullscreenchange', onChange); document.removeEventListener('webkitfullscreenchange', onChange); };
  }, []);

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
      if (e.key === 'Escape') { if (fs) exitFs(); else setMini(true); }
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); toggle(); }
      if (e.key === 'ArrowRight') seekBy(10);
      if (e.key === 'ArrowLeft') seekBy(-10);
      if (e.key === 'm') toggleMute();
      if (e.key === 'f') (fs ? exitFs() : enterFs('landscape'));
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
  // Two fullscreen modes. Where the browser allows real fullscreen we use
  // it and lock the orientation; on iPhone (no element fullscreen) the
  // frame covers the screen itself, and landscape rotates the picture.
  function enterFs(mode: 'landscape' | 'portrait') {
    const el = frameRef.current as any;
    setFs(mode);
    const req = el?.requestFullscreen || el?.webkitRequestFullscreen;
    const p = req ? req.call(el) : null;
    Promise.resolve(p).then(() => (screen.orientation as any)?.lock?.(mode)).catch(() => {});
  }
  function exitFs() {
    setFs(null);
    try { (screen.orientation as any)?.unlock?.(); } catch {}
    const d = document as any;
    if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen)?.call(d);
  }
  function wake() {
    setIdle(false);
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setIdle(true), 2800);
  }

  const frame = (
    <div className={`pl-frame${idle && playing && !mini ? ' idle' : ''}${fs ? ` fs fs-${fs}` : ''}`} ref={frameRef} onPointerMove={wake} onPointerDown={wake}>
      <div className="pl-yt" ref={hostRef} />
      <button type="button" className="pl-shield" aria-label={playing ? 'Pause' : 'Play'} onClick={mini ? () => setMini(false) : toggle} />
      {!ready && <div className="pl-loading" aria-hidden="true"><span /></div>}
      {ready && !mini && <span className={`pl-bigplay${playing ? ' is-hidden' : ''}`}><MotionPlay size={76} ring playing={playing} /></span>}
      {mini ? (
        <div className="pl-mini-controls">
          <button type="button" className="pl-main-btn" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}><MotionPlay size={34} playing={playing} /></button>
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
              <button type="button" className="pl-main-btn" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}><MotionPlay size={44} playing={playing} /></button>
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
              {fs ? (
                <button type="button" className="pl-icon-btn" onClick={exitFs} aria-label="Exit fullscreen"><IconExitFull /></button>
              ) : (
                <>
                  <button type="button" className="pl-icon-btn" onClick={() => enterFs('portrait')} aria-label="Fullscreen portrait"><IconPortrait /></button>
                  <button type="button" className="pl-icon-btn" onClick={() => enterFs('landscape')} aria-label="Fullscreen landscape"><IconLandscape /></button>
                </>
              )}
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
      <button type="button" className="pl-main-btn" onClick={() => { const a = ref.current; if (!a) return; a.paused ? a.play() : a.pause(); }} aria-label={playing ? 'Pause' : 'Play'}><MotionPlay size={44} playing={playing} /></button>
      <button type="button" className="pl-icon-btn" onClick={() => { const a = ref.current; if (a) a.currentTime = Math.min(a.duration || 0, a.currentTime + 10); }} aria-label="Forward 10 seconds"><IconForward /></button>
      <button type="button" className="pl-text-btn pl-hide-sm" onClick={() => { const i = SPEEDS.indexOf(speed); const n = SPEEDS[(i + 1) % SPEEDS.length]; setSpeed(n); if (ref.current) ref.current.playbackRate = n; }} aria-label="Playback speed">{speed}&times;</button>
      <button type="button" className="pl-icon-btn" onClick={onClose} aria-label="Close audio player"><IconClose /></button>
    </div>
  );
}

/* ---------------- Library app ---------------- */

type Tab = 'all' | LibKind | 'playlists' | 'history';
const TABS: { key: Tab; label: string }[] = [
  { key: 'all', label: 'For you' },
  { key: 'video', label: 'Videos' },
  { key: 'audio', label: 'Audio' },
  { key: 'playlists', label: 'Playlists' },
  { key: 'book', label: 'Books' },
  { key: 'history', label: 'History' },
];
type Sort = 'best' | 'new' | 'old' | 'popular' | 'az';
const SORTS: { key: Sort; label: string }[] = [
  { key: 'best', label: 'Best for you' },
  { key: 'new', label: 'Newest' },
  { key: 'old', label: 'Oldest' },
  { key: 'popular', label: 'Most played' },
  { key: 'az', label: 'Title A–Z' },
];

type Playlist = { id: string; name: string; ids: string[] };
const PL_KEY = 'pudlib_playlists';
function loadPlaylists(): Playlist[] {
  try {
    const v = JSON.parse(localStorage.getItem(PL_KEY) || 'null');
    if (Array.isArray(v)) return v;
  } catch {}
  return [{ id: 'later', name: 'Watch later', ids: [] }];
}
function savePlaylists(p: Playlist[]) { try { localStorage.setItem(PL_KEY, JSON.stringify(p)); } catch {} }

function KindBadge({ kind }: { kind: LibKind }) {
  return (
    <i className="pl-badge">
      {kind === 'audio' ? <IconAudio size={13} /> : kind === 'book' ? <IconBook size={13} /> : <IconVideo size={13} />}
      {kind === 'audio' ? 'Audio' : kind === 'book' ? 'Book' : 'Video'}
    </i>
  );
}

type SaveFn = (it: LibItem) => void;

function Card({ it, onOpen, entry, onSave }: { it: LibItem; onOpen: (it: LibItem) => void; entry?: HistoryEntry; onSave?: SaveFn }) {
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
    <div className="pl-card-wrap">
      <button type="button" className="pl-card" onClick={() => onOpen(it)} disabled={!playable}>
        <span className="pl-thumb">
          <img src={it.image} alt="" loading="lazy" />
          <KindBadge kind={it.kind} />
          <span className="pl-play"><MotionPlay size={40} /></span>
          {p > 0.02 && <span className="pl-progress"><span style={{ width: `${Math.min(100, p * 100)}%` }} /></span>}
        </span>
        <span className="pl-title">{it.title}</span>
        <span className="pl-sub">
          {entry ? (p > 0.92 ? `Watched · ${ago(entry.at)}` : p > 0.02 ? `${Math.round(p * 100)}% · ${ago(entry.at)}` : it.series ?? '') : it.series ?? ''}
        </span>
      </button>
      {onSave && <button type="button" className="pl-save" onClick={() => onSave(it)} aria-label={`Save ${it.title} to a playlist`}><IconPlus size={16} /></button>}
    </div>
  );
}

function Row({ title, items, onOpen, history, action, onSave }: { title: string; items: LibItem[]; onOpen: (it: LibItem) => void; history: History; action?: React.ReactNode; onSave?: SaveFn }) {
  if (!items.length) return null;
  return (
    <section className="pl-section">
      <div className="pl-section-head"><h2>{title}</h2>{action}</div>
      <div className="pl-rail">
        {items.map((it) => <Card key={it.id} it={it} onOpen={onOpen} entry={history[it.id]} onSave={onSave} />)}
      </div>
    </section>
  );
}

function SaveSheet({ item, playlists, onToggle, onCreate, onClose }: { item: LibItem; playlists: Playlist[]; onToggle: (pl: string) => void; onCreate: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  return (
    <div className="pl-sheet-back" onClick={onClose}>
      <div className="pl-sheet" role="dialog" aria-label="Save to playlist" onClick={(e) => e.stopPropagation()}>
        <div className="pl-sheet-head"><strong>Save to playlist</strong><button type="button" className="pl-icon-btn" onClick={onClose} aria-label="Close"><IconClose /></button></div>
        <p className="pl-sub">{item.title}</p>
        {playlists.map((pl) => {
          const on = pl.ids.includes(item.id);
          return (
            <button type="button" key={pl.id} className={`pl-sheet-row${on ? ' on' : ''}`} onClick={() => onToggle(pl.id)}>
              <span className="pl-sheet-check">{on && <IconCheck size={14} />}</span>{pl.name}<span className="pl-sub">{pl.ids.length}</span>
            </button>
          );
        })}
        <form className="pl-sheet-new" onSubmit={(e) => { e.preventDefault(); if (name.trim()) { onCreate(name.trim()); setName(''); } }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New playlist name" maxLength={40} aria-label="New playlist name" />
          <button type="submit" className="pl-text-btn pl-text-btn--dark">Create</button>
        </form>
      </div>
    </div>
  );
}

function sortItems(list: LibItem[], sort: Sort, best: LibItem[]) {
  const by = [...list];
  if (sort === 'new') return by.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  if (sort === 'old') return by.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  if (sort === 'popular') return by.sort((a, b) => b.views - a.views);
  if (sort === 'az') return by.sort((a, b) => a.title.localeCompare(b.title));
  const rank = new Map(best.map((x, i) => [x.id, i]));
  return by.sort((a, b) => (rank.get(a.id) ?? 9999) - (rank.get(b.id) ?? 9999) || b.score - a.score);
}

export default function PudlibApp({ items, videosConnected, initialPlay }: { items: LibItem[]; videosConnected: boolean; initialPlay?: string }) {
  const [tab, setTab] = useState<Tab>('all');
  const [q, setQ] = useState('');
  const [topic, setTopic] = useState<string>('');
  const [sort, setSort] = useState<Sort>('best');
  const [history, setHistory] = useState<History>({});
  const [video, setVideo] = useState<LibItem | null>(null);
  const [mini, setMini] = useState(false);
  const [audio, setAudio] = useState<LibItem | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [saving, setSaving] = useState<LibItem | null>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const [coplay, setCoplay] = useState<CoPlay>({});
  const histRef = useRef<History>({});
  const lastSave = useRef(0);
  const tabsRef = useSlidingPill<HTMLDivElement>(tab);

  useEffect(() => { histRef.current = loadHistory(); setHistory(histRef.current); setPlaylists(loadPlaylists()); }, []);

  const model = useMemo(() => buildModel(items), [items]);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  // Collaborative signal for what this visitor played most recently.
  const recentKey = Object.entries(history).sort((a, b) => b[1].at - a[1].at).slice(0, 6).map(([id]) => id).filter((id) => !id.startsWith('bk-')).join(',');
  useEffect(() => {
    if (!recentKey) return;
    fetch(`/api/pudlib/coplay?ids=${encodeURIComponent(recentKey)}`).then((r) => r.json()).then((d) => setCoplay(d.coplay || {})).catch(() => {});
  }, [recentKey]);

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
    const recent = Object.entries(histRef.current).sort((a, b) => b[1].at - a[1].at).slice(0, 5).map(([id]) => id);
    fetch('/api/pudlib/coplay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: it.id, recent }) }).catch(() => {});
    if (!histRef.current[it.id]) {
      histRef.current = { ...histRef.current, [it.id]: { at: Date.now(), progress: 0.001, t: 0 } };
      saveHistory(histRef.current);
      setHistory(histRef.current);
    }
  }, []);

  const playList = useCallback((ids: string[]) => {
    const list = ids.map((id) => byId.get(id)).filter((x): x is LibItem => Boolean(x && x.kind !== 'book'));
    if (!list.length) return;
    setQueue(list.slice(1).map((x) => x.id));
    open(list[0]);
  }, [byId, open]);

  useEffect(() => {
    if (!initialPlay) return;
    const it = items.find((i) => i.id === initialPlay);
    if (it) open(it);
  }, [initialPlay, items, open]);

  const forYou = useMemo(() => recommend(items, model, history, coplay, 30), [items, model, history, coplay]);
  const byKind = (k: LibKind) => items.filter((i) => i.kind === k);
  const recentlyPlayed = useMemo(
    () => Object.entries(history).sort((a, b) => b[1].at - a[1].at).map(([id]) => byId.get(id)).filter((i): i is LibItem => Boolean(i && i.kind !== 'book')),
    [history, byId]
  );
  const continueItems = recentlyPlayed.filter((i) => { const p = history[i.id]?.progress ?? 0; return p > 0.02 && p < 0.92; });
  const latest = [...items].filter((i) => i.kind !== 'book').sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 14);
  const popular = [...items].filter((i) => i.kind !== 'book' && i.views > 0).sort((a, b) => b.views - a.views).slice(0, 14);
  const topicCounts = useMemo(() => {
    const c = new Map<string, number>();
    items.forEach((it) => (model.topics.get(it.id) ?? []).forEach((t) => c.set(t, (c.get(t) ?? 0) + 1)));
    return TOPICS.map((t) => t.name).filter((n) => (c.get(n) ?? 0) > 0).map((n) => ({ name: n, n: c.get(n)! }));
  }, [items, model]);
  const topTopics = topicCounts.slice().sort((a, b) => b.n - a.n).slice(0, 3);

  // Auto playlists: every series with two or more parts, in order.
  const seriesLists = useMemo(() => {
    const m = new Map<string, LibItem[]>();
    items.forEach((it) => { if (it.series && it.kind !== 'book') m.set(it.series, [...(m.get(it.series) ?? []), it]); });
    return Array.from(m.entries()).filter(([, l]) => l.length > 1).map(([name, l]) => ({ name, items: l.sort((a, b) => (a.date || '').localeCompare(b.date || '')) }));
  }, [items]);

  const upNext = useMemo(() => {
    if (!video) return [];
    const queued = queue.map((id) => byId.get(id)).filter((x): x is LibItem => Boolean(x && x.id !== video.id));
    const sim = similar(video, items, model, coplay, 12).filter((x) => !queued.includes(x) && (history[x.id]?.progress ?? 0) < 0.92);
    return [...queued, ...sim].slice(0, 12);
  }, [video, queue, byId, items, model, coplay, history]);

  function playFromPlayer(it: LibItem) {
    setQueue((qq) => qq.filter((id) => id !== it.id));
    open(it);
  }

  function updatePlaylists(next: Playlist[]) { setPlaylists(next); savePlaylists(next); }
  function togglePl(plId: string, it: LibItem) {
    updatePlaylists(playlists.map((pl) => pl.id !== plId ? pl : { ...pl, ids: pl.ids.includes(it.id) ? pl.ids.filter((x) => x !== it.id) : [...pl.ids, it.id] }));
  }
  function createPl(name: string, it: LibItem) {
    updatePlaylists([...playlists, { id: `pl-${Date.now().toString(36)}`, name, ids: [it.id] }]);
  }
  function deletePl(plId: string) {
    if (plId === 'later') updatePlaylists(playlists.map((p) => (p.id === 'later' ? { ...p, ids: [] } : p)));
    else updatePlaylists(playlists.filter((p) => p.id !== plId));
  }

  function clearHistory() {
    histRef.current = {};
    saveHistory({});
    setHistory({});
  }

  const query = q.trim().toLowerCase();
  const results = query
    ? sortItems(items.filter((i) => (tab === 'all' || tab === 'history' || tab === 'playlists' || i.kind === tab) && `${i.title} ${i.series ?? ''} ${i.description ?? ''} ${(model.topics.get(i.id) ?? []).join(' ')}`.toLowerCase().includes(query)), sort, forYou)
    : null;
  const resumeAt = (it: LibItem | null) => {
    if (!it) return 0;
    const h = history[it.id];
    return h && h.progress > 0.02 && h.progress < 0.92 ? h.t ?? 0 : 0;
  };
  const save: SaveFn = (it) => setSaving(it);

  const browse = (kind: LibKind) => {
    const list = byKind(kind).filter((i) => !topic || (model.topics.get(i.id) ?? []).includes(topic));
    return sortItems(list, sort, forYou);
  };

  const filters = (
    <div className="pl-filters">
      <div className="pl-chips" role="group" aria-label="Topic">
        <button type="button" className={!topic ? 'on' : ''} onClick={() => setTopic('')}>All topics</button>
        {topicCounts.map((t) => (
          <button type="button" key={t.name} className={topic === t.name ? 'on' : ''} onClick={() => setTopic(topic === t.name ? '' : t.name)}>{t.name} <span>{t.n}</span></button>
        ))}
      </div>
      <label className="pl-sort">
        <span>Sort</span>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          {SORTS.map((s2) => <option key={s2.key} value={s2.key}>{s2.label}</option>)}
        </select>
      </label>
    </div>
  );

  return (
    <div className={`pl-app${audio || (video && mini) ? ' has-dock' : ''}`}>
      <header className="pl-hero">
        <PudlibLogo size={56} />
        <p>Pastor Uzor Digital Library. Messages, audio and books, in one place.</p>
        <div className="pl-search">
          <input type="search" placeholder="Search messages, series, topics, books" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search the library" />
        </div>
        <div className="pl-tabs seg" role="tablist" ref={tabsRef}>
          <span className="seg-pill" aria-hidden="true" />
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'on' : ''} onClick={() => setTab(t.key)}>
              {t.key === 'history' && <IconHistory size={15} />}{t.key === 'playlists' && <IconPlaylist size={15} />}{t.label}
            </button>
          ))}
        </div>
      </header>

      {!videosConnected && <p className="pl-note">Videos appear here automatically once the church&rsquo;s YouTube channel is connected.</p>}

      {results ? (
        <section className="pl-section">
          <div className="pl-section-head"><h2>{results.length} result{results.length === 1 ? '' : 's'}</h2></div>
          <div className="pl-grid">{results.map((it) => <Card key={it.id} it={it} onOpen={open} entry={history[it.id]} onSave={save} />)}</div>
        </section>
      ) : tab === 'all' ? (
        <>
          <Row title="Continue" items={continueItems} onOpen={open} history={history} onSave={save} />
          <Row title={recentlyPlayed.length ? 'Recommended for you' : 'Start here'} items={forYou.slice(0, 14)} onOpen={open} history={history} onSave={save} />
          <Row title="Recently played" items={recentlyPlayed.slice(0, 14)} onOpen={open} history={history} onSave={save}
            action={<button type="button" className="pl-link-btn" onClick={() => setTab('history')}>See all</button>} />
          {topTopics.map((t) => (
            <Row key={t.name} title={t.name} items={sortItems(items.filter((i) => i.kind !== 'book' && (model.topics.get(i.id) ?? []).includes(t.name)), 'best', forYou).slice(0, 14)} onOpen={open} history={history} onSave={save}
              action={<button type="button" className="pl-link-btn" onClick={() => { setTopic(t.name); setTab('video'); }}>See all</button>} />
          ))}
          <Row title="Latest" items={latest} onOpen={open} history={history} onSave={save} />
          <Row title="Most played" items={popular} onOpen={open} history={history} onSave={save} />
          <Row title="Audio messages" items={byKind('audio').slice(0, 14)} onOpen={open} history={history} onSave={save} />
          <Row title="Books" items={byKind('book')} onOpen={open} history={history} />
        </>
      ) : tab === 'playlists' ? (
        <section className="pl-section">
          <div className="pl-section-head"><h2>Your playlists</h2></div>
          <div className="pl-lists">
            {playlists.map((pl) => {
              const first = byId.get(pl.ids[0] ?? '');
              return (
                <div className="pl-list" key={pl.id}>
                  <span className="pl-list-art">{first ? <img src={first.image} alt="" /> : <IconPlaylist size={28} />}</span>
                  <div className="pl-list-body">
                    <strong>{pl.name}</strong>
                    <span className="pl-sub">{pl.ids.length} item{pl.ids.length === 1 ? '' : 's'}</span>
                    <div className="pl-list-actions">
                      <button type="button" className="pl-text-btn pl-text-btn--dark" disabled={!pl.ids.length} onClick={() => playList(pl.ids)}>Play all</button>
                      <button type="button" className="pl-link-btn" onClick={() => deletePl(pl.id)}>{pl.id === 'later' ? 'Clear' : 'Delete'}</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {playlists.every((p) => !p.ids.length) && <p className="pl-note">Tap the + on any message to save it to Watch later or a playlist of your own.</p>}
          {seriesLists.length > 0 && (
            <>
              <div className="pl-section-head" style={{ marginTop: 26 }}><h2>Series</h2></div>
              <div className="pl-lists">
                {seriesLists.map((sl) => (
                  <div className="pl-list" key={sl.name}>
                    <span className="pl-list-art"><img src={sl.items[0].image} alt="" /></span>
                    <div className="pl-list-body">
                      <strong>{sl.name}</strong>
                      <span className="pl-sub">{sl.items.length} parts</span>
                      <div className="pl-list-actions">
                        <button type="button" className="pl-text-btn pl-text-btn--dark" onClick={() => playList(sl.items.map((x) => x.id))}>Play from part 1</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {playlists.filter((pl) => pl.ids.length).map((pl) => (
            <Row key={pl.id} title={pl.name} items={pl.ids.map((id) => byId.get(id)).filter((x): x is LibItem => Boolean(x))} onOpen={open} history={history} onSave={save} />
          ))}
        </section>
      ) : tab === 'history' ? (
        <section className="pl-section">
          <div className="pl-section-head">
            <h2>Your history</h2>
            {recentlyPlayed.length > 0 && <button type="button" className="pl-link-btn" onClick={clearHistory}>Clear history</button>}
          </div>
          {recentlyPlayed.length ? (
            <div className="pl-grid">{recentlyPlayed.map((it) => <Card key={it.id} it={it} onOpen={open} entry={history[it.id]} onSave={save} />)}</div>
          ) : (
            <p className="pl-note">Nothing played yet. Messages you watch or listen to appear here, with where you stopped.</p>
          )}
        </section>
      ) : (
        <section className="pl-section">
          {tab !== 'book' && filters}
          <div className="pl-grid">{(tab === 'book' ? byKind('book') : browse(tab)).map((it) => <Card key={it.id} it={it} onOpen={open} entry={history[it.id]} onSave={tab === 'book' ? undefined : save} />)}</div>
          {(tab === 'book' ? byKind('book') : browse(tab)).length === 0 && <p className="pl-note">Nothing here{topic ? ` under ${topic}` : ''} yet.</p>}
        </section>
      )}

      {saving && (
        <SaveSheet item={saving} playlists={playlists} onClose={() => setSaving(null)}
          onToggle={(id) => togglePl(id, saving)} onCreate={(name) => createPl(name, saving)} />
      )}

      {video && (
        <VideoPlayer
          item={video} upNext={upNext} resumeAt={resumeAt(video)} mini={mini} setMini={setMini}
          onClose={() => { setVideo(null); setMini(false); setQueue([]); saveHistory(histRef.current); setHistory(histRef.current); }}
          onPlay={playFromPlayer} onProgress={onProgress}
        />
      )}
      {audio && (
        <AudioBar
          item={audio} resumeAt={resumeAt(audio)} onClose={() => { setAudio(null); setQueue([]); saveHistory(histRef.current); setHistory(histRef.current); }} onProgress={onProgress}
          onEnded={() => {
            const nextId = queue[0];
            const next = (nextId && byId.get(nextId)) || similar(audio, items, model, coplay, 6).find((a) => (history[a.id]?.progress ?? 0) < 0.92);
            if (next) { setQueue((qq) => qq.slice(1)); open(next); }
          }}
        />
      )}
    </div>
  );
}
