'use client';

import { useState } from 'react';

type Props = {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  isLive: boolean;
};

export default function VideoCard({ id, title, thumbnail, url, isLive }: Props) {
  const [playing, setPlaying] = useState(false);

  function openPlayer() {
    if (!isLive) return; // placeholder cards keep their plain link behavior
    setPlaying(true);
    // Counted separately from YouTube's own view count — this is our
    // site's own "watched here" analytics, same store as blog reads.
    const payload = JSON.stringify({ slug: `yt:${id}` });
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/track-view', new Blob([payload], { type: 'application/json' }));
    } else {
      fetch('/api/track-view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true });
    }
  }

  return (
    <div className="resource-card">
      <div className="resource-cover">
        <img src={thumbnail} alt={title} />
      </div>
      <div className="resource-body">
        <div className="resource-kind">YouTube</div>
        <h4>{title}</h4>
        {isLive ? (
          <button type="button" className="resource-cta" onClick={openPlayer} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}>
            Watch Now &rarr;
          </button>
        ) : (
          <a className="resource-cta" href={url} target="_blank" rel="noopener">Watch Now &rarr;</a>
        )}
      </div>

      {playing && (
        <div className="video-lightbox" onClick={() => setPlaying(false)}>
          <div className="video-lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="video-lightbox-close" onClick={() => setPlaying(false)} aria-label="Close video">
              &times;
            </button>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}

      <style>{`
        .video-lightbox {
          position: fixed; inset: 0; z-index: 999; background: rgba(0,0,0,.85);
          display: flex; align-items: center; justify-content: center; padding: 24px;
        }
        .video-lightbox-inner {
          position: relative; width: 100%; max-width: 960px; aspect-ratio: 16/9;
          background: #000; border-radius: 12px; overflow: hidden;
        }
        .video-lightbox-inner iframe {
          position: absolute; inset: 0; width: 100%; height: 100%; border: 0;
        }
        .video-lightbox-close {
          position: absolute; top: -40px; right: 0; background: none; border: none;
          color: #fff; font-size: 32px; line-height: 1; cursor: pointer; z-index: 1;
        }
      `}</style>
    </div>
  );
}
