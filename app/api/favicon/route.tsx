import { ImageResponse } from 'next/og';
import { readFile } from 'fs/promises';
import path from 'path';
import { getAllPosts } from '@/lib/sanity';
import { fallbackPosts } from '@/lib/fallback-posts';
import { isLiveNow } from '@/lib/analytics';

export const runtime = 'nodejs';
// This must stay dynamic: next/og's ImageResponse sets a 1-year
// "immutable" Cache-Control by default, and Next's route cache keys
// solely on the pathname (ignoring query strings) unless the route is
// explicitly opted out of caching — so a cached "not live" render would
// get stuck and never pick up a real status change. Browsers still
// cache favicons client-side and mostly only refetch on navigation, so
// in practice the dot reflects "as of your last page load" either way —
// this just makes sure that load actually re-checks the real status.
export const dynamic = 'force-dynamic';

let logoBase64: string | null = null;
async function getLogoDataUrl() {
  if (!logoBase64) {
    const buf = await readFile(path.join(process.cwd(), 'public/images/logo.jpg'));
    logoBase64 = `data:image/jpeg;base64,${buf.toString('base64')}`;
  }
  return logoBase64;
}

function isChristmasSeason(now: Date) {
  const month = now.getMonth(); // 0-indexed: 11 = December
  const day = now.getDate();
  return month === 11 && day <= 26;
}

export async function GET() {
  const now = new Date();
  const christmas = isChristmasSeason(now);

  const [logoUrl, live, livePosts] = await Promise.all([getLogoDataUrl(), isLiveNow(), getAllPosts()]);

  const posts = livePosts ?? fallbackPosts;
  const latestPublishedAt = posts.reduce<number>((max, p) => {
    const t = new Date(p.publishedAt).getTime();
    return Number.isFinite(t) && t > max ? t : max;
  }, 0);
  const hasFreshPost = latestPublishedAt > 0 && Date.now() - latestPublishedAt < 1000 * 60 * 60 * 24 * 3; // 3 days

  // Live takes priority over "new post" — only one dot shown at a time.
  const dotColor = live ? '#ef4444' : hasFreshPost ? '#22d3ee' : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '64px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: '58px',
            height: '58px',
            borderRadius: '50%',
            overflow: 'hidden',
            display: 'flex',
            border: `4px solid ${christmas ? '#c0392b' : '#f5c542'}`,
            boxSizing: 'border-box',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} width={50} height={50} style={{ objectFit: 'cover' }} alt="" />
        </div>

        {christmas && (
          // A small hand-drawn ornament bauble (plain shapes, no emoji
          // font / external fetch needed — reliable on every request).
          <div style={{ position: 'absolute', top: '-4px', left: '-2px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: '3px', height: '5px', background: '#e8c15a', borderRadius: '1px', display: 'flex' }} />
            <div
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                background: '#2e7d46',
                border: '2px solid #0b0f14',
                boxSizing: 'border-box',
                display: 'flex',
              }}
            />
          </div>
        )}

        {dotColor && (
          <div
            style={{
              position: 'absolute',
              bottom: '0px',
              right: '0px',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: dotColor,
              border: '3px solid #0b0f14',
              display: 'flex',
            }}
          />
        )}
      </div>
    ),
    {
      width: 64,
      height: 64,
      // Short client cache instead of next/og's 1-year default, so a
      // reload during/after a live stream actually picks up the change.
      headers: { 'Cache-Control': 'public, max-age=300' },
    }
  );
}
