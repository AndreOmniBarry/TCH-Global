import { NextRequest, NextResponse } from 'next/server';
import { submitForm, FormType, formsConfigured } from '@/lib/forms';
import { sendEmail, emailConfigured, notifyRecipients, escapeHtml, layout } from '@/lib/email';
import { waitUntil } from '@vercel/functions';
import { limited } from '@/lib/auth';
import { toEnvelope } from '@/lib/bridge/messages';
import { enqueue, deliver, drain, bridgeConfigured, bridgeKillSwitch } from '@/lib/bridge/outbox';

const LABELS: Record<FormType, string> = {
  volunteer: 'Volunteer interest',
  prayer: 'Prayer request',
  join: 'Membership / Join us',
  give: 'Giving intent',
  testimony: 'Testimony',
  newsletter: 'Newsletter sign-up',
  salvation: 'Prayed the prayer of salvation',
  teens: 'TCH Teens (question or squad sign-up)',
};

const CONFIRMATIONS: Partial<Record<FormType, { subject: string; body: string }>> = {
  newsletter: { subject: 'Welcome to TCH Global', body: 'Thank you for subscribing. Every Sunday&rsquo;s reflection will arrive here the moment it is published.' },
  volunteer: { subject: 'Thank you for offering to serve', body: 'We received your interest in serving at TCH Global. A team lead will reach out to you soon.' },
  join: { subject: 'Welcome home', body: 'Thank you for taking the next step. Someone from our membership team will follow up with you about next steps.' },
  salvation: { subject: 'Welcome to the family of God', body: 'What a joyful decision. Heaven is rejoicing over you, and so are we. Pastor Uzor and our team will reach out to pray with you and help you take your next steps. Until then, read the Gospel of John and talk to God every day. He hears you.' },
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
  salvation: ['name'],
  teens: ['kind'],
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isFormType(value: unknown): value is FormType {
  return typeof value === 'string' && value in REQUIRED_FIELDS;
}

const MAX_BODY = 16 * 1024;
const MAX_FIELDS = 20;

// Cloudflare Turnstile (optional): only checked when the secret is set.
async function humanCheck(token: unknown, ip: string): Promise<boolean | null> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return null;
  if (typeof token !== 'string' || !token || token.length > 2048) return false;
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(4000),
    });
    const j = (await r.json()) as { success?: boolean };
    return j.success === true;
  } catch {
    return false;
  }
}

// SHEP.HRD hand-off (docs/shep-bridge). Runs only with the visitor's
// consent. Stored durably before we answer; a suspected bot or a flood is
// parked for a human instead of reaching the church office's queues.
async function bridge(type: FormType, fields: Record<string, string>, ip: string, elapsed: number, token: unknown) {
  // With the kill switch on, messages still queue safely; they just wait.
  if (!bridgeConfigured) return;
  const env = toEnvelope(type, fields);
  if (!env) return;
  let held: string | undefined;
  const human = await humanCheck(token, ip);
  if (human === false) held = 'failed human check';
  else if (elapsed > 0 && elapsed < 1500) held = 'filled too fast';
  else if (await limited(`bridge:hour:${type}:${new Date().toISOString().slice(0, 13)}`, 60, 3600)) held = 'hourly cap reached';
  if (!(await enqueue(env, held)) || held || bridgeKillSwitch) return;
  await Promise.race([deliver(env.id), new Promise((r) => setTimeout(r, 4000))]).catch(() => {});
  // Anything older still waiting: a few, after the response.
  waitUntil(drain(3, 8000).catch(() => undefined));
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY) return NextResponse.json({ error: 'That is too long to send. Please shorten it.' }, { status: 413 });
    const body = JSON.parse(raw);
    const { type, fields, website, t, cf } = body || {};
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'x';

    // Honeypot: a hidden field real visitors never see or fill. A bot
    // that fills every field trips it — reply success so it doesn't
    // learn anything, but don't store the submission.
    if (typeof website === 'string' && website.trim()) {
      return NextResponse.json({ ok: true });
    }

    if (!isFormType(type)) {
      return NextResponse.json({ error: 'Unknown form type.' }, { status: 400 });
    }

    if (await limited(`form:${ip}`, 20, 600)) {
      return NextResponse.json({ error: 'Too many messages from this connection. Please wait a few minutes.' }, { status: 429 });
    }

    const cleanFields: Record<string, string> = {};
    if (fields && typeof fields === 'object') {
      for (const [key, value] of Object.entries(fields).slice(0, MAX_FIELDS)) {
        if (typeof value === 'string' && /^[a-z_]{1,24}$/i.test(key)) cleanFields[key] = value.trim().slice(0, 4000);
      }
    }

    for (const required of REQUIRED_FIELDS[type]) {
      if (!cleanFields[required]) {
        return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 });
      }
    }

    if (type === 'salvation' && !cleanFields.phone && !cleanFields.email) {
      return NextResponse.json({ error: 'Leave a phone number or email so we can reach you.' }, { status: 400 });
    }
    if (cleanFields.email && !EMAIL_RE.test(cleanFields.email)) {
      return NextResponse.json({ error: 'That email address doesn’t look right — please check it.' }, { status: 400 });
    }

    // TCH Teens "Ask anything": private. Goes only to the Pastor's own
    // inbox (PASTOR_EMAIL). Never stored on the site, never copied to the
    // general NOTIFY_EMAIL, never shown in /admin.
    if (type === 'teens' && cleanFields.kind === 'question') {
      const pastor = (process.env.PASTOR_EMAIL || '').split(',').map((x) => x.trim()).filter(Boolean);
      if (!emailConfigured || !pastor.length) {
        return NextResponse.json({ error: 'Private questions are being set up. Please talk to a TCH Teens leader in person for now.' }, { status: 503 });
      }
      const anon = !cleanFields.name || /^anonymous$/i.test(cleanFields.name);
      const sent = await sendEmail({
        to: pastor,
        subject: `Private question from a teen${anon ? ' (anonymous)' : ` (${cleanFields.name.slice(0, 40)})`}`,
        html: layout('A private TCH Teens question', `<p style="font-size:13px;color:#6b6490;margin:0 0 14px">Sent from the No judgement zone on the TCH Teens page. This was not saved on the website and went to you alone.</p><p style="font-size:16px;line-height:1.65;white-space:pre-wrap;margin:0 0 14px">${escapeHtml(cleanFields.question || '')}</p><p style="font-size:13px;color:#6b6490;margin:0">From: ${anon ? 'Anonymous' : escapeHtml(cleanFields.name)}</p>`),
      });
      if (!sent) return NextResponse.json({ error: 'That didn’t send. Please try again in a moment.' }, { status: 503 });
      return NextResponse.json({ ok: true });
    }

    const [result, emailed] = await Promise.all([
      formsConfigured ? submitForm(type, cleanFields) : Promise.resolve({ ok: false, error: undefined as string | undefined }),
      notify(type, cleanFields),
    ]);
    if (!result.ok && !emailed) {
      const fallback = formsConfigured ? result.error : "This form isn't connected yet — please email info@tchglobal.org directly for now.";
      return NextResponse.json({ error: fallback || 'Could not save your submission right now.' }, { status: 503 });
    }
    // Never fails the visitor's submission: the church already has it.
    await bridge(type, cleanFields, ip, typeof t === 'number' ? t : 0, cf).catch((e) => console.error('bridge', (e as Error).name));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
