import { NextRequest, NextResponse } from 'next/server';
import { recordView, recordShare, recordReadComplete } from '@/lib/analytics';

export async function POST(req: NextRequest) {
  try {
    const { slug, event, visitorId } = await req.json();
    if (typeof slug !== 'string' || !slug) {
      return NextResponse.json({ error: 'slug required' }, { status: 400 });
    }
    switch (event) {
      case 'share':
        await recordShare(slug);
        break;
      case 'read-complete':
        await recordReadComplete(slug);
        break;
      case 'view':
      default:
        await recordView(slug, typeof visitorId === 'string' ? visitorId : undefined);
    }
    return NextResponse.json({ ok: true });
  } catch {
    // Never fail loudly for a view-tracking call — a broken analytics
    // ping should never look like a broken page to a reader.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
