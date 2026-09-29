import { getLatestVideos } from '@/lib/youtube';
import VideoCard from '@/components/VideoCard';

const placeholderVideos = [
  { id: 'placeholder-1', title: 'Faith That Moves Mountains', url: '#', thumbnail: '/images/pastor-mic.webp' },
  { id: 'placeholder-2', title: 'Living in the Spirit', url: '#', thumbnail: '/images/pastor-mic.webp' },
  { id: 'placeholder-3', title: "The Comforter's House", url: '#', thumbnail: '/images/pastor-mic.webp' },
  { id: 'placeholder-4', title: 'Grace for Today', url: '#', thumbnail: '/images/pastor-mic.webp' },
];

export default async function LibrarySection() {
  const liveVideos = await getLatestVideos(4);
  const videos = liveVideos ?? placeholderVideos;
  const isLive = liveVideos !== null;

  return (
    <section className="section pop-stage" id="library" data-title="Library" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="section-header pop">
          <span className="eyebrow">Library</span>
          <h2>From the Pastor&rsquo;s Desk</h2>
          <p>Books, teaching series, and messages to help you grow — new resources added regularly.</p>
        </div>
        <div className="resource-scroll pop">
          <div className="resource-card">
            <div className="resource-cover"><img src="/images/book-faith-life.webp" alt="Understanding the Faith Life book cover" /></div>
            <div className="resource-body">
              <div className="resource-kind">Book</div>
              <h4>Understanding the Faith Life</h4>
              <a className="resource-cta" href="mailto:info@tchglobal.org?subject=Book%20Order%3A%20Understanding%20the%20Faith%20Life">Get This Book &rarr;</a>
            </div>
          </div>
          <div className="resource-card">
            <div className="resource-cover"><img src="/images/book-daily-inspiration.webp" alt="Daily Inspiration book cover" /></div>
            <div className="resource-body">
              <div className="resource-kind">Book</div>
              <h4>Daily Inspiration</h4>
              <a className="resource-cta" href="mailto:info@tchglobal.org?subject=Book%20Order%3A%20Daily%20Inspiration">Get This Book &rarr;</a>
            </div>
          </div>
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              id={video.id}
              title={video.title}
              thumbnail="/images/pastor-mic.webp"
              url={video.url}
              isLive={isLive}
            />
          ))}
        </div>
        <p style={{ fontSize: '.72rem', color: 'var(--text-faint)', marginTop: 10, fontFamily: 'var(--font-mono)' }}>
          {isLive
            ? 'Live from the YouTube channel — updates automatically.'
            : 'Video links go live once connected to the YouTube channel — see lib/youtube.ts.'}
        </p>
      </div>
    </section>
  );
}
