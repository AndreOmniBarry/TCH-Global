import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { currentMember, updateMember } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// A parent's child profiles: first name + age only (no email, no surname,
// no photo), so children never hold an account of their own.
export async function POST(req: NextRequest) {
  const me = await currentMember();
  if (!me) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  if (me.teen) return NextResponse.json({ error: 'Child profiles are for parents and guardians.' }, { status: 403 });
  const { name, age } = await req.json().catch(() => ({}));
  const first = typeof name === 'string' ? name.trim().split(/\s+/)[0].slice(0, 24) : '';
  const a = Number(age);
  if (first.length < 2) return NextResponse.json({ error: 'Add your child’s first name.' }, { status: 400 });
  if (!Number.isInteger(a) || a < 3 || a > 12) return NextResponse.json({ error: 'Choose an age from 3 to 12.' }, { status: 400 });
  const kids = me.kids ?? [];
  if (kids.length >= 8) return NextResponse.json({ error: 'You can add up to 8 children.' }, { status: 400 });
  const kid = { id: `k_${randomBytes(5).toString('hex')}`, name: first, age: a };
  const m = await updateMember(me.email, { kids: [...kids, kid] });
  return NextResponse.json({ member: m, kid });
}

export async function DELETE(req: NextRequest) {
  const me = await currentMember();
  if (!me) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { id } = await req.json().catch(() => ({}));
  const m = await updateMember(me.email, { kids: (me.kids ?? []).filter((k) => k.id !== id) });
  return NextResponse.json({ member: m });
}
