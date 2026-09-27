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

          {christmas && (
            // A soft snow drift along the top of the mark — the
            // Vercel/Next.js-style seasonal treatment: the mark itself
            // never changes, just snow sitting on top of it. Built from
            // overlapping circles along the top arc (simpler and more
            // reliable than a hand-tuned path), with a faint shadow
            // layer underneath for depth.
            <svg viewBox="0 0 50 50" width={50} height={50} style={{ position: 'absolute', top: 0, left: 0 }}>
              <g fill="rgba(10,14,20,0.12)" transform="translate(0.5,1)">
                <circle cx="4" cy="13" r="7" />
                <circle cx="13" cy="3" r="9" />
                <circle cx="25" cy="0" r="11" />
                <circle cx="37" cy="3" r="9" />
                <circle cx="46" cy="13" r="7" />
              </g>
              <g fill="#ffffff">
                <circle cx="4" cy="13" r="7" />
                <circle cx="13" cy="3" r="9" />
                <circle cx="25" cy="0" r="11" />
                <circle cx="37" cy="3" r="9" />
                <circle cx="46" cy="13" r="7" />
              </g>
            </svg>
          )}
        </div>

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
