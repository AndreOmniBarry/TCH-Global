import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { randomBytes } from 'crypto';
import { authConfigured, currentMember, limited } from '@/lib/auth';

// Blog comments. Anyone can read; only signed-in members can post, and
// a member can delete their own comment.
export const dynamic = 'force-dynamic';
type Comment = { id: string; memberId: string; name: string; body: string; at: string };
const SLUG = /^[a-z0-9-]{1,120}$/;

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug') || '';
  if (!authConfigured || !SLUG.test(slug)) return NextResponse.json({ comments: [] });
  const comments = (await kv.lrange<Comment>(`comments:${slug}`, 0, 199).catch(() => [])) ?? [];
  return NextResponse.json({ comments }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  const me = await currentMember();
  if (!me) return NextResponse.json({ error: 'Sign in to comment.' }, { status: 401 });
  const { slug, body } = await req.json().catch(() => ({}));
  if (typeof slug !== 'string' || !SLUG.test(slug)) return NextResponse.json({ error: 'Unknown post.' }, { status: 400 });
  const text = typeof body === 'string' ? body.trim() : '';
  if (text.length < 2) return NextResponse.json({ error: 'Write a little more.' }, { status: 400 });
  if (await limited(`comment:${me.id}`, 10, 600)) return NextResponse.json({ error: 'You’re commenting quickly. Wait a few minutes.' }, { status: 429 });
  const c: Comment = { id: randomBytes(6).toString('hex'), memberId: me.id, name: me.name, body: text.slice(0, 2000), at: new Date().toISOString() };
  await kv.rpush(`comments:${slug}`, c);
  return NextResponse.json({ comment: c });
}

export async function DELETE(req: NextRequest) {
  const me = await currentMember();
  if (!me) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const slug = req.nextUrl.searchParams.get('slug') || '';
  const id = req.nextUrl.searchParams.get('id') || '';
  if (!SLUG.test(slug)) return NextResponse.json({ error: 'Unknown post.' }, { status: 400 });
  const list = (await kv.lrange<Comment>(`comments:${slug}`, 0, 199)) ?? [];
  const c = list.find((x) => x.id === id);
  if (!c || c.memberId !== me.id) return NextResponse.json({ error: 'You can only delete your own comments.' }, { status: 403 });
  await kv.lrem(`comments:${slug}`, 1, c);
  return NextResponse.json({ ok: true });
}
