import { SiteHeader, SiteFooter } from '@/components/SiteChrome';
import { isLiveNow } from '@/lib/analytics';
import { CHANNEL_URL, getChannelId, getLatestVideos } from '@/lib/youtube';

export const metadata = {
  title: 'Watch Live | TCH Global',
  description: "Watch TCH Global services live — Sundays 7:30 & 9:15 AM, Monday prayer and Wednesday midweek at 5:30 PM (WAT).",
};

// Live status changes during the day; re-check every minute.
export const revalidate = 60;

const SCHEDULE = [
  ['First Service', 'Sunday', '7:30 AM'],
  ['Second Service', 'Sunday', '9:15 AM'],
  ['Prayer Meeting', 'Monday', '5:30 PM'],
  ['Midweek Service', 'Wednesday', '5:30 PM'],
];

export default async function LivePage() {
  const channelId = (await getChannelId()) || '';
  const facebookUrl = process.env.NEXT_PUBLIC_FACEBOOK_URL || 'https://www.facebook.com/profile.php?id=61557996937416';
  const [live, videos] = await Promise.all([isLiveNow(), getLatestVideos(1).catch(() => null)]);
  const latest = videos?.[0] ?? null;
  // YouTube's live_stream embed shows "video unavailable" when nothing is
  // live, so off-air we play the newest upload instead.
  const embedSrc = live
    ? `https://www.youtube-nocookie.com/embed/live_stream?channel=${encodeURIComponent(channelId)}&rel=0`
    : latest
      ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(latest.id)}?rel=0&modestbranding=1`
      : `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(channelId.replace(/^UC/, 'UU'))}&rel=0`;

  return (
    <>
      <SiteHeader />
      <main className="section live-page">
        <div className="container">
          <div className="section-header">
            <span className="eyebrow">Media &amp; Streaming</span>
            <h2>Watch <span className="accent">Live</span></h2>
            <p>Join the service from anywhere in the world. When we&rsquo;re not live, you can watch and follow messages or use the <a href="/library">PUDLIB!</a></p>
          </div>

          <div className={`live-status${live ? ' live-status--on' : ''}`} role="status">
            <span className="live-dot" aria-hidden="true" />
            {live ? 'We are live now' : <>Not live right now. Playing our latest message{latest ? <>: <strong>{latest.title}</strong></> : ''}</>}
          </div>

          <div className="live-player" data-broadcast={live ? 'LIVE · TCH GLOBAL' : 'REPLAY · LATEST MESSAGE'}>
            {channelId ? (
              <iframe
                src={embedSrc}
                title="TCH Global live stream"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
              />
            ) : (
              <div className="live-placeholder">
                <strong>The live player switches on once the church&rsquo;s YouTube channel is connected.</strong>
                <span>Until then, watch on YouTube directly.</span>
              </div>
            )}
          </div>

          <div className="stream-row live-actions">
            <a className="btn btn-primary btn-youtube" href={`${CHANNEL_URL}/live`} target="_blank" rel="noopener">Open on YouTube</a>
            <a className="btn btn-ghost btn-facebook" href={facebookUrl} target="_blank" rel="noopener">Also live on Facebook</a>
          </div>

          <div className="live-schedule">
            {SCHEDULE.map(([name, day, time]) => (
              <div className="gather-row" key={name}>
                <div><div className="gather-name">{name}</div><div className="gather-place">{day}</div></div>
                <span className="gather-time">{time} WAT</span>
              </div>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
