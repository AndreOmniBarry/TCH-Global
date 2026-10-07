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
import AdminNav from '@/components/AdminNav';
import { AreaCompare, BarList, Donut, Funnel, KpiCard, WeekdayBars } from '@/components/analytics/Charts';
import { getLibrary } from '@/lib/library';

export const metadata = { title: 'Analytics | TCH Global Admin' };
export const dynamic = 'force-dynamic'; // always read fresh counts, never cache this page

function getPostTitle(slug: string, posts: { slug: string; title: string }[]) {
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
    getSiteDailyViews(postSlugs, 28),
    getWeekOverWeekGrowth(postSlugs),
  ]);
  const lib = await getLibrary().catch(() => null);
  const libMedia = (lib?.items ?? []).filter((i) => i.kind !== 'book');
  const libRows = [...libMedia].sort((a, b) => b.views - a.views).filter((i) => i.views > 0).slice(0, 8);
  const libVideoPlays = libMedia.filter((i) => i.kind === 'video').reduce((s, i) => s + i.views, 0);
  const libAudioPlays = libMedia.filter((i) => i.kind === 'audio').reduce((s, i) => s + i.views, 0);

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
  const totalCompletes = engagementRows.reduce((s, r) => s + r.completes, 0);
  const readRate = totalViews ? Math.round((totalCompletes / totalViews) * 100) : 0;
  const daily = siteDailyViews ?? [];
  const current = daily.slice(-14);
  const previous = daily.length >= 28 ? daily.slice(0, 14) : undefined;
  const curTotal = current.reduce((s, d) => s + d.views, 0);
  const prevTotal = (previous ?? []).reduce((s, d) => s + d.views, 0);
  const periodDelta = prevTotal ? Math.round(((curTotal - prevTotal) / prevTotal) * 100) : null;

  return (
    <>
      <SiteHeader />
      <section className="section">
        <div className="container an-dash">
          <AdminNav current="/admin/analytics" />
          <div className="section-header">
            <span className="eyebrow">Admin</span>
            <h2 style={{ textTransform: 'none', fontSize: '1.8rem' }}>Analytics</h2>
            <p>Blog reads and YouTube watches, tracked on this site directly (separate from YouTube's own count).</p>
          </div>

          <div className="an-kpis">
            <KpiCard label="Views (14 days)" value={curTotal} delta={periodDelta} spark={current.map((d) => d.views)} />
            <KpiCard label="Unique visitors" value={totalUniques} note="All time, anonymous" />
            <KpiCard label="Avg. read-through" value={`${readRate}%`} note="Reached the end of a post" />
            <KpiCard label="Shares" value={totalShares} note="All time" />
            <KpiCard label="PUDLIB! plays" value={libVideoPlays + libAudioPlays} note="Video + audio, all time" />
            <KpiCard label="Week over week" value={growth === null ? '\u2014' : `${growth > 0 ? '+' : ''}${growth}%`} note={growth === null ? 'Not enough history yet' : 'Last 7 days vs the 7 before'} />
          </div>

          <div className="an-card an-span">
            <div className="an-card-head"><h3>Views</h3><span className="an-muted">Last 14 days compared with the 14 before</span></div>
            {curTotal + prevTotal > 0 ? <AreaCompare current={current} previous={previous} /> : <p className="an-empty">No views yet in this window.</p>}
          </div>

          <div className="an-grid">
            <div className="an-card">
              <div className="an-card-head"><h3>Engagement funnel</h3><span className="an-muted">Blog, all time</span></div>
              <Funnel stages={[
                { label: 'Views', value: totalViews },
                { label: 'Unique readers', value: totalUniques },
                { label: 'Read to the end', value: totalCompletes },
                { label: 'Shared', value: totalShares },
              ]} />
            </div>
            <div className="an-card">
              <div className="an-card-head"><h3>Content mix</h3><span className="an-muted">Where attention goes</span></div>
              <Donut parts={[
                { label: 'Blog reads', value: totalViews, color: 'var(--accent-cyan)' },
                { label: 'Video plays', value: libVideoPlays, color: 'var(--accent-violet)' },
                { label: 'Audio plays', value: libAudioPlays, color: '#f5c542' },
              ]} />
            </div>
            <div className="an-card">
              <div className="an-card-head"><h3>Best days</h3><span className="an-muted">Views by weekday, 28 days</span></div>
              <WeekdayBars data={daily} />
            </div>
            <div className="an-card">
              <div className="an-card-head"><h3>Trending this week</h3></div>
              <BarList rows={trendingRows.map((r) => ({ label: r.title, value: r.views ?? 0 }))} color="linear-gradient(90deg, var(--accent-violet), var(--accent-cyan))" />
            </div>
            <div className="an-card">
              <div className="an-card-head"><h3>Top blog posts</h3><span className="an-muted">All time</span></div>
              <BarList rows={mostWatchedPostRows.map((r) => ({ label: r.title, value: r.views ?? 0 }))} color="var(--accent-cyan)" />
            </div>
            <div className="an-card">
              <div className="an-card-head"><h3>Top in PUDLIB!</h3><span className="an-muted">Plays, all time</span></div>
              <BarList rows={(libRows.length ? libRows.map((i) => ({ label: i.title, value: i.views })) : mostWatchedVideoRows.map((r) => ({ label: r.title, value: r.views ?? 0 })))} color="#f5c542" unit="plays" />
            </div>
          </div>

          <div className="an-card an-span">
            <div className="an-card-head"><h3>Engagement per post</h3></div>
            <div className="an-table-wrap">
              <table className="an-table">
                <thead><tr><th>Post</th><th>Views</th><th>Unique</th><th>Shares</th><th>Read-through</th></tr></thead>
                <tbody>
                  {[...engagementRows].sort((a, b) => b.views - a.views).map((row) => {
                    const rate = row.views ? Math.round((row.completes / row.views) * 100) : 0;
                    return (
                      <tr key={row.slug}>
                        <td>{row.title}</td><td>{row.views}</td><td>{row.uniques}</td><td>{row.shares}</td>
                        <td><span className="an-rate"><span style={{ width: `${rate}%` }} /></span>{rate}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="an-muted" style={{ fontSize: '.72rem', marginTop: 10 }}>Read-through is readers who scrolled to roughly the end, as a share of views.</p>
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
