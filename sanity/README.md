# Connecting the real CMS (Sanity)

The blog works right now with zero setup — every post is seeded in
`lib/fallback-posts.ts` and the site builds and runs without any
external account. This document is for when you're ready to let a
non-technical handler actually post, edit, and delete content.

The Studio (the actual editor — rich text, images, publish button) is
**embedded directly in this site** at `/studio`, powered by
`sanity.config.ts` and `app/studio/[[...tool]]/page.tsx`. There's no
separate `sanity.studio` site to manage — whoever logs in at
`tchglobal.org/studio` with an invited Sanity account gets the full
editor, on your own domain.

## 1. Set the Project ID

From the Sanity dashboard (sanity.io/manage), your **Project ID** is
already `kqruklk1` (dataset `production`). Add these two variables in
**Vercel → Project Settings → Environment Variables** (Preview and
Production both):

```
NEXT_PUBLIC_SANITY_PROJECT_ID=kqruklk1
NEXT_PUBLIC_SANITY_DATASET=production
```

For local development, put the same two lines in a `.env.local` file
at the repo root (already gitignored, never commit it).

The moment `NEXT_PUBLIC_SANITY_PROJECT_ID` is set, `lib/sanity.ts`
automatically starts querying real Sanity content instead of the
seeded fallback posts, and `/studio` becomes a working editor — no
other code changes needed.

## 2. Allow this site's domain in Sanity's CORS settings

Sanity blocks API requests from unrecognized origins by default. Go to
sanity.io/manage → your project → **API** → **CORS origins** → **Add
CORS origin**, and add each domain that will load the site or the
Studio:

- Your production domain (e.g. `https://tchglobal.org`)
- The Vercel preview domain (e.g.
  `https://tch-global-git-nextjs-migration-andreomnibarrys-projects.vercel.app`)
- `http://localhost:3000` (for local development)

Check **"Allow credentials"** for each — the Studio's login needs it.
Without this step, `/studio` will load but fail to save.

## 3. Who can edit

Invite the handler's email in sanity.io/manage → Members. They get
their own login, completely separate from your GitHub/Vercel access —
they sign in at `tchglobal.org/studio` directly and never need either
of those. Treat a Studio invite the same as handing someone publish
access to the live site — only invite people you trust to post
directly, since there's no additional review step before it's live.

## What ships with the schema already

- **Post**: title, slug, excerpt, category, cover image, author
  (reference), publish date, read time, and a rich body field that
  supports headings, bold/italic, inline images, and a custom
  "Bible Verse Reference" block (renders as the tap-to-reveal verse
  lookup on the live site).
- **Author**: name + photo, referenced from posts (so you can add
  guest writers later without touching code).
- **Announcement**: title, body, flyer image, start/end dates, link —
  ready for the "upload flyers/programs" feature once we build the
  homepage section that reads from it.
- **Event**: title, description, start/end date-time, location, flyer
  image, link — powers the "Upcoming Events" list on the homepage
  (right under Service Days). Add one in the Studio and it appears
  automatically, soonest first; it disappears on its own once its end
  date passes (or its start date, if no end date is set).
- **Testimony**: name, testimony text, optional photo, date. Members
  submit through the form on the Testimonies section of the homepage —
  those submissions land in Vercel KV, viewable at `/admin/submissions`
  (**not** published automatically). To actually publish one, create a
  new Testimony document here in the Studio with their name and story —
  same two-step flow as `/write`: draft/submit, then a real person
  publishes it.

## What this does NOT include yet

- The proofreader/grammar-check integration
- The reader analytics dashboard (views, most-watched, trending)
- Comment moderation
- YouTube auto-sync

These are the next layer, described in the main migration notes.
