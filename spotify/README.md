# Spotify — and the "YouTube auto-sync" idea

## What's live now

A Spotify button in Media & Streaming (`#media` section) — currently
points at `open.spotify.com`. Once you have a real show URL, swap it
in `app/page.tsx` (search for `open.spotify.com`).

## About auto-syncing YouTube uploads to Spotify

Spotify doesn't accept video, and there's no official pipe that takes
a YouTube upload and republishes it as a Spotify episode automatically
— that direct link doesn't exist as a product feature from either
company.

The realistic path:

1. **Spotify for Podcasters** (free, spotify.com/podcasters) — this is
   how a show actually gets onto Spotify. It hosts an audio RSS feed
   that Spotify (and Apple Podcasts, and everything else) pulls from.
2. **Audio extraction + automation** — a tool like Zapier or Make.com
   can watch your YouTube channel for new uploads, pull just the audio
   track, and push it to Spotify for Podcasters automatically. This is
   a real, working setup many churches use — but it's a separate
   subscription/automation to configure (roughly 30–60 minutes of
   one-time setup), not a toggle in this codebase.
3. **Manual middle ground** — until that's worth setting up, uploading
   the audio to Spotify for Podcasters by hand after each service
   takes a few minutes and needs no new tooling at all.

Happy to wire up the Zapier/Make automation when you're ready — just
say the word and I'll walk you through the account setup (needs your
own Spotify for Podcasters login, same reasoning as the YouTube API
key: it has to be tied to the church's own account, not mine).
