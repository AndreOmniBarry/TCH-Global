import { NextRequest, NextResponse } from 'next/server';
import { authConfigured, guardianRemove, limited } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!authConfigured) return NextResponse.json({ error: 'Accounts are not available yet.' }, { status: 503 });
  const { token } = await req.json().catch(() => ({}));
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'x';
  if (await limited(`guardian:${ip}`, 20, 3600)) return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  const ok = typeof token === 'string' && (await guardianRemove(token));
  if (!ok) return NextResponse.json({ error: 'This link has already been used or the account no longer exists.' }, { status: 410 });
  return NextResponse.json({ ok: true });
}
