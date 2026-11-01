import { NextRequest, NextResponse } from 'next/server';
import { authConfigured, createPasswordReset, EMAIL_RE, limited } from '@/lib/auth';
import { emailConfigured, escapeHtml, layout, sendEmail } from '@/lib/email';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

// Always answers the same way, so nobody can use it to find out which
// emails have accounts.
const SENT = { ok: true, message: 'If that email has an account, a reset link is on its way. Check your inbox (and spam) in the next few minutes.' };

export async function POST(req: NextRequest) {
  if (!authConfigured) return NextResponse.json({ error: 'Accounts are not available yet.' }, { status: 503 });
  if (!emailConfigured) return NextResponse.json({ error: 'Email isn’t set up yet. Contact info@tchglobal.org and our team will reset it.' }, { status: 503 });
  const { email, website } = await req.json().catch(() => ({}));
  if (website) return NextResponse.json(SENT); // honeypot
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) return NextResponse.json({ error: 'Enter the email you signed up with.' }, { status: 400 });
  const addr = email.trim().toLowerCase();
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if ((await limited(`forgot:${addr}`, 3, 3600)) || (await limited(`forgot-ip:${ip}`, 10, 3600))) {
    return NextResponse.json({ error: 'Too many reset requests. Please wait an hour and try again.' }, { status: 429 });
  }
  const r = await createPasswordReset(addr);
  if (r) {
    const link = `${SITE_URL}/account/reset?t=${encodeURIComponent(r.token)}`;
    const first = escapeHtml(r.name.split(' ')[0] || 'there');
    const ok = await sendEmail({
      to: [r.email],
      subject: 'Reset your TCH Global password',
      html: layout('Reset your password', `
  <p style="font-size:15px;line-height:1.6">Hi ${first}, we got a request to reset the password for your TCH Global account.</p>
  <p style="margin:22px 0"><a href="${link}" style="display:inline-block;padding:13px 24px;border-radius:999px;background:#7c3aed;color:#ffffff;font-weight:700;text-decoration:none">Choose a new password</a></p>
  <p style="font-size:13px;line-height:1.6;color:#6b6490">This link works once and expires in 1 hour. If you didn&rsquo;t ask for this, you can ignore this email: your password stays the same.</p>
  <p style="font-size:12px;color:#8a85a3;word-break:break-all">Button not working? Paste this into your browser:<br>${link}</p>`),
    });
    if (!ok) return NextResponse.json({ error: 'We couldn’t send the email just now. Please try again in a few minutes.' }, { status: 502 });
  }
  return NextResponse.json(SENT);
}
