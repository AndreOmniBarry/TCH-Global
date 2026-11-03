import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { AVATARS, currentMember, KID_ID_RE, updateMember, type Kid } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Children's "explorers" on a family account: first name + buddy avatar
// only. Explorers made on a device before a grown-up signed in keep their
// id, so their saved stars carry straight over.
function clean(x: unknown): Kid | null {
  const o = (x ?? {}) as Record<string, unknown>;
  const raw = typeof o.name === 'string' ? o.name.trim().split(/\s+/)[0].slice(0, 24) : '';
  const name = raw ? raw[0].toUpperCase() + raw.slice(1) : '';
  if (name.length < 2) return null;
  const avatar = typeof o.avatar === 'string' && (AVATARS as readonly string[]).includes(o.avatar) ? o.avatar : AVATARS[0];
  const id = typeof o.id === 'string' && KID_ID_RE.test(o.id) ? o.id : `k_${randomBytes(5).toString('hex')}`;
  return { id, name, avatar };
}

export async function POST(req: NextRequest) {
  const me = await currentMember();
  if (!me) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  if (me.teen) return NextResponse.json({ error: 'Explorers are for families with younger children.' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const incoming = (Array.isArray(body.explorers) ? body.explorers : [body]).map(clean).filter(Boolean) as Kid[];
  if (!incoming.length) return NextResponse.json({ error: 'Add a first name.' }, { status: 400 });
  const kids = [...(me.kids ?? [])];
  for (const k of incoming) {
    // Same explorer made on another device (same first name): keep one.
    const i = kids.findIndex((x) => x.id === k.id || x.name.toLowerCase() === k.name.toLowerCase());
    if (i >= 0) kids[i] = { ...kids[i], name: k.name, avatar: k.avatar };
    else if (kids.length < 8) kids.push(k);
  }
  const m = await updateMember(me.email, { kids });
  return NextResponse.json({ member: m });
}

export async function DELETE(req: NextRequest) {
  const me = await currentMember();
  if (!me) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 });
  const { id } = await req.json().catch(() => ({}));
  const m = await updateMember(me.email, { kids: (me.kids ?? []).filter((k) => k.id !== id) });
  return NextResponse.json({ member: m });
}
