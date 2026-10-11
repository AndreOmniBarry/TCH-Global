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
  out.push({ name: 'Sanity auto-refresh (webhook)', ok: process.env.SANITY_REVALIDATE_SECRET ? true : null, detail: process.env.SANITY_REVALIDATE_SECRET ? 'Secret set. Make sure the webhook in sanity.io/manage → API → Webhooks points to /api/revalidate?secret=…' : 'SANITY_REVALIDATE_SECRET not set. Without it, Studio changes appear within 10 minutes instead of seconds.', unlocks: 'Studio publishes appear on the site instantly' });
  out.push({ name: 'Admin / publishing password', ok: Boolean(process.env.WRITE_PASSWORD), detail: process.env.WRITE_PASSWORD ? 'WRITE_PASSWORD is set' : 'WRITE_PASSWORD not set', unlocks: 'Admin pages, /write' });
  out.push({ name: 'Emails (Resend)', ok: Boolean(process.env.RESEND_API_KEY), detail: process.env.RESEND_API_KEY ? `Key set · alerts to ${process.env.NOTIFY_EMAIL || '(NOTIFY_EMAIL not set)'} · from ${process.env.EMAIL_FROM || 'Resend test sender (only reaches your own inbox)'}` : 'RESEND_API_KEY not set', unlocks: 'Submission alerts, welcome, thank-you and salvation emails' });
  try {
    const [id, vids] = await Promise.all([timed(() => getChannelId()), timed(() => getLatestVideos(3))]);
    out.push({ name: 'YouTube', ok: Boolean(id && vids?.length), detail: id ? (vids?.length ? `Channel ${id} · ${vids.length} latest videos found${process.env.YOUTUBE_API_KEY ? '' : ' (free RSS feed; add YOUTUBE_API_KEY for reliability)'}` : `Channel ${id} found, but no videos came back. ${process.env.YOUTUBE_API_KEY ? 'The API key may be wrong or restricted: check it in Google Cloud.' : 'YouTube blocks its free feed from some servers: add a YOUTUBE_API_KEY (free, from Google Cloud).'}`) : 'Could not resolve the channel from @TheComfortersHouseGlobalMin', unlocks: 'PUDLIB! videos, /live, latest message' });
  } catch (e) { out.push({ name: 'YouTube', ok: false, detail: (e as Error).message, unlocks: 'PUDLIB! videos, /live' }); }
  out.push({ name: 'Instagram link', ok: Boolean(process.env.NEXT_PUBLIC_INSTAGRAM_URL), detail: process.env.NEXT_PUBLIC_INSTAGRAM_URL || 'Not set (button goes to instagram.com)', unlocks: 'Instagram buttons' });
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
