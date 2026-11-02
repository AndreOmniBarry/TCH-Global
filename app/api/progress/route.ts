import { NextRequest, NextResponse } from 'next/server';
import { currentMember } from '@/lib/auth';
import { recordActivity } from '@/lib/wrapped-track';

export const dynamic = 'force-dynamic';

const KID_TASKS = new Set(['story', 'quiz', 'search', 'cross', 'verse']);
const TEEN_TASKS = new Set(['read', 'journal', 'trivia', 'books', 'verse']);

/** Kids' stars and teens' Daily Drop tasks, for signed-in families. The
 * device keeps its own copy too, so nothing breaks when signed out. */
export async function POST(req: NextRequest) {
  const me = await currentMember().catch(() => null);
  if (!me) return NextResponse.json({ ok: false, counted: false });
  const { area, task, kid } = await req.json().catch(() => ({}));
  if (area === 'kids' && KID_TASKS.has(task)) {
    const k = (me.kids ?? []).find((x) => x.id === kid);
    if (!k) return NextResponse.json({ ok: false, counted: false });
    await recordActivity(me, { kind: 'kidStar', kid: k.id });
    return NextResponse.json({ ok: true, counted: true });
  }
  if (area === 'teens' && TEEN_TASKS.has(task)) {
    await recordActivity(me, { kind: 'drop' });
    return NextResponse.json({ ok: true, counted: true });
  }
  return NextResponse.json({ ok: false, counted: false }, { status: 400 });
}
