import Script from 'next/script';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPostBySlug, getAllPosts } from '@/lib/sanity';
import { fallbackPosts, getFallbackPostBySlug } from '@/lib/fallback-posts';
import { SiteHeader, SiteFooter } from '@/components/SiteChrome';
import SectionTitleStage from '@/components/decor/SectionTitleStage';
import TrackView from '@/components/TrackView';
import BlogComments from '@/components/members/BlogComments';
import { getViewCount } from '@/lib/analytics';

type Props = { params: { slug: string } };

// Without this, the page is fully static and the "N reads" count would
// freeze at whatever it was the moment the site was last built, instead
// of reflecting real-time view counts.
export const revalidate = 60;

export async function generateStaticParams() {
  const posts = (await getAllPosts()) ?? fallbackPosts;
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const post = (await getPostBySlug(params.slug)) ?? getFallbackPostBySlug(params.slug);
  if (!post) return {};
  return {
    title: `${post.title} | The Comforters Blog`,
    description: post.excerpt,
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const shareIcons = {
  native: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /><line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
    </svg>
  ),
  whatsapp: (
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 20zm4.4-6c-.2-.1-1.4-.7-1.6-.8s-.4-.1-.5.1-.6.8-.7.9-.3.2-.5.1a6.5 6.5 0 0 1-1.9-1.2 7 7 0 0 1-1.3-1.6c-.1-.2 0-.4.1-.5l.4-.4.2-.4v-.4c-.1-.1-.5-1.3-.7-1.8s-.4-.4-.5-.4h-.5a.9.9 0 0 0-.6.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11 11 0 0 0 4.4 3.9c.6.2 1 .4 1.4.5a3.3 3.3 0 0 0 1.5.1 2.5 2.5 0 0 0 1.6-1.1 2 2 0 0 0 .1-1.1c-.1-.1-.2-.2-.4-.3z" /></svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7.6 8.7L23 22h-6.9l-5.4-6.6L4.4 22H1.3l8.1-9.3L1 2h7.1l4.9 6.1L18.9 2zm-1.2 18h1.9L7.4 4H5.4l12.3 16z" /></svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-7.5h2.5l.4-3h-2.9V8.4c0-.9.2-1.5 1.5-1.5h1.6V4.2A20 20 0 0 0 14 4c-2.4 0-4 1.5-4 4.1v2.4H7.5v3H10V21z" /></svg>
  ),
  copy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.5 1.5" /><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7L13 18" />
    </svg>
  ),
};

export default async function BlogPostPage({ params }: Props) {
  const post = (await getPostBySlug(params.slug)) ?? getFallbackPostBySlug(params.slug);
  if (!post) notFound();

  const shareText = encodeURIComponent(`${post.title} — The Comforters Blog`);
  const views = await getViewCount(post.slug);

  return (
    <>
      <div className="read-progress" id="read-progress" />
      <TrackView slug={post.slug} />
      <SectionTitleStage />
      <SiteHeader />

      <article className="blog-shell" data-title="Word">
        <div className="post-header">
          <span className="tag">{post.category}</span>
          <h1>{post.title}</h1>
          <p className="dek">{post.excerpt}</p>
          <span className="post-byline">
            <span className="avatar"><img src={post.authorImage} alt={post.authorName} /></span>
            <span className="meta">
              <strong>{post.authorName}</strong>
              {formatDate(post.publishedAt)} &middot; {post.readTime}
              {views !== null && <> &middot; {views.toLocaleString()} {views === 1 ? 'read' : 'reads'}</>}
            </span>
          </span>
        </div>
        <div className="post-cover"><img src={post.coverImage} alt={post.title} /></div>

        {/* Body sourced from Sanity Portable Text once connected; the
            seeded fallback posts ship as trusted, hand-authored HTML
            strings (never user input), so this is safe. */}
        <div className="post-body" dangerouslySetInnerHTML={{ __html: post.body }} />

        <div className="share-row">
          <span className="label">Share</span>
          <button className="share-btn" data-share="native" aria-label="Share">{shareIcons.native}</button>
          <a className="share-btn" href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noopener" aria-label="Share on WhatsApp">{shareIcons.whatsapp}</a>
          <a className="share-btn" href={`https://twitter.com/intent/tweet?text=${shareText}&url=`} target="_blank" rel="noopener" aria-label="Share on X">{shareIcons.x}</a>
          <a className="share-btn" href="https://www.facebook.com/sharer/sharer.php?u=" target="_blank" rel="noopener" aria-label="Share on Facebook">{shareIcons.facebook}</a>
          <button className="share-btn" data-share="copy" aria-label="Copy link">{shareIcons.copy}</button>
        </div>

        <div className="newsletter-card">
          <h3>Never Miss a Post</h3>
          <p>Get every Sunday&rsquo;s reflection delivered straight to your inbox, the moment it&rsquo;s published.</p>
          <form className="newsletter-form-row js-newsletter" data-source="blog-post">
            <input type="email" name="email" placeholder="Enter your email" required autoComplete="email" style={{ marginBottom: 0 }} />
              <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hp-field" aria-hidden="true" />
            <button type="submit" className="btn btn-primary" style={{ flexShrink: 0 }}>Subscribe</button>
          </form>
        </div>

        <div className="comments-block">
          <BlogComments slug={post.slug} />
        </div>

        <Link href="/blog" className="back-link">&larr; Back to The Comforters Blog</Link>
      </article>

      <SiteFooter />
      <Script src="/js/blog.js" strategy="afterInteractive" />
    </>
  );
}
