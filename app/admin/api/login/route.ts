import { NextRequest, NextResponse } from 'next/server';
import { passwordOk } from '@/lib/sanity-write';
import { ADMIN_COOKIE, adminToken } from '@/lib/admin-token';
import { limited } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({}));
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'x';
  if (await limited(`adminlogin:${ip}`, 10, 900)) return NextResponse.json({ error: 'Too many attempts. Wait 15 minutes.' }, { status: 429 });
  if (!process.env.WRITE_PASSWORD) return NextResponse.json({ error: 'WRITE_PASSWORD is not set in Vercel yet.' }, { status: 503 });
  if (typeof password !== 'string' || !passwordOk(password)) return NextResponse.json({ error: 'That password is not right.' }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, (await adminToken())!, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 14 });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
