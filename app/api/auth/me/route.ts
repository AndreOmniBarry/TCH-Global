import { NextRequest, NextResponse } from 'next/server';
import { currentMember, updateMember } from '@/lib/auth';
import { submitForm } from '@/lib/forms';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ member: await currentMember() }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(req: NextRequest) {
  const me = await currentMember();
  if (!me) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { name, newsletter, phone } = await req.json().catch(() => ({}));
  const patch: { name?: string; newsletter?: boolean; phone?: string } = {};
  if (typeof name === 'string' && name.trim().length >= 2) patch.name = name.trim().slice(0, 80);
  if (typeof newsletter === 'boolean') patch.newsletter = newsletter;
  if (typeof phone === 'string') patch.phone = phone.trim().slice(0, 30);
  const m = await updateMember(me.email, patch);
  if (patch.newsletter && !me.newsletter) submitForm('newsletter', { email: me.email, source: 'account' }).catch(() => {});
  return NextResponse.json({ member: m });
}
