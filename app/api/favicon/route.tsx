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
            border: '4px solid #f5c542',
            boxSizing: 'border-box',
            position: 'relative',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} width={50} height={50} style={{ objectFit: 'cover' }} alt="" />
        </div>

        {christmas && (
          // A Santa hat worn on the badge, tilted and draping off the
          // top-right edge like it's actually sitting on top of a round
          // object — drawn over the full canvas (not clipped to the
          // inner circle) so the droop and pom-pom can hang past the
          // ring naturally.
          <svg
            viewBox="0 0 64 64"
            width={64}
            height={64}
            style={{ position: 'absolute', top: 0, left: 0 }}
          >
            <path
              d="M9,19 C6,2 22,-8 33,3 C42,12 44,22 52,32 C58,40 60,46 55,49 C50,52 46,44 42,36 C36,24 24,14 14,18 Z"
              fill="#c8393c"
              stroke="#0b0f14"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <path
              d="M8,19 A27,27 0 0,1 45,27"
              fill="none"
              stroke="#0b0f14"
              strokeWidth="10.5"
              strokeLinecap="round"
              opacity="0.4"
            />
            <path
              d="M8,19 A27,27 0 0,1 45,27"
              fill="none"
              stroke="#ffffff"
              strokeWidth="9"
              strokeLinecap="round"
            />
            <circle cx="55" cy="49" r="6.5" fill="#ffffff" stroke="#0b0f14" strokeWidth="1.2" />
          </svg>
        )}

        {dotColor && (
          <div
            style={{
              position: 'absolute',
              bottom: '0px',
              left: '0px',
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
