import { kv } from '@vercel/kv';
import { SiteHeader, SiteFooter } from '@/components/SiteChrome';
import AdminNav from '@/components/AdminNav';
import { sanityClient } from '@/lib/sanity';
import { writeClient } from '@/lib/sanity-write';
import { getChannelId, getLatestVideos } from '@/lib/youtube';

export const metadata = { title: 'System status | TCH Global Admin', robots: { index: false } };
export const dynamic = 'force-dynamic';

type Check = { name: string; ok: boolean | null; detail: string; unlocks: string };

async function timed<T>(fn: () => Promise<T>, ms = 6000): Promise<T> {
  return Promise.race([fn(), new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timed out')), ms))]);
}

async function run(): Promise<Check[]> {
  const out: Check[] = [];
  const kvOn = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  if (!kvOn) out.push({ name: 'Database (Redis / KV)', ok: false, detail: 'KV_REST_API_URL / KV_REST_API_TOKEN not set', unlocks: 'Accounts, sign-in, comments, forms, analytics, playlists sync' });
  else {
    try {
      await timed(() => kv.set('health:ping', Date.now(), { ex: 60 }));
      const members = await timed(() => kv.zcard('members'));
      out.push({ name: 'Database (Redis / KV)', ok: true, detail: `Connected · ${members} registered member${members === 1 ? '' : 's'}`, unlocks: 'Accounts, sign-in, comments, forms, analytics, playlists sync' });
    } catch (e) { out.push({ name: 'Database (Redis / KV)', ok: false, detail: `Set but not reachable: ${(e as Error).message}`, unlocks: 'Accounts, sign-in, comments, forms, analytics' }); }
  }
  // Sanity: translate the usual failures into the exact fix.
  const hint = (m: string) => /401|403|unauthori|permission|private/i.test(m)
    ? `${m}. The dataset is private: add SANITY_API_WRITE_TOKEN (or a Viewer token as SANITY_API_READ_TOKEN) in Vercel, or make the dataset public in sanity.io/manage → Datasets.`
    : /not found|404|project/i.test(m) ? `${m}. Check NEXT_PUBLIC_SANITY_PROJECT_ID (kqruklk1) and NEXT_PUBLIC_SANITY_DATASET (production).` : m;
  try {
    const n = sanityClient ? await timed(() => sanityClient!.fetch<{ posts: number; kids: number; all: number }>('{"posts": count(*[_type == "post"]), "kids": count(*[_type == "kidsStory"]), "all": count(*[!(_id in path("drafts.**"))])}')) : null;
    out.push({ name: 'Sanity (reading content)', ok: n !== null, detail: n ? `Connected · ${n.all} published document${n.all === 1 ? '' : 's'} · ${n.posts} blog post${n.posts === 1 ? '' : 's'} · ${n.kids} kids stor${n.kids === 1 ? 'y' : 'ies'}` : 'Project ID missing', unlocks: 'Blog, events, testimonies, audio, books, hero spotlight, kids stories' });
  } catch (e) { out.push({ name: 'Sanity (reading content)', ok: false, detail: hint((e as Error).message), unlocks: 'Blog, events, testimonies, kids stories' }); }
  if (!writeClient) out.push({ name: 'Sanity write token', ok: false, detail: 'SANITY_API_WRITE_TOKEN not set. Create it at sanity.io/manage → API → Tokens → Add API token → Editor, then add it in Vercel (Production) and redeploy.', unlocks: '/write publishing & scheduling, adding events, spotlight uploads, publishing testimonies' });
  else {
    try {
      // A dry-run mutation proves the token can write, not just read.
      await timed(() => writeClient!.createOrReplace({ _id: 'health.ping', _type: 'healthPing', at: new Date().toISOString() }, { dryRun: true }));
      out.push({ name: 'Sanity write token', ok: true, detail: 'Token accepted with write access', unlocks: '/write publishing, events, spotlight, testimonies' });
    } catch (e) {
      const m = (e as Error).message;
      out.push({ name: 'Sanity write token', ok: false, detail: /permission|403|insufficient/i.test(m) ? `${m}. The token is read-only: create a new one with the Editor role.` : `Token rejected: ${m}. Create a fresh Editor token and replace it in Vercel.`, unlocks: '/write publishing, events, spotlight, testimonies' });
    }
  }
  const hook = kvOn ? await kv.get<{ at: number; type: string }>('webhook:last').catch(() => null) : null;
  const fail = kvOn ? await kv.get<{ at: number; got: string; want: string }>('webhook:fail').catch(() => null) : null;
  const failNote = fail && (!hook || fail.at > hook.at) ? ` Last attempt ${Math.round((Date.now() - fail.at) / 60000)} min ago was refused: the webhook URL sent ${fail.got}, Vercel expects ${fail.want}.` : '';
  const ago = hook ? Math.round((Date.now() - hook.at) / 60000) : 0;
  out.push({ name: 'Sanity auto-refresh (webhook)', ok: !process.env.SANITY_REVALIDATE_SECRET ? null : hook ? true : false,
    detail: !process.env.SANITY_REVALIDATE_SECRET ? 'SANITY_REVALIDATE_SECRET not set. Studio changes appear within a few minutes instead of seconds.'
      : hook ? `Last refresh received ${ago < 1 ? 'just now' : ago < 120 ? `${ago} min ago` : `${Math.round(ago / 60)} h ago`} (${hook.type})`
      : failNote ? `Refused.${failNote} Make both the same.` : 'Secret is set, but no refresh has arrived from Sanity yet. In sanity.io/manage → API → Webhooks, open the webhook → Attempts: 401 means the secret in the URL differs from Vercel; 404 means a wrong URL. Pages still refresh on their own within a minute.',
    unlocks: 'Studio publishes appear on the site instantly' });
  out.push({ name: 'Admin / publishing password', ok: Boolean(process.env.WRITE_PASSWORD), detail: process.env.WRITE_PASSWORD ? 'WRITE_PASSWORD is set' : 'WRITE_PASSWORD not set', unlocks: 'Admin pages, /write' });
  {
    const smtp = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
    const domain = Boolean(process.env.EMAIL_FROM);
    out.push({ name: 'Emails', ok: smtp || (Boolean(process.env.RESEND_API_KEY) && domain) ? true : process.env.RESEND_API_KEY ? false : false,
      detail: domain && process.env.RESEND_API_KEY ? `Resend with your domain · from ${process.env.EMAIL_FROM} · alerts to ${process.env.NOTIFY_EMAIL || '(NOTIFY_EMAIL not set)'}`
        : smtp ? `Sending through Gmail (${process.env.SMTP_USER}) · reaches everyone · alerts to ${process.env.NOTIFY_EMAIL || '(NOTIFY_EMAIL not set)'}`
        : process.env.RESEND_API_KEY ? 'Resend test sender: only reaches the Resend account owner. Add SMTP_USER and SMTP_PASS (Gmail app password) so visitors and the Pastor get emails too.'
        : 'Not set up. Add SMTP_USER and SMTP_PASS (Gmail app password).',
      unlocks: 'Submission alerts, welcome, thank-you and salvation emails, teen questions to the Pastor' });
  }
  out.push({ name: 'Teens private questions', ok: Boolean(process.env.PASTOR_EMAIL && (process.env.RESEND_API_KEY || (process.env.SMTP_USER && process.env.SMTP_PASS))), detail: process.env.PASTOR_EMAIL ? `Go only to the Pastor's inbox${process.env.EMAIL_FROM || (process.env.SMTP_USER && process.env.SMTP_PASS) ? '' : '. Note: add the Gmail sender (SMTP_USER/SMTP_PASS) or a domain so it can reach the Pastor'}` : 'PASTOR_EMAIL not set. Questions are refused until it is.', unlocks: 'Ask anything (No judgement zone) on /teens' });
  // Ask Google directly so a refused key shows Google's own reason.
  let ytErr = '';
  if (process.env.YOUTUBE_API_KEY) {
    try {
      const r = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=%40TheComfortersHouseGlobalMin&key=${process.env.YOUTUBE_API_KEY.trim()}`, { cache: 'no-store' });
      if (!r.ok) { const j = await r.json().catch(() => null); ytErr = `Google refused the key (${r.status}): ${j?.error?.message ?? r.statusText}`; }
    } catch (e) { ytErr = `Could not reach Google: ${(e as Error).message}`; }
  }
  if (ytErr) out.push({ name: 'YouTube API key', ok: false, detail: ytErr, unlocks: 'PUDLIB! videos, /live, latest message' });
  try {
    const [id, vids] = await Promise.all([timed(() => getChannelId()), timed(() => getLatestVideos(3))]);
    out.push({ name: 'YouTube', ok: Boolean(id && vids?.length), detail: id ? (vids?.length ? `Channel ${id} · ${vids.length} latest videos found${process.env.YOUTUBE_API_KEY ? '' : ' (free RSS feed; add YOUTUBE_API_KEY for reliability)'}` : `Channel ${id} found, but no videos came back. ${process.env.YOUTUBE_API_KEY ? 'The API key may be wrong or restricted: check it in Google Cloud.' : 'YouTube blocks its free feed from some servers: add a YOUTUBE_API_KEY (free, from Google Cloud).'}`) : 'Could not resolve the channel from @TheComfortersHouseGlobalMin', unlocks: 'PUDLIB! videos, /live, latest message' });
  } catch (e) { out.push({ name: 'YouTube', ok: false, detail: (e as Error).message, unlocks: 'PUDLIB! videos, /live' }); }
  out.push({ name: 'Instagram & TikTok', ok: true, detail: process.env.NEXT_PUBLIC_INSTAGRAM_URL || 'instagram.com/tchglobalmin · tiktok.com/@tchglobal', unlocks: 'Instagram buttons' });
  out.push({ name: 'Spotify podcast link', ok: process.env.NEXT_PUBLIC_SPOTIFY_SHOW_URL ? true : null, detail: process.env.NEXT_PUBLIC_SPOTIFY_SHOW_URL || 'Not set (Spotify buttons hidden)', unlocks: 'Spotify buttons' });
  return out;
}

export default async function StatusPage() {
  const checks = await run();
  const good = checks.filter((c) => c.ok).length;
  return (
    <>
      <SiteHeader />
      <main className="section">
        <div className="container" style={{ maxWidth: 860 }}>
          <AdminNav current="/admin/status" />
          <div className="section-header">
            <span className="eyebrow">Admin</span>
            <h2 style={{ textTransform: 'none', fontSize: '1.8rem' }}>System status</h2>
            <p>{good} of {checks.length} connected. Checked live just now.</p>
            <form method="post" action="/admin/api/refresh" style={{ marginTop: 14 }}>
              <button type="submit" className="btn btn-primary">Refresh site content now</button>
              <span style={{ marginLeft: 12, fontSize: '.85rem', opacity: .7 }}>Use this if a Studio change hasn&rsquo;t appeared yet.</span>
            </form>
          </div>
          <div className="st-list">
            {checks.map((c) => (
              <div key={c.name} className={`st-row st-row--${c.ok === null ? 'na' : c.ok ? 'ok' : 'bad'}`}>
                <span className="st-dot" aria-hidden="true" />
                <div><strong>{c.name}</strong><span>{c.detail}</span><em>Unlocks: {c.unlocks}</em></div>
                <b>{c.ok === null ? 'Optional' : c.ok ? 'Working' : 'Needs setup'}</b>
              </div>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
