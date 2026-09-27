import { getAllPosts } from '@/lib/sanity';
import { fallbackPosts } from '@/lib/fallback-posts';
import { getLatestVideos } from '@/lib/youtube';
import { getViewCount, getTrendingSlugs, getMostWatchedSlugs, analyticsConfigured } from '@/lib/analytics';
import { SiteHeader, SiteFooter } from '@/components/SiteChrome';

export const metadata = { title: 'Analytics | TCH Global Admin' };
export const dynamic = 'force-dynamic'; // always read fresh counts, never cache this page

async function getPostTitle(slug: string, posts: { slug: string; title: string }[]) {
  return posts.find((p) => p.slug === slug)?.title || slug;
}

export default async function AdminAnalyticsPage() {
  if (!analyticsConfigured) {
    return (
      <>
        <SiteHeader />
        <section className="section">
          <div className="container" style={{ maxWidth: 640 }}>
            <div className="section-header">
              <span className="eyebrow">Admin</span>
              <h2 style={{ textTransform: 'none', fontSize: '1.8rem' }}>Analytics</h2>
              <p>
                Not connected yet — view counts need a Vercel KV store. See <code>analytics/README.md</code> for the
                one-click setup. Once connected, this page will show blog reads and YouTube watches, most-watched
                and trending, with zero further code changes.
              </p>
            </div>
          </div>
        </section>
        <SiteFooter />
      </>
    );
  }

  const livePosts = await getAllPosts();
  const posts = (livePosts ?? fallbackPosts).map((p) => ({ slug: p.slug, title: p.title }));
  const postSlugs = posts.map((p) => p.slug);

  const [trendingSlugs, mostWatchedPostSlugs, videos] = await Promise.all([
    getTrendingSlugs(10),
    getMostWatchedSlugs(postSlugs, 10),
    getLatestVideos(20),
  ]);

  const videoIds = (videos ?? []).map((v) => `yt:${v.id}`);
  const mostWatchedVideoSlugs = videoIds.length ? await getMostWatchedSlugs(videoIds, 10) : [];

  const videoTitleById = new Map((videos ?? []).map((v) => [v.id, v.title]));

  const trendingRows = await Promise.all(
    (trendingSlugs ?? []).map(async (slug) => ({
      slug,
      title: slug.startsWith('yt:') ? videoTitleById.get(slug.slice(3)) || slug : await getPostTitle(slug, posts),
      views: await getViewCount(slug),
    }))
  );

  const mostWatchedPostRows = await Promise.all(
    (mostWatchedPostSlugs ?? []).map(async (slug) => ({
      slug,
      title: await getPostTitle(slug, posts),
      views: await getViewCount(slug),
    }))
  );

  const mostWatchedVideoRows = await Promise.all(
    (mostWatchedVideoSlugs ?? []).map(async (slug) => ({
      slug,
      title: videoTitleById.get(slug.slice(3)) || slug,
      views: await getViewCount(slug),
    }))
  );

  const Table = ({ title, rows }: { title: string; rows: { slug: string; title: string; views: number | null }[] }) => (
    <div style={{ marginBottom: 40 }}>
      <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>{title}</h3>
      {rows.length === 0 ? (
        <p style={{ fontSize: '.85rem', color: 'var(--text-faint)' }}>No data yet.</p>
      ) : (
        <div style={{ border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
          {rows.map((row, i) => (
            <div
              key={row.slug}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                padding: '10px 16px',
                borderTop: i === 0 ? 'none' : '1px solid var(--border-glass)',
                fontSize: '.85rem',
              }}
            >
              <span>{row.title}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', whiteSpace: 'nowrap' }}>
                {row.views ?? 0} views
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <SiteHeader />
      <section className="section">
        <div className="container" style={{ maxWidth: 720 }}>
          <div className="section-header">
            <span className="eyebrow">Admin</span>
            <h2 style={{ textTransform: 'none', fontSize: '1.8rem' }}>Analytics</h2>
            <p>Blog reads and YouTube watches, tracked on this site directly (separate from YouTube's own count).</p>
          </div>

          <Table title="Trending This Week" rows={trendingRows} />
          <Table title="Most Watched — Blog Posts (All Time)" rows={mostWatchedPostRows} />
          <Table title="Most Watched — Videos (All Time)" rows={mostWatchedVideoRows} />
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
