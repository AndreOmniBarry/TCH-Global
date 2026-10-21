import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { verifySigned, hexEqual, sha256hex } from '@/lib/bridge/crypto';
import { drain, stats, bridgeConfigured } from '@/lib/bridge/outbox';
import { sendDigest } from '@/lib/bridge/digest';

// Asks the site to push its SHEP.HRD outbox now (CONTRACT.md §2).
// Returns counts only, never submission data. Two ways in:
//   POST, HMAC-signed by SHEP.HRD (BRIDGE_FLUSH_KEYS = "id:secret,...")
//   GET,  "Authorization: Bearer <CRON_SECRET>" (Vercel cron, cron-job.org)
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

async function run(withDigest: boolean) {
  const r = bridgeConfigured ? await drain(25, 20000) : { delivered: 0, tried: 0 };
  if (withDigest) await sendDigest().catch(() => false);
  const s = await stats().catch(() => null);
  return NextResponse.json({ pending: s?.pending ?? 0, delivered: r.delivered, dead: s?.dead ?? 0 });
}

export async function GET(req: NextRequest) {
  const want = (process.env.CRON_SECRET || '').trim();
  const got = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!want || !got || !hexEqual(sha256hex(got), sha256hex(want))) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  return run(true);
}

export async function POST(req: NextRequest) {
  const keys = process.env.BRIDGE_FLUSH_KEYS || '';
  const body = await req.text();
  if (!keys || body.length > 1024) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const host = (req.headers.get('host') || '').toLowerCase();
  const sig = req.headers.get('x-bridge-signature');
  const ok = verifySigned(keys, { method: 'POST', path: '/api/bridge/flush', host, keyId: req.headers.get('x-bridge-key'), ts: req.headers.get('x-bridge-timestamp'), sig, body });
  if (!ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  // A captured request can't be replayed inside the 5-minute window.
  const fresh = await kv.set(`bridge:nonce:${sig!.slice(3, 35)}`, 1, { nx: true, ex: 600 }).catch(() => 'OK');
  if (fresh !== 'OK') return NextResponse.json({ error: 'replay' }, { status: 409 });
  return run(false);
}
