import { NextRequest, NextResponse } from 'next/server';
import { requeue, discard, drain, listItems, readItem, clearAuthAlert, bridgeConfigured } from '@/lib/bridge/outbox';
import { eraseSubmissions } from '@/lib/forms';

// Behind the /admin password (middleware.ts). Retry, release, remove,
// export (CSV for SHEP.HRD import) and erase-a-person.
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const ID_RE = /^[0-9a-f-]{36}$/;

// Spreadsheet formula injection: a cell starting with = + - @ (or a tab/CR)
// is prefixed so Excel/Sheets treat it as text.
function cell(v: unknown): string {
  let s = Array.isArray(v) ? v.join('; ') : String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const which = req.nextUrl.searchParams.get('export') === 'pending' ? 'pending' : 'dead';
  const items = await listItems(which, 500);
  const cols = ['id', 'type', 'created', 'attempts', 'last_answer', 'held', 'consent_version', 'full_name', 'email', 'phone', 'city', 'teams', 'team_idea', 'note', 'request'];
  const lines = [cols.join(',')];
  for (const it of items) {
    const env = readItem(it);
    const d = (env?.data || {}) as Record<string, unknown>;
    lines.push([it.id, it.type, new Date(it.createdAt).toISOString(), it.attempts, it.lastCode ?? '', it.held ?? '', env?.consent.version ?? 'unreadable',
      d.full_name, d.email, d.phone, d.city, d.teams, d.team_idea, d.note, d.request].map(cell).join(','));
  }
  return new NextResponse(lines.join('\r\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="tch-shep-${which}-${new Date().toISOString().slice(0, 10)}.csv"`, 'Cache-Control': 'no-store' },
  });
}

export async function POST(req: NextRequest) {
  const { action, ids, who } = await req.json().catch(() => ({}));
  const list: string[] = Array.isArray(ids) ? ids.filter((x: unknown) => typeof x === 'string' && ID_RE.test(x)).slice(0, 500) : [];
  try {
    if (action === 'send-now') {
      if (!bridgeConfigured) return NextResponse.json({ error: 'The bridge is not set up yet.' }, { status: 503 });
      const r = await drain(25, 20000);
      return NextResponse.json({ ok: true, ...r });
    }
    if (action === 'release') { await requeue(list); return NextResponse.json({ ok: true }); }
    if (action === 'remove') { await discard(list); return NextResponse.json({ ok: true }); }
    if (action === 'clear-alert') { await clearAuthAlert(); return NextResponse.json({ ok: true }); }
    if (action === 'erase') {
      const q = String(who || '').trim().toLowerCase();
      const digits = q.replace(/\D/g, '');
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(q);
      if (!isEmail && digits.length < 7) return NextResponse.json({ error: 'Enter the person’s full email or phone number.' }, { status: 400 });
      const last = digits.slice(-10);
      const hit = (email?: unknown, phone?: unknown) =>
        (isEmail && String(email || '').trim().toLowerCase() === q) || (!isEmail && String(phone || '').replace(/\D/g, '').endsWith(last));
      const forms = await eraseSubmissions((f) => hit(f.email || f.contact, f.phone || f.contact));
      const queued = [...(await listItems('pending', 500)), ...(await listItems('dead', 500))]
        .filter((it) => { const d = readItem(it)?.data as Record<string, unknown> | undefined; return d && hit(d.email, d.phone); })
        .map((it) => it.id);
      await discard(queued);
      return NextResponse.json({ ok: true, forms, queued: queued.length });
    }
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (e) {
    console.error('admin bridge', action, (e as Error).name);
    return NextResponse.json({ error: 'That did not work. Try again.' }, { status: 500 });
  }
}
