import { NextRequest, NextResponse } from 'next/server';
import { isLiveNow, setLiveNow } from '@/lib/analytics';

// Manual switch for the favicon's "we're live" dot — see
// streaming/README.md for the exact commands and how this fits into the
// live-streaming roadmap.
export async function GET() {
  return NextResponse.json({ live: await isLiveNow() });
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-live-secret');
  if (!process.env.LIVE_STATUS_SECRET || secret !== process.env.LIVE_STATUS_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const { live } = await req.json();
  await setLiveNow(Boolean(live));
  return NextResponse.json({ ok: true, live: Boolean(live) });
}
