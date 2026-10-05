import { SiteHeader, SiteFooter } from '@/components/SiteChrome';
import { isLiveNow } from '@/lib/analytics';
import { CHANNEL_ID } from '@/lib/youtube';

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
  const channelId = CHANNEL_ID;
  const facebookUrl = process.env.NEXT_PUBLIC_FACEBOOK_URL || 'https://www.facebook.com/profile.php?id=61557996937416';
  const live = await isLiveNow();

  return (
    <>
      <SiteHeader />
      <main className="section live-page">
        <div className="container">
          <div className="section-header">
            <span className="eyebrow">Media &amp; Streaming</span>
            <h2>Watch <span className="accent">Live</span></h2>
            <p>Join the service from anywhere in the world. When we&rsquo;re not live, the player shows our latest message.</p>
          </div>

          <div className={`live-status${live ? ' live-status--on' : ''}`} role="status">
            <span className="live-dot" aria-hidden="true" />
            {live ? 'We are live now' : 'Not live right now — the next service is listed below'}
          </div>

          <div className="live-player" data-broadcast={live ? 'LIVE · TCH GLOBAL' : 'REPLAY · LATEST MESSAGE'}>
            {channelId ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/live_stream?channel=${encodeURIComponent(channelId)}&rel=0`}
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
            <a className="btn btn-primary btn-youtube" href={channelId ? `https://www.youtube.com/channel/${channelId}/live` : 'https://www.youtube.com'} target="_blank" rel="noopener">Open on YouTube</a>
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
