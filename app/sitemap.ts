import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { getAllPosts, getTeenPosts } from '@/lib/sanity';
import { fallbackPosts } from '@/lib/fallback-posts';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/live`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/library`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/kids`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/teens`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/teens/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
  ];
  const [posts, teen] = await Promise.all([
    getAllPosts().then((p) => p ?? fallbackPosts).catch(() => fallbackPosts),
    getTeenPosts().catch(() => []),
  ]);
  const at = (iso?: string) => (iso && !Number.isNaN(+new Date(iso)) ? new Date(iso) : now);
  return [
    ...pages,
    ...posts.map((p) => ({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: at(p.publishedAt), changeFrequency: 'monthly' as const, priority: 0.6 })),
    ...teen.map((p) => ({ url: `${SITE_URL}/teens/blog/${p.slug}`, lastModified: at(p.publishedAt), changeFrequency: 'monthly' as const, priority: 0.5 })),
  ];
}
