// Transactional email via Resend's HTTP API (no SDK needed). Gated like
// the rest of the site's integrations: without RESEND_API_KEY every call
// is a no-op that reports "not configured".
//
// Env vars (set in Vercel):
//   RESEND_API_KEY  — from resend.com → API Keys
//   NOTIFY_EMAIL    — where submissions go; comma-separate several
//   EMAIL_FROM      — e.g. "TCH Global <hello@tchglobal.org>" (domain must be
//                     verified in Resend). Defaults to Resend's test sender,
//                     which can only deliver to the Resend account's own email.

const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || 'TCH Global <onboarding@resend.dev>';

// Before the church has its own domain, Resend can only deliver to the
// account owner. A Gmail account with an app password can email anyone, so
// when SMTP_USER/SMTP_PASS are set we send through Gmail instead.
//   SMTP_USER  e.g. tchglobal.church@gmail.com
//   SMTP_PASS  the 16-letter app password (Google Account → Security → App passwords)
const SMTP_USER = process.env.SMTP_USER?.trim();
const SMTP_PASS = process.env.SMTP_PASS?.replace(/\s+/g, '');
export const smtpConfigured = Boolean(SMTP_USER && SMTP_PASS);
const useSmtp = smtpConfigured && !process.env.EMAIL_FROM;

export const emailConfigured = Boolean(API_KEY) || smtpConfigured;
export const notifyRecipients = (process.env.NOTIFY_EMAIL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Why the last send failed, in plain words (shown on /admin/status). */
export let lastEmailError = '';

async function viaGmail(opts: { to: string[]; subject: string; html: string; replyTo?: string }) {
  try {
    const nodemailer = await import('nodemailer');
    const t = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: SMTP_USER, pass: SMTP_PASS } });
    await t.sendMail({ from: `TCH Global <${SMTP_USER}>`, to: opts.to.join(', '), subject: opts.subject, html: opts.html, replyTo: opts.replyTo });
    return '';
  } catch (err) {
    const e = err as { responseCode?: number; message?: string };
    console.error('Gmail send error:', err);
    return e.responseCode === 535 || /Username and Password not accepted|BadCredentials/i.test(e.message || '')
      ? `Gmail refused the sign-in for ${SMTP_USER}: the app password in SMTP_PASS is wrong or was revoked. Create a new one (Google Account → Security → App passwords) and update SMTP_PASS in Vercel.`
      : `Gmail error: ${(e.message || String(err)).slice(0, 200)}`;
  }
}

async function viaResend(opts: { to: string[]; subject: string; html: string; replyTo?: string }) {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html, reply_to: opts.replyTo }),
    });
    if (res.ok) return '';
    const body = await res.text().catch(() => '');
    console.error('Resend send failed:', res.status, body);
    return res.status === 403 && /testing emails|own email|verify a domain/i.test(body)
      ? 'Resend can only email its own account owner until the church domain is verified. Set SMTP_USER and SMTP_PASS (Gmail app password) so emails reach everyone.'
      : `Resend error ${res.status}: ${body.slice(0, 200)}`;
  } catch (err) {
    console.error('Resend send error:', err);
    return `Resend error: ${String(err).slice(0, 200)}`;
  }
}

/** Sends through the preferred route and falls back to the other one if
 * both are configured, so one broken key doesn't stop every email. */
export async function sendEmail(opts: { to: string[]; subject: string; html: string; replyTo?: string }): Promise<boolean> {
  if (!opts.to.length) return false;
  const order: ('gmail' | 'resend')[] = [];
  if (useSmtp || (!API_KEY && smtpConfigured)) order.push('gmail');
  if (API_KEY) order.push('resend');
  if (smtpConfigured && !order.includes('gmail')) order.push('gmail');
  if (!order.length) { lastEmailError = 'Email isn’t set up: add SMTP_USER and SMTP_PASS (Gmail app password) in Vercel.'; return false; }
  const errors: string[] = [];
  for (const route of order) {
    const err = route === 'gmail' ? await viaGmail(opts) : await viaResend(opts);
    if (!err) { lastEmailError = ''; return true; }
    errors.push(err);
  }
  lastEmailError = errors.join(' Then: ');
  return false;
}

export function layout(title: string, body: string) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1530">
  <div style="font-weight:800;font-size:18px;letter-spacing:.04em;color:#7c3aed">TCH GLOBAL</div>
  <div style="font-size:12px;color:#6b6490;margin-bottom:18px">The Comforter&rsquo;s House Global</div>
  <h2 style="font-size:20px;margin:0 0 12px">${title}</h2>${body}
  <p style="font-size:12px;color:#8a85a3;margin-top:28px">TCH Global &middot; Sun 7:30 &amp; 9:15 AM &middot; Mon Prayer 5:30 PM &middot; Wed 5:30 PM (WAT)</p></div>`;
}

/** Live check for /admin/status: signs in to Gmail (no email sent) or
 * reports the Resend test-sender limit, in plain words. */
export async function verifyEmail(): Promise<{ ok: boolean; detail: string }> {
  if (smtpConfigured) {
    try {
      const nodemailer = await import('nodemailer');
      const t = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: SMTP_USER, pass: SMTP_PASS } });
      await t.verify();
      return { ok: true, detail: `Gmail sign-in works (${SMTP_USER}). Emails reach everyone.` };
    } catch (err) {
      const e = err as { responseCode?: number; message?: string };
      return { ok: false, detail: e.responseCode === 535 || /not accepted|BadCredentials/i.test(e.message || '')
        ? `Gmail REFUSED the sign-in for ${SMTP_USER}: the app password in SMTP_PASS is wrong or was revoked (changing the Google password revokes it). Make a new app password and paste it into SMTP_PASS in Vercel, then redeploy.`
        : `Gmail problem: ${(e.message || String(err)).slice(0, 180)}` };
    }
  }
  if (API_KEY) {
    if (!process.env.EMAIL_FROM) return { ok: false, detail: 'Only Resend’s test sender is set up: it can email the Resend account owner and nobody else (so reset links fail for members). Add SMTP_USER and SMTP_PASS (Gmail app password) in Vercel.' };
    return { ok: true, detail: `Resend with ${process.env.EMAIL_FROM}` };
  }
  return { ok: false, detail: 'Not set up. Add SMTP_USER and SMTP_PASS (Gmail app password) in Vercel.' };
}
