# TCH Global: where we are (11 Oct 2026)

Live: https://tch-global.vercel.app · Production branch: `claude/tch-global-church-site-g7adxm`
Check anything at **/admin/status**.

## Done and working
- Sanity: reading, Editor write token, auto-refresh webhook (`/api/revalidate`), CORS origin added
- Database (Upstash KV): sign-up, sign-in, comments, forms all tested; 1 member registered
- Admin password (`WRITE_PASSWORD`)
- Resend: key set, alerts go to couragegaganwonyi@gmail.com (test sender only)
- Kids: 128 everyday stories (no repeat until 27 Feb 2027), Christmas and Easter series,
  Going deeper and Say it out loud on every story, Kids Story type in /studio

## Next, in order
1. **YouTube (needs setup):** channel found but 0 videos. Add a free `YOUTUBE_API_KEY`
   (Google Cloud → YouTube Data API v3 → Credentials → API key) in Vercel, then redeploy.
   A second free feed fallback was pushed (586452e); check whether it already fixes it.
2. **Emails to visitors:** need our own domain verified in Resend (Domains → Add domain → DNS
   records), then `EMAIL_FROM = TCH Global <hello@domain>` in Vercel. Question open: do we own a domain?
3. **Books and audio:** publish in /studio (Book, Audio Message), or send the list to add.
4. **Small details to send:** Instagram link, Spotify link, church phone number, Pastor's bio and photo.
5. **Giving (Paystack), last:** church Paystack account (CAC documents), then build the Give page
   (one-off and monthly, tithe/offering/building/missions).

## Reference: Database setup (if it ever shows Needs setup)
Vercel → Storage → Create Database → Upstash for Redis (free) → Connect to tch-global → redeploy.

## Reference: Resend setup
resend.com → API Keys → Create (Sending access) → Vercel: `RESEND_API_KEY`, `NOTIFY_EMAIL`
(`EMAIL_FROM` only after the domain is verified) → redeploy.

## Also outstanding
- Have the Pastor or children's team review the kids stories
- Sanity Growth trial ends in about 17 days; check the Free plan limits before then
