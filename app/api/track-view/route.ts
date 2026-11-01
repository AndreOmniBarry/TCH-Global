import { NextRequest, NextResponse } from 'next/server';
import { recordView, recordShare, recordReadComplete } from '@/lib/analytics';
import { currentMember } from '@/lib/auth';
import { recordActivity } from '@/lib/wrapped-track';

export async function POST(req: NextRequest) {
  try {
    const { slug, event, visitorId, seconds, topic } = await req.json();
    if (typeof slug !== 'string' || !slug || slug.length > 200) {
      return NextResponse.json({ error: 'slug required' }, { status: 400 });
    }
    // Signed-in members also build their own private "My Year in the Word".
    const me = await currentMember().catch(() => null);
    if (me) {
      const t = typeof topic === 'string' ? topic.slice(0, 40) : undefined;
      const media = slug.startsWith('media:') || slug.startsWith('yt:');
      const a = event === 'listen' && media ? { kind: 'listen' as const, media: slug, seconds: Number(seconds) || 0 }
        : event === 'read-complete' && !media ? { kind: 'readDone' as const, slug, topic: t }
        : (event === 'view' || !event) && media ? { kind: 'play' as const, media: slug }
        : null;
      if (a) await recordActivity(me, a);
      if (event === 'listen') return NextResponse.json({ ok: true });
    }
    if (event === 'listen') return NextResponse.json({ ok: true });
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
