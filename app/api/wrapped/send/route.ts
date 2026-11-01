import { NextRequest, NextResponse } from 'next/server';
import { listMembers } from '@/lib/auth';
import { buildWrapped } from '@/lib/wrapped-track';
import { wrappedEmail } from '@/lib/wrapped';
import { sendEmail, emailConfigured } from '@/lib/email';
import { hexEqual, sha256hex } from '@/lib/bridge/crypto';
import { kv } from '@vercel/kv';

// Sends "My Year in the Word" by email (Vercel cron, Bearer CRON_SECRET):
// on the 1st, last month's recap; on 15 December, the year so far. Each
// member gets each edition once (remembered in KV), only if they have
// activity and haven't switched it off.
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const SITE = (process.env.SITE_URL || 'https://tch-global.vercel.app').replace(/\/+$/, '');

export async function GET(req: NextRequest) {
  const want = (process.env.CRON_SECRET || '').trim();
  const got = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!want || !got || !hexEqual(sha256hex(got), sha256hex(want))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!emailConfigured) return NextResponse.json({ sent: 0, reason: 'email not configured' });

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }); // YYYY-MM-DD
  const [y, m, d] = today.split('-').map(Number);
  let period: string;
  if (m === 12 && d === 15) period = String(y);
  else if (d === 1) { const pm = m === 1 ? 12 : m - 1; period = `${m === 1 ? y - 1 : y}-${String(pm).padStart(2, '0')}`; }
  else return NextResponse.json({ sent: 0, reason: 'not a send day' });

  let sent = 0;
  for (const member of await listMembers(2000)) {
    if (member.wrapped === false) continue;
    const mark = `wr:sent:${period}:${member.id}`;
    if (await kv.get(mark)) continue;
    const data = await buildWrapped(member, period).catch(() => null);
    if (!data || data.minutes + data.reads.posts + data.prayers.prayed < 5) continue;
    const { subject, html } = wrappedEmail(data, `${SITE}/wrapped?p=${period}`);
    if (await sendEmail({ to: [member.email], subject, html })) {
      await kv.set(mark, 1, { ex: 60 * 60 * 24 * 400 });
      sent++;
    }
  }
  return NextResponse.json({ sent, period });
}
