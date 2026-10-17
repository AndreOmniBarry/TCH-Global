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

export async function sendEmail(opts: { to: string[]; subject: string; html: string; replyTo?: string }): Promise<boolean> {
  if (!opts.to.length) return false;
  if (useSmtp || (!API_KEY && smtpConfigured)) {
    try {
      const nodemailer = await import('nodemailer');
      const t = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: SMTP_USER, pass: SMTP_PASS } });
      await t.sendMail({ from: `TCH Global <${SMTP_USER}>`, to: opts.to.join(', '), subject: opts.subject, html: opts.html, replyTo: opts.replyTo });
      return true;
    } catch (err) {
      console.error('Gmail send error:', err);
      return false;
    }
  }
  if (!API_KEY) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html, reply_to: opts.replyTo }),
    });
    if (!res.ok) console.error('Resend send failed:', res.status, await res.text().catch(() => ''));
    return res.ok;
  } catch (err) {
    console.error('Resend send error:', err);
    return false;
  }
}

export function layout(title: string, body: string) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1530">
  <div style="font-weight:800;font-size:18px;letter-spacing:.04em;color:#7c3aed">TCH GLOBAL</div>
  <div style="font-size:12px;color:#6b6490;margin-bottom:18px">The Comforter&rsquo;s House Global</div>
  <h2 style="font-size:20px;margin:0 0 12px">${title}</h2>${body}
  <p style="font-size:12px;color:#8a85a3;margin-top:28px">TCH Global &middot; Sun 7:30 &amp; 9:15 AM &middot; Mon Prayer 5:30 PM &middot; Wed 5:30 PM (WAT)</p></div>`;
}
