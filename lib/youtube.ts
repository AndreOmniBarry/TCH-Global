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
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

// In-memory cache so a burst of concurrent page loads doesn't each fire
// their own API call and burn through the daily quota. Next.js's own
// fetch cache (next: { revalidate }) handles this too, but this is a
// belt-and-suspenders fallback for environments where that's bypassed.
let cache: { data: YouTubeVideo[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — comfortably under the API's daily quota even with traffic

export async function getLatestVideos(limit = 6): Promise<YouTubeVideo[] | null> {
  if (!API_KEY || !CHANNEL_ID) return null;

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

    // Step 2: pull the most recent items from that playlist.
    const playlistRes = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${Math.max(limit, 6)}&key=${API_KEY}`,
      { next: { revalidate: 3600 } }
    );
    if (!playlistRes.ok) throw new Error(`playlistItems lookup failed: ${playlistRes.status}`);
    const playlistData = await playlistRes.json();

    const videos: YouTubeVideo[] = (playlistData.items || []).map((item: any) => ({
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
    console.error('YouTube fetch failed, caller should fall back to placeholder content:', err);
    return null;
  }
}
