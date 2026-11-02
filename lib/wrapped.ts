// "My Year in the Word": a member's year (or month) at TCH Global, told
// back to them. The same shape feeds the story cards (components/wrapped)
// and the email (wrappedEmail below), so what they see on the site and in
// their inbox always agrees.

export type Wrapped = {
  name: string;
  period: string; // "2026" or "October 2026"
  minutes: number;
  days: number;
  streak: number;
  /** One value (0-4) per week of the period: how active that week was. */
  weeks: number[];
  topMessages: { title: string; series?: string; plays: number }[];
  topSeries: { title: string; parts: number; finished: number };
  reads: { posts: number; topTopic: string; book?: string; /** Teens: Daily Drop tasks finished. */ drops?: number };
  /** Children on the parent's account and their Bible-adventure stars. */
  family?: { name: string; stars: number; days: number }[];
  prayers: { prayed: number; testimonies: number };
  persona: { name: string; line: string };
  /** Share of members they listened more than (0-100). */
  topPercent: number;
  blessing: { text: string; verse: string; ref: string };
};

// Sample data for the demo only: realistic, but nobody's real activity.
export const SAMPLE_WRAPPED: Wrapped = {
  name: 'Ada',
  period: '2026',
  minutes: 2346,
  days: 148,
  streak: 23,
  weeks: [1, 2, 0, 3, 2, 4, 3, 1, 2, 3, 4, 4, 2, 1, 0, 2, 3, 3, 4, 2, 1, 3, 4, 3, 2, 2, 3, 4, 4, 3, 2, 1, 2, 3, 3, 4, 4, 2, 3, 4, 3, 2, 4, 4, 3, 2, 3, 4, 4, 3, 2, 4],
  topMessages: [
    { title: 'The Trinitarian Benediction II', series: 'The Trinitarian Benediction', plays: 6 },
    { title: 'Walking in Faith When You Can’t See the Way', plays: 5 },
    { title: 'The Trinitarian Benediction I', series: 'The Trinitarian Benediction', plays: 4 },
    { title: 'The Word of God', plays: 4 },
    { title: 'The Comforter Has Come', plays: 3 },
  ],
  topSeries: { title: 'The Trinitarian Benediction', parts: 6, finished: 4 },
  reads: { posts: 31, topTopic: 'Faith', book: 'Understanding the Faith Life' },
  family: [{ name: 'Tobi', stars: 212, days: 61 }, { name: 'Kamsi', stars: 148, days: 44 }],
  prayers: { prayed: 64, testimonies: 19 },
  persona: { name: 'The Early Riser', line: 'Most of your listening happened before 7am, the first voice you heard each day was the Word.' },
  topPercent: 7,
  blessing: {
    text: 'May the grace of our Lord Jesus Christ, the love of God, and the fellowship of the Holy Spirit be with you all through the year ahead.',
    verse: 'Your word is a lamp to my feet and a light to my path.',
    ref: 'Psalm 119:105',
  },
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const fmt = (n: number) => n.toLocaleString('en-NG');

/** The email: dark, brand-coloured, readable in any inbox (tables + inline
 * styles only), with the highlights and one button to the full story. */
export function wrappedEmail(w: Wrapped, storyUrl: string): { subject: string; html: string } {
  const subject = `${w.name}, your ${w.period} in the Word is ready`;
  const stat = (big: string, small: string) =>
    `<td style="padding:14px 10px;text-align:center;background:#16112e;border-radius:14px"><div style="font:800 26px/1.1 Arial,Helvetica,sans-serif;color:#ffffff">${big}</div><div style="font:12px/1.4 Arial,Helvetica,sans-serif;color:#a9a3c9;margin-top:4px">${small}</div></td>`;
  const top = w.topMessages.slice(0, 3).map((m, i) =>
    `<tr><td style="padding:8px 0;font:700 15px Arial,Helvetica,sans-serif;color:#22d3ee;width:28px">${i + 1}</td><td style="padding:8px 0;font:15px/1.4 Arial,Helvetica,sans-serif;color:#ffffff">${esc(m.title)}<div style="font-size:12px;color:#a9a3c9">${m.plays} ${m.plays === 1 ? 'play' : 'plays'}</div></td></tr>`).join('');
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#0b0816">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0816"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#0f0b22;border-radius:24px;overflow:hidden">
<tr><td style="padding:32px 28px 8px;background:linear-gradient(135deg,#7c3aed,#22d3ee)">
  <div style="font:800 13px Arial,Helvetica,sans-serif;letter-spacing:.18em;color:rgba(255,255,255,.85)">TCH GLOBAL</div>
  <div style="font:800 34px/1.05 Arial,Helvetica,sans-serif;color:#ffffff;margin:14px 0 6px">My ${esc(w.period)}<br>in the Word</div>
  <div style="font:15px/1.5 Arial,Helvetica,sans-serif;color:rgba(255,255,255,.9);padding-bottom:22px">${esc(w.name)}, here is your ${esc(w.period)} with God's Word at TCH Global.</div>
</td></tr>
<tr><td style="padding:22px 20px 6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="8"><tr>${stat(fmt(w.minutes), 'minutes in the Word')}${stat(String(w.days), 'days you showed up')}${stat(String(w.streak), 'day streak')}</tr></table></td></tr>
<tr><td style="padding:14px 28px 4px"><div style="font:800 13px Arial,Helvetica,sans-serif;letter-spacing:.14em;color:#a9a3c9">YOUR TOP MESSAGES</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px">${top}</table></td></tr>
${w.family?.length ? `<tr><td style="padding:10px 28px 0"><div style="background:#16112e;border-radius:16px;padding:16px 18px;font:15px/1.6 Arial,Helvetica,sans-serif;color:#ffffff"><div style="font:800 12px Arial,Helvetica,sans-serif;letter-spacing:.14em;color:#f5c542;margin-bottom:6px">YOUR FAMILY&rsquo;S ADVENTURES</div>${w.family.map((f) => `${esc(f.name)} collected <b>${fmt(f.stars)} stars</b> over ${f.days} ${f.days === 1 ? 'day' : 'days'}`).join('<br>')}</div></td></tr>` : ''}
<tr><td style="padding:14px 28px"><div style="font:15px/1.6 Arial,Helvetica,sans-serif;color:#ffffff">You were <b>${esc(w.persona.name)}</b>. ${esc(w.persona.line)}</div></td></tr>
<tr><td style="padding:6px 28px 26px"><div style="background:#16112e;border-radius:16px;padding:18px 18px;font:italic 15px/1.6 Georgia,serif;color:#f6f3ff">&ldquo;${esc(w.blessing.verse)}&rdquo;<div style="font:700 12px Arial,Helvetica,sans-serif;font-style:normal;color:#22d3ee;margin-top:8px">${esc(w.blessing.ref)}</div></div></td></tr>
<tr><td align="center" style="padding:0 28px 30px"><a href="${esc(storyUrl)}" style="display:inline-block;padding:15px 28px;border-radius:999px;background:#22d3ee;color:#04263a;font:800 15px Arial,Helvetica,sans-serif;text-decoration:none">See your full story</a></td></tr>
<tr><td style="padding:16px 28px 26px;border-top:1px solid #241d44;font:12px/1.6 Arial,Helvetica,sans-serif;color:#8a85a3">Made only for you from your own activity on tch-global.vercel.app while signed in. Nobody else can see it. Prefer not to get these? Turn off &ldquo;My Year in the Word&rdquo; emails in your account.</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, html };
}
