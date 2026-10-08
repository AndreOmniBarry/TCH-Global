import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { currentMember } from '@/lib/auth';

// A member's PUDLIB! state (playlists + watch history), so it follows them
// to any device they sign in on.
export const dynamic = 'force-dynamic';
const MAX = 200_000;

export async function GET() {
  const me = await currentMember();
  if (!me) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const data = await kv.get(`lib:${me.id}`).catch(() => null);
  return NextResponse.json({ data: data ?? null }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(req: NextRequest) {
  const me = await currentMember();
  if (!me) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const body = await req.text();
  if (body.length > MAX) return NextResponse.json({ error: 'Too large.' }, { status: 413 });
  let parsed: { playlists?: unknown; history?: unknown };
  try { parsed = JSON.parse(body); } catch { return NextResponse.json({ error: 'Bad data.' }, { status: 400 }); }
  if (!Array.isArray(parsed.playlists) || typeof parsed.history !== 'object' || parsed.history === null) return NextResponse.json({ error: 'Bad data.' }, { status: 400 });
  await kv.set(`lib:${me.id}`, { playlists: parsed.playlists, history: parsed.history, at: Date.now() });
  return NextResponse.json({ ok: true });
}
