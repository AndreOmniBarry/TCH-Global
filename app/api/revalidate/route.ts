import { revalidatePath } from 'next/cache';
import { timingSafeEqual } from 'crypto';

// Sanity webhook target: Studio publish -> fresh pages within seconds.
// Sanity → API → Webhooks → URL https://<site>/api/revalidate?secret=<SANITY_REVALIDATE_SECRET>,
// trigger on create/update/delete, projection {_type, "slug": slug.current, audience}.
const PATHS: Record<string, string[]> = {
  post: ['/', '/blog', '/teens', '/teens/blog'],
  event: ['/', '/live'],
  announcement: ['/'],
  testimony: ['/'],
  spotlight: ['/'],
  audioMessage: ['/library'],
  book: ['/library'],
  kidsStory: ['/kids'],
};

function ok(given: string | null) {
  const want = process.env.SANITY_REVALIDATE_SECRET;
  if (!want || !given) return false;
  const a = Buffer.from(given), b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (!ok(url.searchParams.get('secret') ?? req.headers.get('x-revalidate-secret'))) return Response.json({ error: 'Bad secret' }, { status: 401 });
  const body = await req.json().catch(() => ({})) as { _type?: string; slug?: string; audience?: string };
  const paths = new Set(PATHS[body._type ?? ''] ?? ['/', '/blog', '/library', '/live', '/kids', '/teens']);
  if (body._type === 'post' && body.slug) paths.add(body.audience === 'teens' ? `/teens/blog/${body.slug}` : `/blog/${body.slug}`);
  paths.forEach((p) => revalidatePath(p));
  return Response.json({ revalidated: Array.from(paths) });
}
