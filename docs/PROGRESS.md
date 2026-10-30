# TCH Global: where we are (13 Oct 2026)

Live: https://tch-global.vercel.app · Production branch: `claude/tch-global-church-site-g7adxm`
Check anything at **/admin/status**.

## Done and working
- Sanity: reading, Editor write token, auto-refresh webhook (`/api/revalidate`), CORS origin added
- Database (Upstash KV): sign-up, sign-in, comments, forms all tested; 1 member registered
- Admin password (`WRITE_PASSWORD`)
- Resend: key set, alerts go to couragegaganwonyi@gmail.com (test sender only)
- Kids: 128 everyday stories (no repeat until 27 Feb 2027), Christmas and Easter series,
  Going deeper and Say it out loud on every story, Kids Story type in /studio

## Added since 11 Oct
- PUDLIB! audio: full Now Playing screen (sleep timer, up next, save/share), Bulk audio upload in /studio
- Sanity reads capped at 60s + "Refresh site content now" button on /admin/status
- Kids/Teens pages now change every day (rendered per visit, DayGuard reload past midnight)
- TCH Teens Daily drop: own story, journal prompt, rapid-fire trivia, books in order, fill the verse, XP levels
- Teens "Ask anything" goes ONLY to `PASTOR_EMAIL` (not stored, not in /admin)

## 14 Oct
- YouTube key: added to Vercel as `YOUTUBE_API_KEY` (Production + Preview), from project living-word-499614 (API key 1, restricted to YouTube Data API v3).

## 15 Oct
- YouTube: key is trimmed before use; /admin/status shows Google's exact error in a "YouTube API key" row
  if the key is refused. Check that row next.

## 17–18 Oct
- Instagram (instagram.com/tchglobalmin) and TikTok (@tchglobal) buttons; brand-tinted liquid glass
- Hero world-time ticker: Nigeria, Ghana, Kenya, South Africa, UK, Germany, US East, Canada, US West
- Gmail sender (SMTP_USER/SMTP_PASS) so emails reach everyone before the domain
- Sanity webhook was failing with 401 Bad secret; secret reset to a lowercase value in Vercel and the webhook URL
- Spotify cover: docs/brand/tch-spotify-cover-3000.jpg

## 18 Oct: /admin/status 9/10
- Working: database, Sanity read/write, webhook, admin password, Gmail emails, teens private
  questions, YouTube, Instagram & TikTok. Only Spotify left (optional, no podcast yet).
- Fixed: splash stuck over /admin/submissions; spotlight shows whole posters; phone numbers added;
  Give bank card ready in lib/giving.ts (waiting for account details).

## 19–20 Oct
- Blog heading: two rows, typewriter second line with caret (sized to its column)
- Hero billboard: TCH + typed word (GLOBAL ~6.5s, then 3 variations ~3.2s each), rolling cube
- Fixed: caret wrapping, phrases cut off, text below jumping when the word changed

## Next, in order
0. **Set `PASTOR_EMAIL`** in Vercel. Resend only reaches the Resend account owner until a domain is
   verified, so either verify a domain or create the Resend account with the Pastor's email.
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

## 21–22 Oct: SHEP.HRD bridge
- Security review first (24 required fixes), then built to it. Website side: commits d40853e, 4326553, 2349b66.
  SHEP.HRD side: shepherd-app branch claude/tch-website-bridge (83e97c2), cross-checked: signature,
  host, timestamps, schema and status codes match.
- Join us, salvation, prayer (anonymous) and volunteer go to SHEP.HRD only when the visitor ticks the
  consent box. Teens, giving, testimonies and newsletter are never shared.
- Encrypted outbox, retries for 24 h, then "Need a person" in /admin/bridge with an email alert
  (counts only). Signed flush endpoint plus a daily Vercel cron; cron-job.org every 10 min recommended.
- Admin logins now expire after 72 h. /admin/bridge can make the secrets in the browser.
- To switch on: follow docs/shep-bridge/SETUP.md (merge the SHEP branch, run SQL 84, church id,
  secrets, env vars on both Vercel projects, redeploy, cron-job.org, test with Join us).

## 27–28 Oct: bridge live, water buttons, phones, bank
- SHEP.HRD bridge live: test connection passes (www.justshephrd.com), cron-job.org flush every 10 min,
  first 2 Join us sign-ups delivered after fixing SHEP's first_timers.assigned_to foreign key
  (docs/shep-bridge/sql/85_first_timers_assigned_to_users.sql; copy into shepherd-app/scripts).
- Buttons: simulated water (height field), consistent behaviour across all buttons.
- Phone fields: flag + country code picker everywhere; stored as +234 803…
- Give: GTBank 0168368717, Sterling 0101421732 (account name pending).
- Waiting on: Spotify show link, exact bank account name, why web sign-ups don't show in SHEP's
  First timers screen (branch filter vs branch_id null).

## 28–30 Oct: water, hero brick, parallax, glitches
- Water buttons rebuilt (components/decor/CrystalLiquid.tsx): Canvas 2D, level tied to scroll position
  (empty below the screen, full at the top, drains in step), simulated surface, live caustic web,
  still glass reflection, travelling glints, no CSS glare. TikTok: black liquid, cyan/pink split edges.
  About 2.3 ms per frame for every button together.
- Hero brick (public/js/main.js): lit 3D block ~1.35x the last letter, rolls letter to letter, waits by
  the caret between words, fixed-step springs so it never runs away on slow frames.
- Parallax: CSS scroll-driven animations (compositor), bounded; script fallback with the same limits.
- Blank-section fix: reveal script now picks up blocks React rebuilds after load.
- Give: account numbers unbroken, Nigeria flag + NGN notice, account name added.
- Still waiting on: Spotify show link; Supabase query so web sign-ups show on SHEP's First timers screen.
