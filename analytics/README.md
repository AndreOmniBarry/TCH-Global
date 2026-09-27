# Connecting real view analytics ("Most Watched" / "Trending")

Right now, no view counts show anywhere on the blog — the code is
written but inactive until you provision storage. This is a Vercel
dashboard click, not a code change.

## 1. Create the KV store (in Vercel, needs your account)

1. Open your project on [vercel.com](https://vercel.com)
2. Go to the **Storage** tab → **Create Database** → choose **KV**
   (this is a small, fast key-value store — perfect for view counters,
   and Vercel's free tier easily covers a church blog's traffic)
3. Name it (e.g. `tch-global-analytics`) → Create
4. Click **Connect Project** and select this project

That's it — Vercel automatically adds the required environment
variables (`KV_REST_API_URL`, `KV_REST_API_TOKEN`, etc.) to your
project. No manual copying needed.

## 2. Redeploy

The next deploy after connecting KV will pick up the new environment
variables automatically. From that point on:

- Every blog post view is recorded silently in the background
- Post pages show a real "N reads" count next to the byline
- The blog listing page shows a "Trending This Week" row once at
  least one post has been read in the last 7 days

## What counts as a "view"

Once per page load of a post (not per scroll, not per click — a
simple page-view ping, matching what most analytics tools call a
"pageview"). It fires via `navigator.sendBeacon`, so it's reliable
even if someone reads for two seconds and immediately navigates away.

## What this does NOT do yet

- No per-visitor tracking or identity — this counts views, not unique
  people or their behavior. Good enough for "what's popular," not
  built as a surveillance tool.
- No admin dashboard UI yet showing the numbers in one place — right
  now they surface inline (the "N reads" count, the Trending row).
  A dedicated `/admin/analytics` page summarizing everything is a
  reasonable next step once this is live and generating real data.
- Comment counts and shares aren't tracked yet — only reads.
