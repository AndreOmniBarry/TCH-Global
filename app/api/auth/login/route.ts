import { NextRequest, NextResponse } from 'next/server';
import { authConfigured, checkLogin, startSession, limited } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!authConfigured) return NextResponse.json({ error: 'Accounts are not available yet.' }, { status: 503 });
  const { email, password } = await req.json().catch(() => ({}));
  if (typeof email !== 'string' || typeof password !== 'string') return NextResponse.json({ error: 'Enter your email and password.' }, { status: 400 });
  if (await limited(`login:${email.trim().toLowerCase()}`, 10, 900)) return NextResponse.json({ error: 'Too many attempts. Wait 15 minutes and try again.' }, { status: 429 });
  const m = await checkLogin(email, password);
  if (!m) return NextResponse.json({ error: 'That email and password don’t match.' }, { status: 401 });
  await startSession(m.id);
  return NextResponse.json({ ok: true, member: m });
}
