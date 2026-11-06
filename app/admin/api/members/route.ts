import { NextRequest, NextResponse } from 'next/server';
import { authConfigured, createPasswordReset, EMAIL_RE } from '@/lib/auth';
import { emailConfigured, layout, sendEmail, lastEmailError } from '@/lib/email';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

// Admin-only (middleware guards /admin/api): make a password-reset link to
// hand to a member directly, and send a test email to see why email fails.
export async function POST(req: NextRequest) {
  const { action, email } = await req.json().catch(() => ({}));
  const addr = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(addr)) return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 });
  if (action === 'reset-link') {
    if (!authConfigured) return NextResponse.json({ error: 'Accounts are not available (KV not set).' }, { status: 503 });
    const r = await createPasswordReset(addr);
    if (!r) return NextResponse.json({ error: 'No account uses that email. Check the spelling, or try another address they might have used.' }, { status: 404 });
    return NextResponse.json({ ok: true, name: r.name, link: `${SITE_URL}/account/reset?t=${encodeURIComponent(r.token)}` });
  }
  if (action === 'test-email') {
    if (!emailConfigured) return NextResponse.json({ error: 'Email isn’t set up: add SMTP_USER and SMTP_PASS (Gmail app password) in Vercel.' }, { status: 503 });
    const ok = await sendEmail({ to: [addr], subject: 'TCH Global test email', html: layout('It works', '<p style="font-size:15px">This is a test from the TCH Global website. If you can read this, email is working.</p>') });
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: lastEmailError || 'The email could not be sent.' }, { status: 502 });
  }
  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
