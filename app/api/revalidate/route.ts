import { revalidatePath, revalidateTag } from 'next/cache';
import { timingSafeEqual } from 'crypto';
import { kv } from '@vercel/kv';

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

// Trimmed and case-insensitive: a pasted newline or an I/l mix-up in a
// dashboard shouldn't silently break instant refresh.
const norm = (v: string) => v.trim().toLowerCase();
function ok(given: string | null) {
  const want = process.env.SANITY_REVALIDATE_SECRET;
  if (!want || !given) return false;
  const a = Buffer.from(norm(given)), b = Buffer.from(norm(want));
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const given = url.searchParams.get('secret') ?? req.headers.get('x-revalidate-secret');
  if (!ok(given)) {
    // Record what arrived (lengths and first letters only, never the secret)
    // so /admin/status can say exactly what differs.
    const want = process.env.SANITY_REVALIDATE_SECRET ?? '';
    await kv.set('webhook:fail', { at: Date.now(), got: given ? `${given.length} chars, starts "${given.slice(0, 3)}"` : 'no secret in URL', want: want ? `${want.trim().length} chars, starts "${want.trim().slice(0, 3)}"` : 'not set' }).catch(() => {});
    return Response.json({ error: 'Bad secret' }, { status: 401 });
  }
  const body = await req.json().catch(() => ({})) as { _type?: string; slug?: string; audience?: string };
  const paths = new Set(PATHS[body._type ?? ''] ?? ['/', '/blog', '/library', '/live', '/kids', '/teens']);
  if (body._type === 'post' && body.slug) paths.add(body.audience === 'teens' ? `/teens/blog/${body.slug}` : `/blog/${body.slug}`);
  revalidateTag('sanity');
  paths.forEach((p) => revalidatePath(p));
  // Remembered so /admin/status can show the webhook really arrives.
  await kv.set('webhook:last', { at: Date.now(), type: body._type ?? 'unknown' }).catch(() => {});
  return Response.json({ revalidated: Array.from(paths) });
}
