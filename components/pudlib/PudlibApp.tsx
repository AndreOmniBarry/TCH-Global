'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LibItem, LibKind } from '@/lib/library';
import { buildModel, recommend, similar, TOPICS, type CoPlay } from '@/lib/recommend';
import PudlibLogo from './PudlibLogo';
import MotionPlay from '@/components/MotionPlay';
import { useSlidingPill } from '@/components/useSlidingPill';
import { useMember } from '@/components/members/useMember';
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

function VideoPlayer({ item, upNext, resumeAt, mini, setMini, onClose, onPlay, onProgress, playingFrom, saved, onSave, onRemoveNext }: {
  item: LibItem; upNext: LibItem[]; resumeAt: number; mini: boolean; setMini: (v: boolean) => void;
  onClose: () => void; onPlay: (it: LibItem) => void; onProgress: (id: string, p: number, t: number) => void;
  playingFrom?: string | null; saved: boolean; onSave: (it: LibItem) => void; onRemoveNext?: (id: string) => void;
}) {
  // Heads-up display: brief centre feedback for taps and keys.
  const [hud, setHud] = useState<{ k: number; text: string; side?: 'l' | 'r' } | null>(null);
  const flash = (text: string, side?: 'l' | 'r') => setHud({ k: Date.now(), text, side });
  useEffect(() => { if (!hud) return; const t = window.setTimeout(() => setHud(null), 700); return () => window.clearTimeout(t); }, [hud]);
  // Enter / exit motion.
  const [phase, setPhase] = useState<'in' | 'shown' | 'out'>('in');
  useEffect(() => { const t = requestAnimationFrame(() => setPhase('shown')); return () => cancelAnimationFrame(t); }, []);
  const closeAnimated = () => { setPhase('out'); window.setTimeout(onClose, 260); };
  // Swipe down (phones) to drop into the mini player.
  const drag = useRef<{ y: number; x: number; dy: number; active: boolean } | null>(null);
  const [dragY, setDragY] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const autoplayRef = useRef(true);
  const [shared, setShared] = useState(false);
  useEffect(() => { try { const v = localStorage.getItem('pudlib_autoplay'); if (v === '0') { setAutoplay(false); autoplayRef.current = false; } } catch {} }, []);
  function toggleAutoplay() {
    const v = !autoplayRef.current;
    autoplayRef.current = v; setAutoplay(v);
    try { localStorage.setItem('pudlib_autoplay', v ? '1' : '0'); } catch {}
  }
  async function share() {
    const url = `${location.origin}/library?play=${encodeURIComponent(item.id)}`;
    try {
      if (navigator.share) await navigator.share({ title: item.title, url });
      else { await navigator.clipboard.writeText(url); setShared(true); setTimeout(() => setShared(false), 1800); }
    } catch {}
  }
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
              if (upNext[0] && autoplayRef.current) onPlay(upNext[0]);
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
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); toggle(); flash(playing ? 'Paused' : 'Playing'); }
      if (e.key === 'ArrowRight') { seekBy(10); flash('+10s', 'r'); }
      if (e.key === 'ArrowLeft') { seekBy(-10); flash('−10s', 'l'); }
      if (e.key === 'ArrowUp') { e.preventDefault(); const v = Math.min(100, volume + 10); changeVolume(v); flash(`Volume ${v}%`); }
      if (e.key === 'ArrowDown') { e.preventDefault(); const v = Math.max(0, volume - 10); changeVolume(v); flash(`Volume ${v}%`); }
      if (e.key === 'm') { toggleMute(); flash(muted ? 'Sound on' : 'Muted'); }
      if (e.key === 'n' && upNext[0]) onPlay(upNext[0]);
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
  function changeSpeed(s: number) { playerRef.current?.setPlaybackRate?.(s); setSpeed(s); setSpeedOpen(false); flash(s === 1 ? 'Normal speed' : `${s}× speed`); }

  // Lock-screen / Control Centre controls and artwork.
  useEffect(() => {
    const ms = (navigator as any).mediaSession;
    if (!ms || typeof (window as any).MediaMetadata === 'undefined') return;
    ms.metadata = new (window as any).MediaMetadata({ title: item.title, artist: 'Pastor Uzor Echiejile', album: item.series || 'PUDLIB!', artwork: [{ src: item.image, sizes: '480x360', type: 'image/jpeg' }] });
    const set = (a: string, h: (() => void) | null) => { try { ms.setActionHandler(a, h); } catch {} };
    set('play', () => playerRef.current?.playVideo?.());
    set('pause', () => playerRef.current?.pauseVideo?.());
    set('seekbackward', () => seekBy(-10));
    set('seekforward', () => seekBy(10));
    set('nexttrack', upNext[0] ? () => onPlay(upNext[0]) : null);
    return () => { ['play', 'pause', 'seekbackward', 'seekforward', 'nexttrack'].forEach((a) => set(a, null)); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, upNext[0]?.id]);
  useEffect(() => { const ms = (navigator as any).mediaSession; if (ms) ms.playbackState = playing ? 'playing' : 'paused'; }, [playing]);

  // Taps on the picture: mouse click toggles; touch single-tap toggles,
  // double-tap on the left/right third skips 10s (YouTube style).
  const lastTap = useRef<{ t: number; x: number } | null>(null);
  const tapTimer = useRef(0);
  function onShieldPointer(e: React.PointerEvent<HTMLButtonElement>) {
    if (mini) { setMini(false); return; }
    if (e.pointerType === 'mouse') { toggle(); return; }
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const now = Date.now();
    if (lastTap.current && now - lastTap.current.t < 300) {
      window.clearTimeout(tapTimer.current);
      lastTap.current = null;
      if (x < 0.38) { seekBy(-10); flash('−10s', 'l'); }
      else if (x > 0.62) { seekBy(10); flash('+10s', 'r'); }
      else { toggle(); }
      return;
    }
    lastTap.current = { t: now, x };
    tapTimer.current = window.setTimeout(() => { lastTap.current = null; toggle(); }, 280);
  }
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
      <button type="button" className="pl-shield" aria-label={playing ? 'Pause' : 'Play'} onPointerUp={onShieldPointer} onDoubleClick={(e) => { if (!mini) { e.preventDefault(); fs ? exitFs() : enterFs('landscape'); } }} />
      {hud && <span key={hud.k} className={`pl-hud${hud.side ? ` pl-hud--${hud.side}` : ''}`} aria-live="polite">{hud.text}</span>}
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
              <div className="pl-volume pl-hide-sm">
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
              <button type="button" className="pl-icon-btn pl-hide-sm" onClick={() => setMini(true)} aria-label="Minimise player"><IconMinimize /></button>
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

  if (mini) {
    return (
      <div
        className="pl-mini" role="region" aria-label={`Now playing: ${item.title}`}
        style={dragX ? { transform: `translateX(${dragX}px)`, opacity: Math.max(0.2, 1 - Math.abs(dragX) / 260), transition: 'none' } : undefined}
        onPointerDown={(e) => { if (e.pointerType !== 'mouse') drag.current = { x: e.clientX, y: e.clientY, dy: 0, active: true }; }}
        onPointerMove={(e) => { const d = drag.current; if (d?.active) setDragX(e.clientX - d.x); }}
        onPointerUp={() => { if (Math.abs(dragX) > 120) onClose(); setDragX(0); drag.current = null; }}
        onPointerCancel={() => { setDragX(0); drag.current = null; }}
      >{frame}</div>
    );
  }

  const dateLabel = item.date ? new Date(item.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  return (
    <div
      className={`pl-modal pl-modal--${phase}`} role="dialog" aria-modal="true" aria-label={item.title}
      style={dragY ? { transform: `translateY(${dragY}px) scale(${1 - Math.min(dragY, 400) / 2400})`, borderRadius: Math.min(28, dragY / 6), transition: 'none' } : undefined}
      onPointerDown={(e) => {
        const t = e.target as HTMLElement;
        if (e.pointerType === 'mouse' || (e.currentTarget as HTMLElement).scrollTop > 0 || t.closest('.pl-controls, .pl-queue, button, input, a')) return;
        drag.current = { x: e.clientX, y: e.clientY, dy: 0, active: true };
      }}
      onPointerMove={(e) => { const d = drag.current; if (d?.active) { const dy = e.clientY - d.y; if (dy > 0) setDragY(dy); } }}
      onPointerUp={() => { if (dragY > 130) setMini(true); setDragY(0); drag.current = null; }}
      onPointerCancel={() => { setDragY(0); drag.current = null; }}
    >
      <span className="pl-grabber" aria-hidden="true" />
      <div className="pl-ambient" aria-hidden="true" style={{ backgroundImage: `url(${item.image})` }} />
      <div className="pl-modal-top">
        <PudlibLogo size={24} />
        <span className="pl-now">Now playing</span>
        <div className="pl-modal-actions">
          <button type="button" className="pl-round" onClick={() => setMini(true)} aria-label="Minimise player"><IconMinimize size={20} /></button>
          <button type="button" className="pl-round" onClick={closeAnimated} aria-label="Close player"><IconClose size={20} /></button>
        </div>
      </div>
      <div className="pl-theatre">
        <div className="pl-theatre-main">
          {frame}
          <div className="pl-meta">
            {item.series && <span className="pl-meta-series">{item.series}</span>}
            <h2>{item.title}</h2>
            <p className="pl-meta-line">{['Pastor Uzor Echiejile', dateLabel, item.views > 0 ? `${item.views.toLocaleString()} plays` : ''].filter(Boolean).join('  ·  ')}</p>
            <div className="pl-actions">
              <button type="button" className={`pl-action${saved ? ' on' : ''}`} onClick={() => onSave(item)}>{saved ? <IconCheck size={18} /> : <IconPlus size={18} />}{saved ? 'Saved' : 'Save'}</button>
              <button type="button" className="pl-action" onClick={share}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></svg>{shared ? 'Link copied' : 'Share'}</button>
              <button type="button" className="pl-action" onClick={() => setMini(true)}><IconMinimize size={18} />Mini player</button>
            </div>
            {item.description && <p className="pl-desc">{item.description}</p>}
          </div>
        </div>
        {upNext.length > 0 && (
          <aside className="pl-queue" aria-label="Up next">
            {playingFrom && <div className="pl-from"><IconPlaylist size={16} /><span>Playing from <strong>{playingFrom}</strong></span></div>}
            <div className="pl-queue-head">
              <h3>Up next</h3>
              <label className="pl-switch">
                <span>Autoplay</span>
                <input type="checkbox" checked={autoplay} onChange={toggleAutoplay} />
                <i aria-hidden="true" />
              </label>
            </div>
            <ol className="pl-queue-list">
              <li className="pl-queue-item is-current" aria-current="true">
                <span className="pl-queue-idx"><span className="pl-eq" aria-hidden="true"><i /><i /><i /></span></span>
                <span className="pl-queue-thumb"><img src={item.image} alt="" /></span>
                <span className="pl-queue-text"><span className="pl-title">{item.title}</span><span className="pl-sub">Playing now</span></span>
              </li>
              {upNext.slice(0, 12).map((n, i) => (
                <li key={n.id} className="pl-queue-li">
                  {onRemoveNext && <button type="button" className="pl-queue-x" onClick={() => onRemoveNext(n.id)} aria-label={`Remove ${n.title} from up next`}><IconClose size={14} /></button>}
                  <button type="button" className="pl-queue-item" onClick={() => onPlay(n)}>
                    <span className="pl-queue-idx">{i + 1}</span>
                    <span className="pl-queue-thumb"><img src={n.image} alt="" loading="lazy" />{i === 0 && autoplay && <em>Next</em>}<span className="pl-queue-hover"><MotionPlay size={30} /></span></span>
                    <span className="pl-queue-text"><span className="pl-title">{n.title}</span>{n.series && <span className="pl-sub">{n.series}</span>}</span>
                  </button>
                </li>
              ))}
            </ol>
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
  // Lock-screen controls for listening with the phone locked.
  useEffect(() => {
    const ms = (navigator as any).mediaSession;
    if (!ms || typeof (window as any).MediaMetadata === 'undefined') return;
    ms.metadata = new (window as any).MediaMetadata({ title: item.title, artist: 'Pastor Uzor Echiejile', album: item.series || 'PUDLIB!', artwork: [{ src: item.image, sizes: '512x512' }] });
    const a = () => ref.current;
    const set = (k: string, h: ((d?: any) => void) | null) => { try { ms.setActionHandler(k, h); } catch {} };
    set('play', () => a()?.play());
    set('pause', () => a()?.pause());
    set('seekbackward', () => { const el = a(); if (el) el.currentTime = Math.max(0, el.currentTime - 10); });
    set('seekforward', () => { const el = a(); if (el) el.currentTime = el.currentTime + 10; });
    set('seekto', (d: any) => { const el = a(); if (el && typeof d?.seekTime === 'number') el.currentTime = d.seekTime; });
    set('nexttrack', () => onEnded());
    return () => ['play', 'pause', 'seekbackward', 'seekforward', 'seekto', 'nexttrack'].forEach((k) => set(k, null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);
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
  const railRef = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const onScroll = () => {
    const r = railRef.current;
    if (!r) return;
    setEdge({ start: r.scrollLeft < 8, end: r.scrollLeft + r.clientWidth > r.scrollWidth - 8 });
  };
  useEffect(onScroll, [items.length]);
  const page = (d: number) => railRef.current?.scrollBy({ left: d * railRef.current.clientWidth * 0.85, behavior: 'smooth' });
  if (!items.length) return null;
  return (
    <section className="pl-section">
      <div className="pl-section-head">
        <h2>{title}</h2>
        <div className="pl-section-tools">
          {action}
          <button type="button" className="pl-arrow" onClick={() => page(-1)} disabled={edge.start} aria-label={`Scroll ${title} left`}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg></button>
          <button type="button" className="pl-arrow" onClick={() => page(1)} disabled={edge.end} aria-label={`Scroll ${title} right`}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg></button>
        </div>
      </div>
      <div className="pl-rail" ref={railRef} onScroll={onScroll}>
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

function Featured({ it, entry, onOpen, onSave, saved }: { it: LibItem; entry?: HistoryEntry; onOpen: (it: LibItem) => void; onSave: SaveFn; saved: boolean }) {
  const p = entry?.progress ?? 0;
  const resume = p > 0.02 && p < 0.92;
  return (
    <section className="pl-featured">
      <div className="pl-featured-bg" style={{ backgroundImage: `url(${it.image})` }} aria-hidden="true" />
      <div className="pl-featured-art"><img src={it.image} alt="" /></div>
      <div className="pl-featured-body">
        <span className="pl-featured-tag">{resume ? 'Continue watching' : 'Featured for you'}</span>
        {it.series && <span className="pl-featured-series">{it.series}</span>}
        <h2>{it.title}</h2>
        {it.description && <p>{it.description.length > 160 ? `${it.description.slice(0, 157)}…` : it.description}</p>}
        {resume && <div className="pl-featured-progress"><span style={{ width: `${p * 100}%` }} /></div>}
        <div className="pl-featured-actions">
          <button type="button" className="pl-play-cta" onClick={() => onOpen(it)}><MotionPlay size={34} />{resume ? 'Resume' : 'Play'}</button>
          <button type="button" className={`pl-action pl-action--glass${saved ? ' on' : ''}`} onClick={() => onSave(it)}>{saved ? <IconCheck size={18} /> : <IconPlus size={18} />}{saved ? 'Saved' : 'Save'}</button>
        </div>
      </div>
    </section>
  );
}

function Cover({ items }: { items: LibItem[] }) {
  const pics = items.slice(0, 4);
  if (!pics.length) return <span className="pl-cover-mosaic is-empty"><IconPlaylist size={30} /></span>;
  if (pics.length < 4) return <span className="pl-cover-mosaic is-one"><img src={pics[0].image} alt="" /></span>;
  return <span className="pl-cover-mosaic">{pics.map((x) => <img key={x.id} src={x.image} alt="" />)}</span>;
}

type OpenList = { key: string; name: string; items: LibItem[]; userId?: string };

function PlaylistDetail({ list, history, onBack, onPlayAll, onPlayAt, onRemove }: { list: OpenList; history: History; onBack: () => void; onPlayAll: (shuffle: boolean) => void; onPlayAt: (i: number) => void; onRemove?: (id: string) => void }) {
  const watched = list.items.filter((x) => (history[x.id]?.progress ?? 0) > 0.92).length;
  return (
    <section className="pl-detail">
      <button type="button" className="pl-back" onClick={onBack}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>Playlists</button>
      <header className="pl-detail-head">
        <div className="pl-detail-bg" style={list.items[0] ? { backgroundImage: `url(${list.items[0].image})` } : undefined} aria-hidden="true" />
        <Cover items={list.items} />
        <div className="pl-detail-info">
          <span className="pl-featured-tag">{list.userId ? 'Your playlist' : 'Series'}</span>
          <h2>{list.name}</h2>
          <p>{list.items.length} message{list.items.length === 1 ? '' : 's'}{watched ? ` · ${watched} watched` : ''}</p>
          <div className="pl-featured-actions">
            <button type="button" className="pl-play-cta" disabled={!list.items.length} onClick={() => onPlayAll(false)}><MotionPlay size={34} />Play all</button>
            <button type="button" className="pl-action pl-action--glass" disabled={list.items.length < 2} onClick={() => onPlayAll(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></svg>Shuffle
            </button>
          </div>
        </div>
      </header>
      {list.items.length === 0 ? (
        <p className="pl-note">This playlist is empty. Tap the + on any message to add it here.</p>
      ) : (
        <ol className="pl-tracks">
          {list.items.map((x, i) => {
            const h = history[x.id];
            const p = h?.progress ?? 0;
            return (
              <li key={x.id} className="pl-track">
                <button type="button" className="pl-track-main" onClick={() => onPlayAt(i)}>
                  <span className="pl-track-idx"><span className="n">{i + 1}</span><span className="pl-track-play"><MotionPlay size={26} /></span></span>
                  <span className="pl-track-thumb"><img src={x.image} alt="" loading="lazy" />{p > 0.02 && <span className="pl-progress"><span style={{ width: `${Math.min(100, p * 100)}%` }} /></span>}</span>
                  <span className="pl-track-text"><span className="pl-title">{x.title}</span><span className="pl-sub">{[x.kind === 'audio' ? 'Audio' : 'Video', x.date && new Date(x.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }), p > 0.92 ? 'Watched' : p > 0.02 ? `${Math.round(p * 100)}% watched` : ''].filter(Boolean).join(' · ')}</span></span>
                </button>
                {onRemove && <button type="button" className="pl-track-remove" onClick={() => onRemove(x.id)} aria-label={`Remove ${x.title}`}><IconClose size={16} /></button>}
              </li>
            );
          })}
        </ol>
      )}
    </section>
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
  const [playingFrom, setPlayingFrom] = useState<string | null>(null);
  const [openList, setOpenList] = useState<string | null>(null);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ k: number; text: string; it?: LibItem } | null>(null);
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(null), 3600); return () => window.clearTimeout(t); }, [toast]);
  const histRef = useRef<History>({});
  const lastSave = useRef(0);
  const tabsRef = useSlidingPill<HTMLDivElement>(tab);
  const { member } = useMember();
  const synced = useRef(false);

  // Members: merge this device's library with their account, then keep
  // the account copy updated, so playlists and progress follow them.
  useEffect(() => {
    if (!member || synced.current) return;
    synced.current = true;
    fetch('/api/me/library', { cache: 'no-store' }).then((r) => r.json()).then((d) => {
      const remote = d.data as { playlists?: Playlist[]; history?: History } | null;
      if (remote) {
        const h: History = { ...(remote.history ?? {}) };
        Object.entries(histRef.current).forEach(([id, e]) => { if (!h[id] || h[id].at < e.at) h[id] = e; });
        const local = loadPlaylists();
        const merged = [...(remote.playlists ?? [])];
        local.forEach((pl) => {
          const m = merged.find((x) => x.id === pl.id);
          if (m) m.ids = Array.from(new Set([...m.ids, ...pl.ids]));
          else merged.push(pl);
        });
        if (!merged.some((x) => x.id === 'later')) merged.unshift({ id: 'later', name: 'Watch later', ids: [] });
        histRef.current = h; saveHistory(h); setHistory(h);
        savePlaylists(merged); setPlaylists(merged);
      }
    }).catch(() => {});
  }, [member]);
  useEffect(() => {
    if (!member || !synced.current) return;
    const t = window.setTimeout(() => {
      fetch('/api/me/library', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playlists, history: histRef.current }) }).catch(() => {});
    }, 2500);
    return () => window.clearTimeout(t);
  }, [member, playlists, history]);
  const chipsRef = useSlidingPill<HTMLDivElement>(`${tab}-${topic}`);

  useEffect(() => { histRef.current = loadHistory(); setHistory(histRef.current); setPlaylists(loadPlaylists()); }, []);

  // Fade images in once decoded (no pop-in): mark loaded images.
  useEffect(() => {
    const mark = (img: HTMLImageElement) => img.classList.add('ld');
    const onLoad = (e: Event) => { const t = e.target as HTMLElement; if (t.tagName === 'IMG') mark(t as HTMLImageElement); };
    document.addEventListener('load', onLoad, true);
    const sweep = () => document.querySelectorAll<HTMLImageElement>('.pl-app img:not(.ld), .pl-modal img:not(.ld)').forEach((i) => { if (i.complete && i.naturalWidth) mark(i); });
    sweep();
    const mo = new MutationObserver(sweep);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { document.removeEventListener('load', onLoad, true); mo.disconnect(); };
  }, []);

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

  const playList = useCallback((ids: string[], from?: string, start = 0, shuffle = false) => {
    let list = ids.map((id) => byId.get(id)).filter((x): x is LibItem => Boolean(x && x.kind !== 'book'));
    if (!list.length) return;
    if (shuffle) list = list.map((x) => [Math.random(), x] as const).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
    else list = [...list.slice(start), ...list.slice(0, start)];
    setQueue(list.slice(1).map((x) => x.id));
    setPlayingFrom(from ?? null);
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
    const sim = similar(video, items, model, coplay, 16).filter((x) => !queued.includes(x) && (history[x.id]?.progress ?? 0) < 0.92);
    return [...queued, ...sim].filter((x) => !skipped.has(x.id)).slice(0, 12);
  }, [video, queue, byId, items, model, coplay, history, skipped]);

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

  const savedIds = useMemo(() => new Set(playlists.flatMap((p) => p.ids)), [playlists]);
  const openListData: OpenList | null = useMemo(() => {
    if (!openList) return null;
    if (openList.startsWith('u:')) {
      const pl = playlists.find((p) => p.id === openList.slice(2));
      return pl ? { key: openList, name: pl.name, userId: pl.id, items: pl.ids.map((id) => byId.get(id)).filter((x): x is LibItem => Boolean(x)) } : null;
    }
    const sl = seriesLists.find((x) => x.name === openList.slice(2));
    return sl ? { key: openList, name: sl.name, items: sl.items } : null;
  }, [openList, playlists, seriesLists, byId]);
  const featured = continueItems[0] ?? forYou[0] ?? null;

  const query = q.trim().toLowerCase();
  const results = query
    ? sortItems(items.filter((i) => (tab === 'all' || tab === 'history' || tab === 'playlists' || i.kind === tab) && `${i.title} ${i.series ?? ''} ${i.description ?? ''} ${(model.topics.get(i.id) ?? []).join(' ')}`.toLowerCase().includes(query)), sort, forYou)
    : null;
  const resumeAt = (it: LibItem | null) => {
    if (!it) return 0;
    const h = history[it.id];
    return h && h.progress > 0.02 && h.progress < 0.92 ? h.t ?? 0 : 0;
  };
  // Spotify-style: first tap saves straight to Watch later with an undo-ish
  // "Change" link; if it's already saved, open the playlist sheet.
  const save: SaveFn = (it) => {
    if (!member) { window.dispatchEvent(new CustomEvent('tch:join', { detail: { reason: 'playlist' } })); return; }
    if (playlists.some((p) => p.ids.includes(it.id))) { setSaving(it); return; }
    const next = playlists.some((p) => p.id === 'later')
      ? playlists.map((p) => (p.id === 'later' ? { ...p, ids: [it.id, ...p.ids] } : p))
      : [{ id: 'later', name: 'Watch later', ids: [it.id] }, ...playlists];
    updatePlaylists(next);
    setToast({ k: Date.now(), text: 'Saved to Watch later', it });
    try { navigator.vibrate?.(12); } catch {}
  };

  const browse = (kind: LibKind) => {
    const list = byKind(kind).filter((i) => !topic || (model.topics.get(i.id) ?? []).includes(topic));
    return sortItems(list, sort, forYou);
  };

  const filters = (
    <div className="pl-filters">
      <div className="pl-chips seg seg--glass" role="tablist" aria-label="Topic" ref={chipsRef}>
        <span className="seg-pill" aria-hidden="true" />
        <button type="button" role="tab" aria-selected={!topic} className={!topic ? 'on' : ''} onClick={() => setTopic('')}>All topics</button>
        {topicCounts.map((t) => (
          <button type="button" role="tab" aria-selected={topic === t.name} key={t.name} className={topic === t.name ? 'on' : ''} onClick={() => setTopic(topic === t.name ? '' : t.name)}>{t.name} <span>{t.n}</span></button>
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
        <div className="pl-tabs seg seg--glass" role="tablist" ref={tabsRef}>
          <span className="seg-pill" aria-hidden="true" />
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'on' : ''} onClick={() => { setTab(t.key); setOpenList(null); }}>
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
          {featured && <Featured it={featured} entry={history[featured.id]} onOpen={open} onSave={save} saved={savedIds.has(featured.id)} />}
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
        openListData ? (
          <PlaylistDetail
            list={openListData} history={history} onBack={() => setOpenList(null)}
            onPlayAll={(shuffle) => playList(openListData.items.map((x) => x.id), openListData.name, 0, shuffle)}
            onPlayAt={(i) => playList(openListData.items.map((x) => x.id), openListData.name, i)}
            onRemove={openListData.userId ? (id) => togglePl(openListData.userId!, byId.get(id)!) : undefined}
          />
        ) : (
          <section className="pl-section">
            {!member && (
              <div className="pl-gate">
                <div><strong>Your playlists live in your account</strong><span>Save messages, build playlists and resume on any device. It&rsquo;s free.</span></div>
                <a className="btn btn-primary btn-sm" href="/account?mode=signup&next=%2Flibrary">Create free account</a>
              </div>
            )}
            <div className="pl-section-head"><h2>Your playlists</h2>
              <button type="button" className="pl-link-btn" onClick={() => { if (!member) { window.dispatchEvent(new CustomEvent('tch:join', { detail: { reason: 'playlist' } })); return; } const name = prompt('Name your playlist'); if (name?.trim()) updatePlaylists([...playlists, { id: `pl-${Date.now().toString(36)}`, name: name.trim().slice(0, 40), ids: [] }]); }}>+ New playlist</button>
            </div>
            <div className="pl-pl-grid">
              {playlists.map((pl) => {
                const its = pl.ids.map((id) => byId.get(id)).filter((x): x is LibItem => Boolean(x));
                return (
                  <div className="pl-pl-card" key={pl.id}>
                    <button type="button" className="pl-pl-open" onClick={() => setOpenList(`u:${pl.id}`)}>
                      <Cover items={its} />
                      <strong>{pl.name}</strong>
                      <span className="pl-sub">{its.length} message{its.length === 1 ? '' : 's'}</span>
                    </button>
                    {its.length > 0 && <button type="button" className="pl-pl-play" onClick={() => playList(pl.ids, pl.name)} aria-label={`Play ${pl.name}`}><MotionPlay size={44} /></button>}
                    {pl.id !== 'later' && <button type="button" className="pl-pl-del" onClick={() => confirm(`Delete "${pl.name}"?`) && deletePl(pl.id)} aria-label={`Delete ${pl.name}`}><IconClose size={14} /></button>}
                  </div>
                );
              })}
            </div>
            {seriesLists.length > 0 && (
              <>
                <div className="pl-section-head" style={{ marginTop: 34 }}><h2>Series</h2></div>
                <div className="pl-pl-grid">
                  {seriesLists.map((sl) => (
                    <div className="pl-pl-card" key={sl.name}>
                      <button type="button" className="pl-pl-open" onClick={() => setOpenList(`s:${sl.name}`)}>
                        <Cover items={sl.items} />
                        <strong>{sl.name}</strong>
                        <span className="pl-sub">{sl.items.length} parts</span>
                      </button>
                      <button type="button" className="pl-pl-play" onClick={() => playList(sl.items.map((x) => x.id), sl.name)} aria-label={`Play ${sl.name}`}><MotionPlay size={44} /></button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )
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

      {toast && (
        <div className="pl-toast" key={toast.k} role="status">
          <span><IconCheck size={16} /> {toast.text}</span>
          {toast.it && <button type="button" onClick={() => { setSaving(toast.it!); setToast(null); }}>Change</button>}
        </div>
      )}
      {saving && (
        <SaveSheet item={saving} playlists={playlists} onClose={() => setSaving(null)}
          onToggle={(id) => togglePl(id, saving)} onCreate={(name) => createPl(name, saving)} />
      )}

      {video && (
        <VideoPlayer
          item={video} upNext={upNext} resumeAt={resumeAt(video)} mini={mini} setMini={setMini}
          onClose={() => { setVideo(null); setMini(false); setQueue([]); setPlayingFrom(null); saveHistory(histRef.current); setHistory(histRef.current); }}
          onPlay={playFromPlayer} onProgress={onProgress}
          playingFrom={queue.length ? playingFrom : null} saved={savedIds.has(video.id)} onSave={save}
          onRemoveNext={(id) => { setQueue((q) => q.filter((x) => x !== id)); setSkipped((s) => new Set(s).add(id)); }}
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
