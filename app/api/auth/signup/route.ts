import { NextRequest, NextResponse } from 'next/server';
import { authConfigured, createMember, startSession, EMAIL_RE, limited } from '@/lib/auth';
import { submitForm } from '@/lib/forms';
import { sendEmail, emailConfigured, notifyRecipients, layout, escapeHtml } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!authConfigured) return NextResponse.json({ error: 'Accounts are not available yet.' }, { status: 503 });
  const { name, email, password, newsletter, phone, website } = await req.json().catch(() => ({}));
  if (typeof website === 'string' && website) return NextResponse.json({ ok: true });
  if (typeof name !== 'string' || name.trim().length < 2) return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 });
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) return NextResponse.json({ error: 'That email address doesn’t look right.' }, { status: 400 });
  if (typeof password !== 'string' || password.length < 8) return NextResponse.json({ error: 'Use a password of at least 8 characters.' }, { status: 400 });
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'x';
  if (await limited(`signup:${ip}`, 8, 3600)) return NextResponse.json({ error: 'Too many sign-ups from this connection. Try again later.' }, { status: 429 });

  const r = await createMember({ name, email, password, newsletter: newsletter !== false, phone: typeof phone === 'string' ? phone : undefined });
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: 409 });
  await startSession(r.member.id);
  if (r.member.newsletter) submitForm('newsletter', { email: r.member.email, source: 'account-signup' }).catch(() => {});
  if (emailConfigured) {
    const tasks = [sendEmail({ to: [r.member.email], subject: 'Welcome to the TCH Global family', html: layout('Welcome home', `<p style="font-size:15px;line-height:1.6">Hi ${escapeHtml(r.member.name)},<br><br>Your TCH Global account is ready. You can now comment on the blog, keep your PUDLIB! library in sync, and receive new messages by email.</p>`) })];
    if (notifyRecipients.length) tasks.push(sendEmail({ to: notifyRecipients, subject: 'New member registered — TCH Global website', html: layout('New member', `<p>${escapeHtml(r.member.name)} &lt;${escapeHtml(r.member.email)}&gt;</p>`) }));
    Promise.all(tasks).catch(() => {});
  }
  return NextResponse.json({ ok: true, member: r.member });
}
