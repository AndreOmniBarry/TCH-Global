import { NextRequest, NextResponse } from 'next/server';
import { recordView } from '@/lib/analytics';

export async function POST(req: NextRequest) {
  try {
    const { slug } = await req.json();
    if (typeof slug !== 'string' || !slug) {
      return NextResponse.json({ error: 'slug required' }, { status: 400 });
    }
    await recordView(slug);
    return NextResponse.json({ ok: true });
  } catch {
    // Never fail loudly for a view-tracking call — a broken analytics
    // ping should never look like a broken page to a reader.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
