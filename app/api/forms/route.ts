import { NextRequest, NextResponse } from 'next/server';
import { submitForm, FormType, formsConfigured } from '@/lib/forms';
import { sendEmail, emailConfigured, notifyRecipients, escapeHtml, layout } from '@/lib/email';

const LABELS: Record<FormType, string> = {
  volunteer: 'Volunteer interest',
  prayer: 'Prayer request',
  join: 'Membership / Join us',
  give: 'Giving intent',
  testimony: 'Testimony',
  newsletter: 'Newsletter sign-up',
};

const CONFIRMATIONS: Partial<Record<FormType, { subject: string; body: string }>> = {
  newsletter: { subject: 'Welcome to TCH Global', body: 'Thank you for subscribing. Every Sunday&rsquo;s reflection will arrive here the moment it is published.' },
  volunteer: { subject: 'Thank you for offering to serve', body: 'We received your interest in serving at TCH Global. A team lead will reach out to you soon.' },
  join: { subject: 'Welcome home', body: 'Thank you for taking the next step. Someone from our membership team will follow up with you about next steps.' },
  give: { subject: 'We received your giving intent', body: 'Thank you for your generosity. Our finance team will reach out with secure giving instructions. No payment has been processed.' },
};

async function notify(type: FormType, fields: Record<string, string>) {
  if (!emailConfigured) return false;
  const rows = Object.entries(fields)
    .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#6b6490;vertical-align:top;text-transform:capitalize">${escapeHtml(k)}</td><td style="padding:6px 0;white-space:pre-wrap">${escapeHtml(v)}</td></tr>`)
    .join('');
  const replyTo = fields.email && EMAIL_RE.test(fields.email) ? fields.email : undefined;
  const tasks: Promise<boolean>[] = [];
  if (notifyRecipients.length) {
    tasks.push(sendEmail({ to: notifyRecipients, subject: `New ${LABELS[type]} — TCH Global website`, html: layout(`New ${LABELS[type]}`, `<table style="font-size:14px;border-collapse:collapse">${rows}</table>`), replyTo }));
  }
  const conf = CONFIRMATIONS[type];
  if (conf && replyTo) {
    tasks.push(sendEmail({ to: [replyTo], subject: conf.subject, html: layout(conf.subject, `<p style="font-size:15px;line-height:1.6">${fields.name ? `Hi ${escapeHtml(fields.name)},<br><br>` : ''}${conf.body}</p>`) }));
  }
  const results = await Promise.all(tasks);
  return results[0] === true;
}

const REQUIRED_FIELDS: Record<FormType, string[]> = {
  volunteer: ['name', 'email', 'team'],
  prayer: ['message'],
  join: ['name', 'email'],
  give: ['name', 'email'],
  testimony: ['name', 'quote'],
  newsletter: ['email'],
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isFormType(value: unknown): value is FormType {
  return typeof value === 'string' && value in REQUIRED_FIELDS;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, fields, website } = body || {};

    // Honeypot: a hidden field real visitors never see or fill. A bot
    // that fills every field trips it — reply success so it doesn't
    // learn anything, but don't store the submission.
    if (typeof website === 'string' && website.trim()) {
      return NextResponse.json({ ok: true });
    }

    if (!isFormType(type)) {
      return NextResponse.json({ error: 'Unknown form type.' }, { status: 400 });
    }

    const cleanFields: Record<string, string> = {};
    if (fields && typeof fields === 'object') {
      for (const [key, value] of Object.entries(fields)) {
        if (typeof value === 'string') cleanFields[key] = value.trim().slice(0, 4000);
      }
    }

    for (const required of REQUIRED_FIELDS[type]) {
      if (!cleanFields[required]) {
        return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 });
      }
    }

    if (cleanFields.email && !EMAIL_RE.test(cleanFields.email)) {
      return NextResponse.json({ error: 'That email address doesn’t look right — please check it.' }, { status: 400 });
    }

    const [result, emailed] = await Promise.all([
      formsConfigured ? submitForm(type, cleanFields) : Promise.resolve({ ok: false, error: undefined as string | undefined }),
      notify(type, cleanFields),
    ]);
    if (!result.ok && !emailed) {
      const fallback = formsConfigured ? result.error : "This form isn't connected yet — please email info@tchglobal.org directly for now.";
      return NextResponse.json({ error: fallback || 'Could not save your submission right now.' }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
