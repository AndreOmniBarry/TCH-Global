import Script from 'next/script';
import Link from 'next/link';
import { getAllPosts } from '@/lib/sanity';
import { fallbackPosts } from '@/lib/fallback-posts';
import { SiteHeader, SiteFooter } from '@/components/SiteChrome';
import SectionTitleStage from '@/components/decor/SectionTitleStage';
import { getTrendingSlugs } from '@/lib/analytics';

export const metadata = {
  title: 'The Comforters Blog | TCH Global',
  description:
    'Weekly reflections from TCH Global, published every Sunday. Faith, hope, and grace for everyday living.',
};

// Without this, the page is fully static and "Trending This Week" would
// freeze at whatever it was the moment the site was last built.
export const revalidate = 60;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default async function BlogIndexPage() {
  const posts = (await getAllPosts()) ?? fallbackPosts;
  const [featured, ...rest] = posts;

  const trendingSlugs = await getTrendingSlugs(3);
  const trendingPosts = trendingSlugs
    ?.map((slug) => posts.find((p) => p.slug === slug))
    .filter((p): p is (typeof posts)[number] => Boolean(p));

  return (
    <>
      <SectionTitleStage />
      <SiteHeader />

      <section className="blog-index-hero" data-title="Blog">
        <div className="blog-shell">
          <span className="eyebrow">The Comforters Blog</span>
          <h1>Words for the Everyday Faith</h1>
          <p>Weekly reflections from TCH Global — for church family and first-time readers alike. New every Sunday.</p>
          <span className="blog-cadence">Published weekly &middot; Every Sunday</span>
        </div>
      </section>

      <section className="section" data-title="Stories" style={{ paddingTop: 0 }}>
        <div className="blog-shell">
          {trendingPosts && trendingPosts.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <span className="blog-tag" style={{ display: 'block', marginBottom: 10 }}>Trending This Week</span>
              <div className="blog-grid-list">
                {trendingPosts.map((post) => (
                  <Link href={`/blog/${post.slug}`} className="blog-list-card" key={post._id}>
                    <div className="body" style={{ padding: 16 }}>
                      <span className="blog-tag">{post.category}</span>
                      <h4 style={{ fontSize: '.95rem', textTransform: 'none', margin: '6px 0' }}>{post.title}</h4>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {featured && (
            <Link href={`/blog/${featured.slug}`} className="blog-hero-card">
              <div className="cover">
                <img src={featured.coverImage} alt={featured.title} />
              </div>
              <div className="body">
                <span className="post-byline">
                  <span className="avatar"><img src={featured.authorImage} alt={featured.authorName} /></span>
                  <span className="meta">
                    <strong>{featured.authorName}</strong>
                    {formatDate(featured.publishedAt)} &middot; {featured.readTime}
                  </span>
                </span>
                <h2>{featured.title}</h2>
                <p className="excerpt">{featured.excerpt}</p>
              </div>
            </Link>
          )}

          <div className="blog-grid-list">
            {rest.map((post) => (
              <Link href={`/blog/${post.slug}`} className="blog-list-card" key={post._id}>
                <div className="cover">
                  <img src={post.coverImage} alt={post.title} />
                </div>
                <div className="body">
                  <span className="post-byline">
                    <span className="avatar"><img src={post.authorImage} alt={post.authorName} /></span>
                    <span className="meta">
                      <strong>{post.authorName}</strong>
                      {formatDate(post.publishedAt)} &middot; {post.readTime}
                    </span>
                  </span>
                  <h3>{post.title}</h3>
                  <p className="excerpt">{post.excerpt}</p>
                </div>
              </Link>
            ))}
          </div>

          <div className="newsletter-card" style={{ marginTop: 48 }}>
            <h3>Never Miss a Post</h3>
            <p>Get every Sunday&rsquo;s reflection delivered straight to your inbox, the moment it&rsquo;s published.</p>
            <form className="newsletter-form-row js-newsletter" data-source="blog-index">
              <input type="email" name="email" placeholder="Enter your email" required autoComplete="email" style={{ marginBottom: 0 }} />
              <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hp-field" aria-hidden="true" />
              <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>Subscribe</button>
            </form>
          </div>
        </div>
      </section>

      <SiteFooter />
      <Script src="/js/blog.js" strategy="afterInteractive" />
    </>
  );
}
