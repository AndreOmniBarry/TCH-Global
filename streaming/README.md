# Live streaming on the website — roadmap notes

## Can we embed the live stream directly on the site?

Yes — this is straightforward and worth doing. YouTube Live supports
an embeddable player pointed at your channel that automatically shows
whatever is live right now (and falls back to your latest upload when
nothing's live). That's a simple `iframe` on the homepage or a
dedicated `/live` page, no new infrastructure needed — just the
channel ID we already have configured.

Facebook Live embeds work similarly via Facebook's Page Plugin, but
require the Facebook page to have "allow embedding" turned on, and
generally perform worse for viewers than the YouTube embed (Facebook's
embed SDK is heavier and more prone to the loading issues you're
already seeing).

**Recommendation:** embed the YouTube Live player as the primary
on-site experience, and keep the Facebook Live link as a secondary
"also streaming here" button — not embedded. This is a small, real
next step and I can build it whenever you're ready.

## Will embedding on our website fix the buffering?

Only partly, and it's important to be honest about which part it
fixes and which it doesn't:

- **What an embed CAN fix:** keeping viewers on tchglobal.org instead
  of bouncing to youtube.com or facebook.com removes one layer of
  friction/ads/algorithm distraction, and gives a cleaner, on-brand
  viewing experience.
- **What an embed CANNOT fix:** the buffering itself. Buffering
  happens upstream — at the point of broadcast, meaning either (a) the
  church's internet upload speed at the point of streaming, or (b) the
  encoder/streaming software settings (bitrate set too high for the
  available upload bandwidth is the single most common cause). YouTube
  and Facebook are both just replaying whatever bitrate they received
  from the source — a website embed is still pulling from that same
  YouTube/Facebook stream, so if the source is buffering, the embed
  buffers too.

**The real fix for buffering** is almost always one of:
1. Lower the streaming encoder's output bitrate to match the venue's
   actual upload speed (most common fix — a common mistake is setting
   1080p/6000kbps on a connection that only has 3-4 Mbps upload).
   YouTube's own bitrate calculator or the encoder software (OBS,
   Restream, etc.) can help pick the right number.
2. A dedicated/wired internet connection for the stream, not shared
   Wi-Fi with the congregation's phones.
3. A streaming service like Restream or Switchboard Live that takes
   one upload from the venue and pushes it out to YouTube, Facebook,
   *and* the website simultaneously with encoding tuned per platform
   — this is the "smart way" you're describing, and is the standard
   setup for churches doing multi-platform live streaming well.

Happy to help set up a Restream-style multistream + the on-site
YouTube Live embed together — that combination is the one that
actually solves both problems (one stream out to everywhere, plus a
clean on-site viewing experience) rather than just moving the same
buffering problem onto a new page.
