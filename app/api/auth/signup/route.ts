import { NextRequest, NextResponse } from 'next/server';
import { authConfigured, createMember, createGuardianLink, startSession, EMAIL_RE, limited } from '@/lib/auth';
import { SITE_URL } from '@/lib/site';
import { submitForm } from '@/lib/forms';
import { sendEmail, emailConfigured, notifyRecipients, layout, escapeHtml } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!authConfigured) return NextResponse.json({ error: 'Accounts are not available yet.' }, { status: 503 });
  const { name, email, password, newsletter, phone, website, under18, birthYear, guardianEmail } = await req.json().catch(() => ({}));
  if (typeof website === 'string' && website) return NextResponse.json({ ok: true });
  if (typeof name !== 'string' || name.trim().length < 2) return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 });
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) return NextResponse.json({ error: 'That email address doesn’t look right.' }, { status: 400 });
  if (typeof password !== 'string' || password.length < 8) return NextResponse.json({ error: 'Use a password of at least 8 characters.' }, { status: 400 });
  // Under 18: 13-17 may have their own account once a parent/guardian is
  // named (they get a notice and can remove it); 12 and under are added by a
  // parent as a child profile instead, so we never hold a child's email.
  let teen: { birthYear: number; guardianEmail: string } | undefined;
  if (under18 === true || under18 === 'on') {
    const y = Number(birthYear);
    const age = new Date().getFullYear() - y;
    if (!Number.isInteger(y) || age < 0 || age > 19) return NextResponse.json({ error: 'Choose the year you were born.' }, { status: 400 });
    if (age < 13) return NextResponse.json({ error: 'Under 13? Ask a parent or guardian to add you as a child on their free account: your stars and Bible adventures will count there.', code: 'under13' }, { status: 400 });
    if (age < 18) {
      const g = typeof guardianEmail === 'string' ? guardianEmail.trim().toLowerCase() : '';
      if (!EMAIL_RE.test(g)) return NextResponse.json({ error: 'Add a parent or guardian’s email so we can let them know.' }, { status: 400 });
      if (g === email.trim().toLowerCase()) return NextResponse.json({ error: 'Use your parent or guardian’s own email, not yours.' }, { status: 400 });
      teen = { birthYear: y, guardianEmail: g };
    }
  }
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'x';
  if (await limited(`signup:${ip}`, 8, 3600)) return NextResponse.json({ error: 'Too many sign-ups from this connection. Try again later.' }, { status: 429 });

  const r = await createMember({ name, email, password, newsletter: newsletter !== false, phone: typeof phone === 'string' ? phone : undefined, teen });
  if ('error' in r) return NextResponse.json({ error: r.error }, { status: 409 });
  await startSession(r.member.id);
  if (r.member.newsletter) submitForm('newsletter', { email: r.member.email, source: 'account-signup' }).catch(() => {});
  if (emailConfigured) {
    const tasks = [sendEmail({ to: [r.member.email], subject: 'Welcome to the TCH Global family', html: layout('Welcome home', `<p style="font-size:15px;line-height:1.6">Hi ${escapeHtml(r.member.name)},<br><br>Your TCH Global account is ready. You can now comment on the blog, keep your PUDLIB! library in sync, and receive new messages by email.</p>`) })];
    if (teen) {
      const link = `${SITE_URL}/account/guardian?t=${encodeURIComponent(await createGuardianLink(r.member.email))}`;
      const who = escapeHtml(r.member.name.split(' ')[0]);
      tasks.push(sendEmail({ to: [teen.guardianEmail], subject: `${r.member.name.split(' ')[0]} joined TCH Global`, html: layout('A note for parents and guardians', `<p style="font-size:15px;line-height:1.6">${who} just created a free account on the TCH Global website and named you as their parent or guardian.</p>
<p style="font-size:15px;line-height:1.6">With it they can follow the Daily Drop, listen to messages in PUDLIB!, and get a private <b>My Year in the Word</b> recap. We keep only their name, email and birth year. Nothing they do is public, and comments are moderated by our team.</p>
<p style="font-size:15px;line-height:1.6">If you&rsquo;re happy with this, there&rsquo;s nothing to do. If not, you can remove the account straight away:</p>
<p style="margin:20px 0"><a href="${link}" style="display:inline-block;padding:12px 22px;border-radius:999px;background:#1a1530;color:#ffffff;font-weight:700;text-decoration:none">Review or remove ${who}&rsquo;s account</a></p>
<p style="font-size:13px;color:#6b6490">Questions? Reply to this email or write to info@tchglobal.org.</p>`) }));
    }
    if (notifyRecipients.length) tasks.push(sendEmail({ to: notifyRecipients, subject: 'New member registered — TCH Global website', html: layout('New member', `<p>${escapeHtml(r.member.name)} &lt;${escapeHtml(r.member.email)}&gt;</p>`) }));
    Promise.all(tasks).catch(() => {});
  }
  return NextResponse.json({ ok: true, member: r.member });
}
