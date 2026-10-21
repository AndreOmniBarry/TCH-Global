import 'server-only';
import { sendEmail, emailConfigured, notifyRecipients, layout, escapeHtml } from '@/lib/email';
import { unreportedDead, markReported, expiringDead, stats } from './outbox';

// Option C: when something could not reach SHEP.HRD, a person is told.
// The email carries counts, short ids and types only — never names,
// contacts or prayer text (those stay encrypted; export from /admin/bridge).
const SITE = (process.env.SITE_URL || 'https://tch-global.vercel.app').replace(/\/+$/, '');
const LABEL: Record<string, string> = {
  'member.join': 'Join us', 'care.salvation': 'Salvation', 'prayer.request': 'Prayer request', 'workforce.volunteer': 'Volunteer',
};

export async function sendDigest(): Promise<boolean> {
  if (!emailConfigured) return false;
  const to = Array.from(new Set([...notifyRecipients, ...(process.env.BRIDGE_ALERT_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean)]));
  if (!to.length) return false;
  const [dead, expiring, s] = await Promise.all([unreportedDead(), expiringDead(), stats()]);
  const auth = s.authAlert && Date.now() - s.authAlert < 26 * 3600 * 1000;
  if (!dead.length && !expiring && !auth) return false;
  const rows = dead.slice(0, 50).map((d) => `<tr><td style="padding:4px 12px 4px 0;font-family:monospace">${escapeHtml(d.id.slice(0, 8))}</td><td style="padding:4px 12px 4px 0">${escapeHtml(LABEL[d.type] || d.type)}</td><td style="padding:4px 0;color:#6b6490">${escapeHtml(d.held ? `held: ${d.held}` : `last answer ${String(d.code ?? '-')}`)}</td></tr>`).join('');
  const html = layout('SHEP.HRD hand-off needs a look', `
    ${dead.length ? `<p style="font-size:15px;line-height:1.6">${dead.length} website submission${dead.length === 1 ? '' : 's'} could not be delivered to SHEP.HRD automatically. Nothing is lost: each one is stored securely and was also emailed to the church inbox when it arrived.</p><table style="font-size:13px;border-collapse:collapse">${rows}</table>` : ''}
    ${auth ? '<p style="font-size:15px;line-height:1.6"><strong>SHEP.HRD refused the website&rsquo;s key.</strong> The bridge keys in Vercel and SHEP.HRD no longer match. Messages are waiting and will send once the keys match again.</p>' : ''}
    ${expiring ? `<p style="font-size:15px;line-height:1.6">${expiring} undelivered item${expiring === 1 ? '' : 's'} will be deleted in under 5 days. Export or retry them now.</p>` : ''}
    <p style="font-size:15px"><a href="${SITE}/admin/bridge">Open the SHEP.HRD bridge in admin</a> to retry, release or export (CSV for SHEP.HRD import).</p>`);
  const ok = await sendEmail({ to, subject: 'TCH website → SHEP.HRD: items need attention', html });
  if (ok) await markReported();
  return ok;
}
