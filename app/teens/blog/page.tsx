import { SiteHeader, SiteFooter } from '@/components/SiteChrome';
import { getTeenPosts } from '@/lib/sanity';

export const metadata = { title: 'Teens Blog | TCH Teens' };
export const revalidate = 60;

export default async function TeenBlog() {
  const posts = await getTeenPosts();
  return (
    <>
      <SiteHeader />
      <main className="tn">
        <section className="container tn-section" style={{ paddingTop: 40 }}>
          <a href="/teens" className="tn-back">&larr; TCH Teens</a>
          <div className="tn-head"><h2>Teens blog</h2></div>
          {posts.length ? (
            <div className="tn-blog tn-blog--all">
              {posts.map((p) => (
                <a key={p._id} href={`/teens/blog/${p.slug}`} className="tn-post">
                  <span className="tn-post-img"><img src={p.coverImage} alt="" loading="lazy" /></span>
                  <span className="tn-post-body">{p.category && <em>{p.category}</em>}<strong>{p.title}</strong>{p.excerpt && <span>{p.excerpt}</span>}</span>
                </a>
              ))}
            </div>
          ) : <div className="tn-empty"><strong>First posts dropping soon.</strong></div>}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
