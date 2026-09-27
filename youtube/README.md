# Connecting live YouTube data

Right now the Library section shows 4 placeholder video cards (linking
to `#`). This doc is for turning that into the real, auto-updating
channel feed described in `lib/youtube.ts` — no code changes needed
once it's connected.

## 1. Get a YouTube Data API key (needs your own Google account)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
   and create a project (or use an existing one).
2. **APIs & Services → Library** → search "YouTube Data API v3" →
   Enable.
3. **APIs & Services → Credentials → Create Credentials → API Key.**
   Copy it.
4. (Recommended) Click into the new key and under "API restrictions,"
   restrict it to only the YouTube Data API v3 — keeps it from being
   usable for anything else if it ever leaked.

## 2. Find the channel ID

If the channel's URL looks like `youtube.com/channel/UCxxxxxxxx`, that
`UCxxxxxxxx` string is the channel ID — copy it directly.

If the URL instead looks like `youtube.com/@handlename`, the ID isn't
in the URL. Easiest way to find it: view the channel's page source and
search for `"channelId"`, or use a free lookup tool like
[commentpicker.com/youtube-channel-id.php](https://commentpicker.com/youtube-channel-id.php).

## 3. Add the environment variables

Locally, in `.env.local` (already gitignored, never commit this):

```
YOUTUBE_API_KEY=your-api-key
YOUTUBE_CHANNEL_ID=your-channel-id
```

And the same two in **Vercel → Project Settings → Environment
Variables** so the live site picks them up.

The moment both are set, `lib/youtube.ts` starts returning real
videos — titles, thumbnails, upload dates, working links — and the
Library section on the homepage switches over automatically. No other
code changes required.

## Quota note

YouTube's API has a daily quota (10,000 units/day on the free tier by
default — each request here costs a small handful of units). The
fetch in `lib/youtube.ts` is cached for an hour, so normal traffic
won't come close to that limit.

## What this does NOT do yet

This only pulls the *latest* uploads for display. It does not track
what your own visitors watch or click (that's the "Most Watched /
Trending" feature, which needs the analytics layer, not this).
