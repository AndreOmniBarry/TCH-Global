import { NextRequest, NextResponse } from 'next/server';
import { authConfigured, createMember, createGuardianLink, startSession, EMAIL_RE, limited } from '@/lib/auth';
import { SITE_URL } from '@/lib/site';
import { submitForm } from '@/lib/forms';
import { sendEmail, emailConfigured, notifyRecipients, layout, escapeHtml } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!authConfigured) return NextResponse.json({ error: 'Accounts are not available yet.' }, { status: 503 });
  const { name, email, password, newsletter, phone, website, loveforce, guardianEmail } = await req.json().catch(() => ({}));
  if (typeof website === 'string' && website) return NextResponse.json({ ok: true });
  if (typeof name !== 'string' || name.trim().length < 2) return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 });
  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) return NextResponse.json({ error: 'That email address doesn’t look right.' }, { status: 400 });
  if (typeof password !== 'string' || password.length < 8) return NextResponse.json({ error: 'Use a password of at least 8 characters.' }, { status: 400 });
  // TCH Loveforce (teens) connect a parent or guardian, who gets a warm
  // welcome (and a quiet way to tell us if it isn't theirs).
  let teen: { guardianEmail: string } | undefined;
  if (loveforce === true) {
    const g = typeof guardianEmail === 'string' ? guardianEmail.trim().toLowerCase() : '';
    if (!EMAIL_RE.test(g)) return NextResponse.json({ error: 'Add a parent or guardian’s email to connect with.' }, { status: 400 });
    if (g === email.trim().toLowerCase()) return NextResponse.json({ error: 'Use your parent or guardian’s own email, not yours.' }, { status: 400 });
    teen = { guardianEmail: g };
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
      const first = r.member.name.split(' ')[0];
      const who = escapeHtml(first);
      tasks.push(sendEmail({ to: [teen.guardianEmail], subject: `${first} has joined TCH Loveforce`, html: layout(`${who} has joined TCH Loveforce`, `<p style="font-size:15px;line-height:1.6">Good news: ${who} has joined <b>TCH Loveforce</b>, the teens ministry of TCH Global, and asked us to connect you.</p>
<p style="font-size:15px;line-height:1.6">Each day there&rsquo;s a short Daily Drop (a Bible passage, a question to think about and a quick challenge), and messages from Pastor Uzor in PUDLIB!. Everything ${who} does builds a private <b>Year in the Word</b> that only they can see. Comments are reviewed by our team before they appear.</p>
<p style="margin:22px 0"><a href="${SITE_URL}/account?mode=signup" style="display:inline-block;padding:13px 24px;border-radius:999px;background:#7c3aed;color:#ffffff;font-weight:700;text-decoration:none">Join TCH Global too</a></p>
<p style="font-size:13px;line-height:1.6;color:#6b6490">Not ${who}&rsquo;s parent or guardian, or have a concern? <a href="${link}" style="color:#6b6490">Let us know here</a> or reply to this email.</p>`) }));
    }
    if (notifyRecipients.length) tasks.push(sendEmail({ to: notifyRecipients, subject: 'New member registered — TCH Global website', html: layout('New member', `<p>${escapeHtml(r.member.name)} &lt;${escapeHtml(r.member.email)}&gt;</p>`) }));
    Promise.all(tasks).catch(() => {});
  }
  return NextResponse.json({ ok: true, member: r.member });
}
