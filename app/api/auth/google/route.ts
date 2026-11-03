import { NextRequest, NextResponse } from 'next/server';
import { authConfigured, googleMember, limited, startSession } from '@/lib/auth';
import { googleConfigured, verifyGoogleIdToken } from '@/lib/google';
import { emailConfigured, escapeHtml, layout, notifyRecipients, sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!authConfigured || !googleConfigured) return NextResponse.json({ error: 'Google sign-in isn’t switched on yet.' }, { status: 503 });
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'x';
  if (await limited(`google:${ip}`, 30, 3600)) return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  const { credential } = await req.json().catch(() => ({}));
  const profile = await verifyGoogleIdToken(credential);
  if (!profile) return NextResponse.json({ error: 'Google couldn’t confirm that sign-in. Please try again.' }, { status: 401 });
  const r = await googleMember(profile);
  if (!r) return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  await startSession(r.member.id);
  if (r.created && emailConfigured) {
    const tasks = [sendEmail({ to: [r.member.email], subject: 'Welcome to the TCH Global family', html: layout('Welcome home', `<p style="font-size:15px;line-height:1.6">Hi ${escapeHtml(r.member.name.split(' ')[0])},<br><br>Your TCH Global account is ready, and your <b>My Year in the Word</b> has started counting. Sign in any time with Google.</p>`) })];
    if (notifyRecipients.length) tasks.push(sendEmail({ to: notifyRecipients, subject: 'New member registered (Google) — TCH Global website', html: layout('New member', `<p>${escapeHtml(r.member.name)} &lt;${escapeHtml(r.member.email)}&gt;</p>`) }));
    Promise.all(tasks).catch(() => {});
  }
  return NextResponse.json({ ok: true, member: r.member, created: r.created });
}
