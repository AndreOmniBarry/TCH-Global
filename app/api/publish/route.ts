import { NextRequest, NextResponse } from 'next/server';
import { writeClient, passwordOk } from '@/lib/sanity-write';
import { markdownToHtml, plainText } from '@/lib/markdown';

export const dynamic = 'force-dynamic';

const CATEGORIES = ['Faith', 'Hope', 'Grace', 'Community', 'Family', 'Prayer', 'Testimony'];

function slugify(s: string) {
  return s.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
}

function guard(req: NextRequest) {
  if (!writeClient) {
    return NextResponse.json({ error: 'Publishing needs the Sanity write token: add SANITY_API_WRITE_TOKEN in Vercel (Production) and redeploy.' }, { status: 503 });
  }
  if (!passwordOk(req.headers.get('x-write-password'))) {
    return NextResponse.json({ error: 'Wrong publishing password.' }, { status: 401 });
  }
  return null;
}

// List upcoming scheduled posts.
export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  const posts = await writeClient!.fetch(
    `*[_type == "post" && publishedAt > now()] | order(publishedAt asc) { _id, title, "slug": slug.current, publishedAt }`
  );
  return NextResponse.json({ posts });
}

// Publish now (no publishAt) or schedule (publishAt in the future).
export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  try {
    const { title, body, excerpt, category, coverImageUrl, publishAt } = await req.json();
    if (typeof title !== 'string' || !title.trim() || typeof body !== 'string' || !body.trim()) {
      return NextResponse.json({ error: 'A title and a body are required.' }, { status: 400 });
    }
    let when = new Date();
    if (publishAt) {
      const d = new Date(publishAt);
      if (Number.isNaN(d.getTime())) return NextResponse.json({ error: 'That schedule date is not valid.' }, { status: 400 });
      if (d.getTime() > Date.now()) when = d;
    }
    const text = plainText(body);
    const words = text.split(' ').filter(Boolean).length;
    let slug = slugify(title) || `post-${Date.now()}`;
    const taken = await writeClient!.fetch(`count(*[_type == "post" && slug.current == $slug])`, { slug });
    if (taken) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

    const doc = await writeClient!.create({
      _type: 'post',
      title: title.trim().slice(0, 200),
      slug: { _type: 'slug', current: slug },
      excerpt: (typeof excerpt === 'string' && excerpt.trim() ? excerpt.trim() : text.slice(0, 180)).slice(0, 300),
      category: CATEGORIES.includes(category) ? category : 'Faith',
      publishedAt: when.toISOString(),
      readTime: `${Math.max(1, Math.round(words / 220))} min read`,
      bodyHtml: markdownToHtml(body),
      coverImageUrl: typeof coverImageUrl === 'string' && /^https?:\/\//.test(coverImageUrl) ? coverImageUrl : undefined,
      authorName: 'Pastor Uzor Echiejile',
    });
    return NextResponse.json({ ok: true, id: doc._id, slug, publishedAt: when.toISOString(), scheduled: when.getTime() > Date.now() + 5000 });
  } catch (err) {
    console.error('publish failed', err);
    return NextResponse.json({ error: 'Could not publish right now. Please try again.' }, { status: 500 });
  }
}

// Cancel a scheduled post (only future posts can be deleted here).
export async function DELETE(req: NextRequest) {
  const denied = guard(req);
  if (denied) return denied;
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
  const doc = await writeClient!.fetch(`*[_id == $id][0]{ publishedAt }`, { id });
  if (!doc || new Date(doc.publishedAt).getTime() <= Date.now()) {
    return NextResponse.json({ error: 'Only scheduled (not yet published) posts can be cancelled here.' }, { status: 400 });
  }
  await writeClient!.delete(id);
  return NextResponse.json({ ok: true });
}
