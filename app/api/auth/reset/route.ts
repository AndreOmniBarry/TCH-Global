import { NextRequest, NextResponse } from 'next/server';
import { authConfigured, completePasswordReset, limited, startSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!authConfigured) return NextResponse.json({ error: 'Accounts are not available yet.' }, { status: 503 });
  const { token, password } = await req.json().catch(() => ({}));
  if (typeof token !== 'string' || !token) return NextResponse.json({ error: 'This reset link is incomplete. Request a new one.' }, { status: 400 });
  if (typeof password !== 'string' || password.length < 8) return NextResponse.json({ error: 'Use at least 8 characters.' }, { status: 400 });
  if (password.length > 200) return NextResponse.json({ error: 'That password is too long.' }, { status: 400 });
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (await limited(`reset-ip:${ip}`, 20, 3600)) return NextResponse.json({ error: 'Too many attempts. Please wait and try again.' }, { status: 429 });
  const m = await completePasswordReset(token, password);
  if (!m) return NextResponse.json({ error: 'This reset link has expired or was already used. Request a new one.' }, { status: 410 });
  await startSession(m.id);
  return NextResponse.json({ ok: true, member: m });
}
