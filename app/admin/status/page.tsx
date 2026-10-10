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
  try {
    const n = sanityClient ? await timed(() => sanityClient!.fetch<number>('count(*[_type == "post"])')) : null;
    out.push({ name: 'Sanity (reading content)', ok: n !== null, detail: n !== null ? `Connected · ${n} blog post${n === 1 ? '' : 's'}` : 'Project ID missing', unlocks: 'Blog, events, testimonies, audio, books, hero spotlight' });
  } catch (e) { out.push({ name: 'Sanity (reading content)', ok: false, detail: (e as Error).message, unlocks: 'Blog, events, testimonies' }); }
  if (!writeClient) out.push({ name: 'Sanity write token', ok: false, detail: 'SANITY_API_WRITE_TOKEN not set (Production)', unlocks: '/write publishing & scheduling, adding events, spotlight uploads, publishing testimonies' });
  else {
    try {
      await timed(() => writeClient!.fetch('count(*[_type == "spotlight"])'));
      out.push({ name: 'Sanity write token', ok: true, detail: 'Token accepted', unlocks: '/write publishing, events, spotlight, testimonies' });
    } catch (e) { out.push({ name: 'Sanity write token', ok: false, detail: `Token rejected: ${(e as Error).message}`, unlocks: '/write publishing, events, spotlight, testimonies' }); }
  }
  out.push({ name: 'Admin / publishing password', ok: Boolean(process.env.WRITE_PASSWORD), detail: process.env.WRITE_PASSWORD ? 'WRITE_PASSWORD is set' : 'WRITE_PASSWORD not set', unlocks: 'Admin pages, /write' });
  out.push({ name: 'Emails (Resend)', ok: Boolean(process.env.RESEND_API_KEY), detail: process.env.RESEND_API_KEY ? `Key set · alerts to ${process.env.NOTIFY_EMAIL || '(NOTIFY_EMAIL not set)'} · from ${process.env.EMAIL_FROM || 'Resend test sender (only reaches your own inbox)'}` : 'RESEND_API_KEY not set', unlocks: 'Submission alerts, welcome, thank-you and salvation emails' });
  try {
    const [id, vids] = await Promise.all([timed(() => getChannelId()), timed(() => getLatestVideos(3))]);
    out.push({ name: 'YouTube', ok: Boolean(id && vids?.length), detail: id ? `Channel ${id} · ${vids?.length ?? 0} latest video${vids?.length === 1 ? '' : 's'} found` : 'Could not resolve the channel from @TheComfortersHouseGlobalMin', unlocks: 'PUDLIB! videos, /live, latest message' });
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
