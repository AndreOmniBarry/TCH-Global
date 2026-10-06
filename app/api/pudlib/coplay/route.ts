import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

// Item-to-item co-play counts for PUDLIB! recommendations ("people who
// played this also played..."). Anonymous: only message ids are stored.
export const dynamic = 'force-dynamic';
const ON = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
const ID = /^(yt|au)-[A-Za-z0-9_-]{2,64}$/;

export async function POST(req: NextRequest) {
  if (!ON) return NextResponse.json({ ok: false });
  const { id, recent } = await req.json().catch(() => ({}));
  if (typeof id !== 'string' || !ID.test(id) || !Array.isArray(recent)) return NextResponse.json({ ok: false }, { status: 400 });
  const others = recent.filter((r: unknown): r is string => typeof r === 'string' && ID.test(r) && r !== id).slice(0, 5);
  if (!others.length) return NextResponse.json({ ok: true });
  const p = kv.pipeline();
  others.forEach((r) => { p.zincrby(`pudlib:co:${r}`, 1, id); p.zincrby(`pudlib:co:${id}`, 1, r); });
  await p.exec().catch(() => null);
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  if (!ON) return NextResponse.json({ coplay: {} });
  const ids = (req.nextUrl.searchParams.get('ids') || '').split(',').filter((x) => ID.test(x)).slice(0, 8);
  const coplay: Record<string, Record<string, number>> = {};
  await Promise.all(ids.map(async (id) => {
    const rows = await kv.zrange<string[]>(`pudlib:co:${id}`, 0, 19, { rev: true, withScores: true }).catch(() => []);
    const m: Record<string, number> = {};
    for (let i = 0; i + 1 < rows.length; i += 2) m[String(rows[i])] = Number(rows[i + 1]);
    coplay[id] = m;
  }));
  return NextResponse.json({ coplay }, { headers: { 'Cache-Control': 'public, s-maxage=300' } });
}
