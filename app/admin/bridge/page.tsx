import { SiteHeader, SiteFooter } from '@/components/SiteChrome';
import AdminNav from '@/components/AdminNav';
import BridgeAdmin from './BridgeAdmin';
import { bridgeConfigured, bridgeKillSwitch, bridgeMissing, listItems, stats } from '@/lib/bridge/outbox';
import { encryptionKeyBad } from '@/lib/bridge/crypto';

export const metadata = { title: 'SHEP.HRD bridge | TCH Global Admin', robots: { index: false } };
export const dynamic = 'force-dynamic';

const LABEL: Record<string, string> = {
  'member.join': 'Join us', 'care.salvation': 'Salvation', 'prayer.request': 'Prayer request', 'workforce.volunteer': 'Volunteer',
};

function ago(t?: number | null) {
  if (!t) return 'never';
  const m = Math.round((Date.now() - t) / 60000);
  return m < 1 ? 'just now' : m < 120 ? `${m} min ago` : m < 2880 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
}

export default async function BridgePage() {
  const kvOn = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  const [s, pending, dead] = kvOn
    ? await Promise.all([
      stats().catch(() => null),
      listItems('pending').catch((e) => { console.error('bridge page pending', (e as Error).message); return []; }),
      listItems('dead').catch((e) => { console.error('bridge page dead', (e as Error).message); return []; }),
    ])
    : [null, [], []];
  const row = (i: { id: string; type: string; createdAt: number; attempts: number; lastCode?: number | string; held?: string }) => ({
    id: i.id, type: LABEL[i.type] || i.type, created: ago(i.createdAt), attempts: i.attempts, last: i.lastCode == null ? '' : String(i.lastCode), held: i.held || '',
  });
  return (
    <>
      <SiteHeader />
      <main className="section">
        <div className="container" style={{ maxWidth: 940 }}>
          <AdminNav current="/admin/bridge" />
          <div className="section-header">
            <span className="eyebrow">Admin</span>
            <h2 style={{ textTransform: 'none', fontSize: '1.8rem' }}>SHEP.HRD bridge</h2>
            <p>Website sign-ups the visitor agreed to share go to SHEP.HRD: Join us, salvation, prayer and volunteer. Every one is also emailed to the church inbox the moment it arrives, so nothing depends on this link alone.</p>
          </div>
          <BridgeAdmin
            configured={bridgeConfigured}
            paused={bridgeKillSwitch}
            missing={bridgeMissing()}
            keyBad={encryptionKeyBad}
            stats={s ? { pending: s.pending, dead: s.dead, delivered: s.delivered, lastOk: ago(s.lastOk), lastErr: s.lastErr ? `${s.lastErr.code} · ${ago(s.lastErr.at)}` : '', authAlert: Boolean(s.authAlert) } : null}
            pending={pending.map(row)}
            dead={dead.map(row)}
            log={(s?.log || []).map((l) => ({ id: l.id.slice(0, 8), type: LABEL[l.type] || l.type, status: l.status, code: l.code == null ? '' : String(l.code), at: ago(l.at) }))}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
