import { getAllPosts } from '@/lib/sanity';
import { fallbackPosts } from '@/lib/fallback-posts';
import { getLatestVideos } from '@/lib/youtube';
import {
  getViewCount,
  getUniqueViewCount,
  getShareCount,
  getReadCompleteCount,
  getTrendingSlugs,
  getMostWatchedSlugs,
  getSiteDailyViews,
  getWeekOverWeekGrowth,
  analyticsConfigured,
} from '@/lib/analytics';
import { SiteHeader, SiteFooter } from '@/components/SiteChrome';
import TrendChart from '@/components/TrendChart';

export const metadata = { title: 'Analytics | TCH Global Admin' };
export const dynamic = 'force-dynamic'; // always read fresh counts, never cache this page

function getPostTitle(slug: string, posts: { slug: string; title: string }[]) {
  return posts.find((p) => p.slug === slug)?.title || slug;
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-card)', padding: '16px 18px', flex: '1 1 160px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ fontSize: '.75rem', color: 'var(--text-faint)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Table({ title, rows }: { title: string; rows: { slug: string; title: string; views: number | null }[] }) {
  return (
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
                one-click setup. Once connected, this page will show trends, unique visitors, and engagement, with
                zero further code changes.
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

  const [trendingSlugs, mostWatchedPostSlugs, videos, siteDailyViews, growth] = await Promise.all([
    getTrendingSlugs(10),
    getMostWatchedSlugs(postSlugs, 10),
    getLatestVideos(20),
    getSiteDailyViews(postSlugs, 14),
    getWeekOverWeekGrowth(postSlugs),
  ]);

  const videoIds = (videos ?? []).map((v) => `yt:${v.id}`);
  const mostWatchedVideoSlugs = videoIds.length ? await getMostWatchedSlugs(videoIds, 10) : [];
  const videoTitleById = new Map((videos ?? []).map((v) => [v.id, v.title]));

  const trendingRows = await Promise.all(
    (trendingSlugs ?? []).map(async (slug) => ({
      slug,
      title: slug.startsWith('yt:') ? videoTitleById.get(slug.slice(3)) || slug : getPostTitle(slug, posts),
      views: await getViewCount(slug),
    }))
  );

  const mostWatchedPostRows = await Promise.all(
    (mostWatchedPostSlugs ?? []).map(async (slug) => ({
      slug,
      title: getPostTitle(slug, posts),
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

  // Engagement per post: unique visitors, share clicks, and read-completion
  // rate — a proxy for how much of the "reach" numbers actually stuck,
  // rather than just counting page loads.
  const engagementRows = await Promise.all(
    posts.map(async (post) => {
      const [views, uniques, shares, completes] = await Promise.all([
        getViewCount(post.slug),
        getUniqueViewCount(post.slug),
        getShareCount(post.slug),
        getReadCompleteCount(post.slug),
      ]);
      return { ...post, views: views ?? 0, uniques: uniques ?? 0, shares: shares ?? 0, completes: completes ?? 0 };
    })
  );
  const totalViews = engagementRows.reduce((s, r) => s + r.views, 0);
  const totalUniques = engagementRows.reduce((s, r) => s + r.uniques, 0);
  const totalShares = engagementRows.reduce((s, r) => s + r.shares, 0);

  return (
    <>
      <SiteHeader />
      <section className="section">
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="section-header">
            <span className="eyebrow">Admin</span>
            <h2 style={{ textTransform: 'none', fontSize: '1.8rem' }}>Analytics</h2>
            <p>Blog reads and YouTube watches, tracked on this site directly (separate from YouTube's own count).</p>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
            <StatTile label="Total Views" value={totalViews.toLocaleString()} />
            <StatTile label="Unique Visitors" value={totalUniques.toLocaleString()} sub="approximate, no personal data stored" />
            <StatTile label="Shares" value={totalShares.toLocaleString()} />
            <StatTile
              label="Week over Week"
              value={growth === null ? '—' : `${growth > 0 ? '+' : ''}${growth}%`}
              sub={growth === null ? 'not enough history yet' : 'vs. the previous 7 days'}
            />
          </div>

          <div style={{ marginBottom: 40 }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>Views — Last 14 Days</h3>
            {siteDailyViews ? <TrendChart data={siteDailyViews} /> : <p style={{ fontSize: '.85rem', color: 'var(--text-faint)' }}>No data yet.</p>}
          </div>

          <Table title="Trending This Week" rows={trendingRows} />
          <Table title="Most Watched — Blog Posts (All Time)" rows={mostWatchedPostRows} />
          <Table title="Most Watched — Videos (All Time)" rows={mostWatchedVideoRows} />

          <div style={{ marginBottom: 40 }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>Engagement per Post</h3>
            <div style={{ border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 8, padding: '8px 16px', fontFamily: 'var(--font-mono)', fontSize: '9.5px', letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--text-faint)', borderBottom: '1px solid var(--border-glass)' }}>
                <span>Post</span><span>Views</span><span>Unique</span><span>Shares</span><span>Read %</span>
              </div>
              {engagementRows.map((row) => (
                <div key={row.slug} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', gap: 8, padding: '10px 16px', fontSize: '.82rem', borderTop: '1px solid var(--border-glass)' }}>
                  <span>{row.title}</span>
                  <span>{row.views}</span>
                  <span>{row.uniques}</span>
                  <span>{row.shares}</span>
                  <span>{row.views ? Math.round((row.completes / row.views) * 100) : 0}%</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: '.72rem', color: 'var(--text-faint)', marginTop: 10, fontFamily: 'var(--font-mono)' }}>
              &ldquo;Read %&rdquo; is readers who scrolled to roughly the end of the post, as a share of total views —
              a proxy for completion, not a guarantee everyone read every word.
            </p>
          </div>

          <div style={{ border: '1px dashed var(--border-glass)', borderRadius: 'var(--radius-card)', padding: 16, fontSize: '.8rem', color: 'var(--text-faint)' }}>
            <strong style={{ color: 'var(--text-high)', display: 'block', marginBottom: 4 }}>What this doesn&rsquo;t include</strong>
            Reach/impressions, demographics (age, gender, location), and follower-growth numbers the way Instagram or
            Facebook show them require real visitor identity or ad-platform-level tracking infrastructure — deliberately
            not built here, since it would mean collecting personal data this site doesn&rsquo;t otherwise need.
            &ldquo;Unique Visitors&rdquo; above is a privacy-friendly approximation (an anonymous, random ID per
            browser, counted probabilistically) — not exact headcounts, and it resets if someone clears their browser
            data.
          </div>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
