import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { writeClient } from '@/lib/sanity-write';
import { SPOTLIGHT_QUERY_ALL } from '@/lib/sanity';

// Behind the /admin sign-in (middleware.ts). Upload and manage the hero
// spotlight; every change refreshes the homepage immediately.
export const dynamic = 'force-dynamic';
const KINDS = ['Event', 'Announcement', 'Programme', 'Banner'];
const MAX_BYTES = 4.4 * 1024 * 1024;

function need() {
  return writeClient ? null : NextResponse.json({ error: 'Add SANITY_API_WRITE_TOKEN in Vercel (Production) and redeploy to upload.' }, { status: 503 });
}
const date = (v: FormDataEntryValue | null) => {
  if (typeof v !== 'string' || !v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};
const str = (v: FormDataEntryValue | null, max = 200) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);

export async function GET() {
  const n = need(); if (n) return n;
  return NextResponse.json({ items: await writeClient!.fetch(SPOTLIGHT_QUERY_ALL) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  const n = need(); if (n) return n;
  try {
    const f = await req.formData();
    const title = str(f.get('title'), 120);
    if (!title) return NextResponse.json({ error: 'Give it a title.' }, { status: 400 });
    const file = f.get('image');
    let image: object | undefined;
    if (file && typeof file !== 'string' && file.size) {
      if (!/^image\/(jpeg|png|webp|avif|gif)$/.test(file.type)) return NextResponse.json({ error: 'Use a JPG, PNG or WebP image.' }, { status: 400 });
      if (file.size > MAX_BYTES) return NextResponse.json({ error: 'That image is too large. Export a smaller copy (under 4 MB).' }, { status: 400 });
      const asset = await writeClient!.assets.upload('image', Buffer.from(await file.arrayBuffer()), { filename: file.name, contentType: file.type });
      image = { _type: 'image', asset: { _type: 'reference', _ref: asset._id } };
    }
    const kind = str(f.get('kind'));
    const count = await writeClient!.fetch<number>('count(*[_type == "spotlight"])');
    const doc = await writeClient!.create({
      _type: 'spotlight',
      title,
      kind: kind && KINDS.includes(kind) ? kind : 'Event',
      subtitle: str(f.get('subtitle'), 160),
      image,
      eventDate: date(f.get('eventDate')),
      showFrom: date(f.get('showFrom')),
      showUntil: date(f.get('showUntil')),
      link: str(f.get('link'), 400),
      linkLabel: str(f.get('linkLabel'), 40),
      order: count,
      hidden: false,
    });
    revalidatePath('/');
    return NextResponse.json({ ok: true, id: doc._id });
  } catch (err) {
    console.error('spotlight create failed', err);
    return NextResponse.json({ error: 'Could not save. Try again.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const n = need(); if (n) return n;
  const { id, hidden, order, showUntil, swapWith } = await req.json().catch(() => ({}));
  if (typeof id !== 'string') return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
  try {
    if (typeof swapWith === 'string') {
      const [a, b] = await Promise.all([writeClient!.getDocument(id), writeClient!.getDocument(swapWith)]);
      await writeClient!.transaction().patch(id, (p) => p.set({ order: (b?.order as number) ?? 0 })).patch(swapWith, (p) => p.set({ order: (a?.order as number) ?? 0 })).commit();
    } else {
      const set: Record<string, unknown> = {};
      if (typeof hidden === 'boolean') set.hidden = hidden;
      if (typeof order === 'number') set.order = order;
      if (typeof showUntil === 'string') set.showUntil = showUntil || null;
      await writeClient!.patch(id).set(set).commit();
    }
    revalidatePath('/');
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('spotlight update failed', err);
    return NextResponse.json({ error: 'Could not update.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const n = need(); if (n) return n;
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
  await writeClient!.delete(id);
  revalidatePath('/');
  return NextResponse.json({ ok: true });
}
