import { notFound } from 'next/navigation';
import { SiteHeader, SiteFooter } from '@/components/SiteChrome';
import { getTeenPostBySlug } from '@/lib/sanity';
import BlogComments from '@/components/members/BlogComments';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const p = await getTeenPostBySlug(params.slug);
  return p ? { title: `${p.title} | TCH Teens`, description: p.excerpt } : {};
}

export default async function TeenPost({ params }: { params: { slug: string } }) {
  const post = await getTeenPostBySlug(params.slug);
  if (!post) notFound();
  return (
    <>
      <SiteHeader />
      <main className="tn tn-read">
        <header className="tn-read-hero">
          <img src={post.coverImage} alt="" />
          <div className="container">
            <a href="/teens" className="tn-back">&larr; TCH Teens</a>
            {post.category && <em className="tn-read-cat">{post.category}</em>}
            <h1>{post.title}</h1>
            <p>{post.authorName} &middot; {new Date(post.publishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}{post.readTime ? ` · ${post.readTime}` : ''}</p>
          </div>
        </header>
        <article className="container tn-read-body post-body" dangerouslySetInnerHTML={{ __html: post.body || '' }} />
        <div className="container tn-read-body"><BlogComments slug={post.slug} /></div>
      </main>
      <SiteFooter />
    </>
  );
}
