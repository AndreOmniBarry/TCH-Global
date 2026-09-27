import Script from 'next/script';
import Link from 'next/link';
import { getAllPosts } from '@/lib/sanity';
import { fallbackPosts } from '@/lib/fallback-posts';
import { SiteHeader, SiteFooter } from '@/components/SiteChrome';

export const metadata = {
  title: 'The Comforters Blog | TCH Global',
  description:
    'Weekly reflections from TCH Global, published every Sunday. Faith, hope, and grace for everyday living.',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default async function BlogIndexPage() {
  const posts = (await getAllPosts()) ?? fallbackPosts;
  const [featured, ...rest] = posts;

  return (
    <>
      <SiteHeader />

      <section className="blog-index-hero">
        <div className="blog-shell">
          <span className="eyebrow">The Comforters Blog</span>
          <h1>Words for the Everyday Faith</h1>
          <p>Weekly reflections from TCH Global — for church family and first-time readers alike. New every Sunday.</p>
          <span className="blog-cadence">Published weekly &middot; Every Sunday</span>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="blog-shell">
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
            <form className="newsletter-form-row">
              <input type="email" placeholder="Enter your email" required style={{ marginBottom: 0 }} />
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
