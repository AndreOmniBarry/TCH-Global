import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { writeClient } from '@/lib/sanity-write';
import type { FormSubmission } from '@/lib/forms';

// Behind the /admin password (middleware.ts). Publishes a submitted
// testimony to the site, or changes/removes a published one.
export const dynamic = 'force-dynamic';
const CATEGORIES = ['Healing', 'Provision', 'Deliverance', 'Family', 'Breakthrough', 'Salvation', 'Other'];

function noWrite() {
  return NextResponse.json({ error: 'Publishing is not connected (needs SANITY_API_WRITE_TOKEN).' }, { status: 503 });
}

async function takePending(submittedAt: string): Promise<FormSubmission | null> {
  const list = (await kv.lrange<FormSubmission>('forms:testimony', 0, 499)) ?? [];
  const entry = list.find((e) => e.submittedAt === submittedAt);
  if (!entry) return null;
  await kv.lrem('forms:testimony', 1, entry);
  return entry;
}

export async function POST(req: NextRequest) {
  const { action, submittedAt, id, featured, name, quote, category } = await req.json().catch(() => ({}));
  try {
    if (action === 'approve' || action === 'dismiss') {
      if (action === 'approve' && !writeClient) return noWrite();
      const entry = await takePending(String(submittedAt));
      if (!entry) return NextResponse.json({ error: 'That submission is no longer pending.' }, { status: 404 });
      if (action === 'dismiss') return NextResponse.json({ ok: true });
      const cat = category || entry.fields.category;
      await writeClient!.create({
        _type: 'testimony',
        name: String(name || entry.fields.name || 'Anonymous').slice(0, 80),
        quote: String(quote || entry.fields.quote || '').slice(0, 2000),
        submittedAt: entry.submittedAt,
        category: CATEGORIES.includes(cat) ? cat : 'Other',
        featured: Boolean(featured),
      });
      return NextResponse.json({ ok: true });
    }
    if (!writeClient) return noWrite();
    if (action === 'feature' && id) {
      await writeClient.patch(String(id)).set({ featured: Boolean(featured) }).commit();
      return NextResponse.json({ ok: true });
    }
    if (action === 'unpublish' && id) {
      await writeClient.delete(String(id));
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (err) {
    console.error('testimony admin failed', err);
    return NextResponse.json({ error: 'Could not update right now.' }, { status: 500 });
  }
}
