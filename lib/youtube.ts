// YouTube Data API v3 — server-side only. Runs on the server (never in
// the browser bundle) so the API key is never exposed to visitors.
//
// Gated the same way lib/sanity.ts is gated: if YOUTUBE_API_KEY and
// YOUTUBE_CHANNEL_ID aren't set, every function here returns null and
// callers fall back to placeholder content. The moment both env vars
// are set (locally in .env.local, or in Vercel's project settings),
// this starts returning real data — no code changes needed.
//
// Setup: see /sanity/README.md's sibling doc youtube/README.md for the
// exact steps to get a key and channel ID.

export type YouTubeVideo = {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  url: string;
};

const API_KEY = process.env.YOUTUBE_API_KEY;
// The church channel. The handle is what people see; the UC... id is what
// YouTube's feeds and embeds need, so it's looked up from the handle once
// (and cached) unless YOUTUBE_CHANNEL_ID pins it.
export const CHANNEL_HANDLE = '@TheComfortersHouseGlobalMin';
export const CHANNEL_URL = `https://www.youtube.com/${CHANNEL_HANDLE}`;
let resolvedId: string | null = process.env.YOUTUBE_CHANNEL_ID || null;

export async function getChannelId(): Promise<string | null> {
  if (resolvedId) return resolvedId;
  try {
    if (API_KEY) {
      const r = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(CHANNEL_HANDLE)}&key=${API_KEY}`, { next: { revalidate: 86400 } });
      const id = r.ok ? (await r.json()).items?.[0]?.id : null;
      if (id) return (resolvedId = id);
    }
    const r = await fetch(CHANNEL_URL, { headers: { 'Accept-Language': 'en' }, next: { revalidate: 86400 } });
    const html = await r.text();
    const id = html.match(/"externalId":"(UC[\w-]{22})"/)?.[1] || html.match(/channel\/(UC[\w-]{22})/)?.[1] || null;
    if (id) resolvedId = id;
    return id;
  } catch (err) {
    console.error('YouTube channel lookup failed:', err);
    return null;
  }
}

// In-memory cache so a burst of concurrent page loads doesn't each fire
// their own API call and burn through the daily quota. Next.js's own
// fetch cache (next: { revalidate }) handles this too, but this is a
// belt-and-suspenders fallback for environments where that's bypassed.
let cache: { data: YouTubeVideo[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — comfortably under the API's daily quota even with traffic

// Parses YouTube's ISO 8601 duration format (e.g. "PT1H2M3S") into seconds.
function parseIsoDurationSeconds(duration?: string): number | undefined {
  if (!duration) return undefined;
  const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return undefined;
  const [, h, m, s] = match;
  return (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0);
}

// No-API-key fallback: every channel publishes its latest ~15 uploads as
// a public RSS feed. Used when YOUTUBE_API_KEY is missing or rejected.
async function getVideosFromFeed(limit: number): Promise<YouTubeVideo[] | null> {
  const CHANNEL_ID = await getChannelId();
  if (!CHANNEL_ID) return null;
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(CHANNEL_ID)}`, { next: { revalidate: 1800 } });
    if (!res.ok) throw new Error(`feed ${res.status}`);
    const xml = await res.text();
    const decode = (t: string) => t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
    const videos = Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g))
      .map((m) => {
        const e = m[1];
        const id = e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
        const title = e.match(/<title>([^<]*)<\/title>/)?.[1];
        const link = e.match(/<link rel="alternate" href="([^"]+)"/)?.[1] ?? '';
        if (!id || !title || link.includes('/shorts/')) return null;
        return {
          id,
          title: decode(title),
          thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
          publishedAt: e.match(/<published>([^<]+)<\/published>/)?.[1] ?? '',
          url: `https://www.youtube.com/watch?v=${id}`,
        };
      })
      .filter((v): v is YouTubeVideo => v !== null);
    return videos.slice(0, limit);
  } catch (err) {
    console.error('YouTube feed fallback failed:', err);
    return null;
  }
}

export async function getLatestVideos(limit = 6): Promise<YouTubeVideo[] | null> {
  const CHANNEL_ID = await getChannelId();
  if (!CHANNEL_ID) return null;
  if (!API_KEY) return getVideosFromFeed(limit);

  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data.slice(0, limit);
  }

  try {
    // Step 1: resolve the channel's "uploads" playlist ID.
    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${API_KEY}`,
      { next: { revalidate: 3600 } }
    );
    if (!channelRes.ok) throw new Error(`channels lookup failed: ${channelRes.status}`);
    const channelData = await channelRes.json();
    const uploadsPlaylistId = channelData?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsPlaylistId) throw new Error('no uploads playlist found for this channel ID');

    // Step 2: pull the most recent items from that playlist. Fetch extra
    // (up to the API max of 50) since Shorts get filtered out below and
    // we still need enough regular videos left to satisfy `limit`.
    const fetchCount = 50;
    const playlistRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${fetchCount}&key=${API_KEY}`,
      { next: { revalidate: 3600 } }
    );
    if (!playlistRes.ok) throw new Error(`playlistItems lookup failed: ${playlistRes.status}`);
    const playlistData = await playlistRes.json();

    const items = (playlistData.items || []).filter((item: any) => item.snippet?.resourceId?.videoId);
    const videoIds: string[] = items.map((item: any) => item.snippet.resourceId.videoId);
    if (videoIds.length === 0) {
      cache = { data: [], fetchedAt: Date.now() };
      return [];
    }

    // Step 3: look up each video's duration so Shorts (roughly <= 3
    // minutes and typically vertical) can be excluded — the
    // playlistItems response doesn't include duration at all.
    const detailsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds.join(',')}&key=${API_KEY}`,
      { next: { revalidate: 3600 } }
    );
    if (!detailsRes.ok) throw new Error(`videos lookup failed: ${detailsRes.status}`);
    const detailsData = await detailsRes.json();
    const durationById = new Map<string, number>(
      (detailsData.items || []).map((v: any) => [v.id, parseIsoDurationSeconds(v.contentDetails?.duration)])
    );

    const SHORTS_MAX_SECONDS = 180; // Shorts run up to ~3 minutes; regular messages run far longer.

    const videos: YouTubeVideo[] = items
      .filter((item: any) => {
        const seconds = durationById.get(item.snippet.resourceId.videoId);
        return seconds === undefined || seconds > SHORTS_MAX_SECONDS;
      })
      .map((item: any) => ({
        id: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        thumbnail:
          item.snippet.thumbnails?.high?.url ||
          item.snippet.thumbnails?.medium?.url ||
          item.snippet.thumbnails?.default?.url,
        publishedAt: item.snippet.publishedAt,
        url: `https://www.youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
      }));

    cache = { data: videos, fetchedAt: Date.now() };
    return videos.slice(0, limit);
  } catch (err) {
    console.error('YouTube API failed, trying the public channel feed:', err);
    return getVideosFromFeed(limit);
  }
}
