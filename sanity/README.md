# Connecting the real CMS (Sanity)

The blog works right now with zero setup — every post is seeded in
`lib/fallback-posts.ts` and the site builds and runs without any
external account. This document is for when you're ready to let a
non-technical handler actually post, edit, and delete content.

## 1. Create the Sanity project (5 minutes, needs your own login)

This step needs your own Sanity account — I can't create it for you.

```bash
npm install -g sanity
cd sanity
sanity init
```

- Choose "Create new project"
- Dataset: `production`
- When it asks for a schema template, choose "Clean project" — the
  schema is already written for you in `sanity/schema.ts`. Copy its
  contents into the generated `schemaTypes/index.ts` (or wherever the
  init wizard puts it).

This creates a `sanity.config.ts` and a hosted Studio — a web app at
`https://your-project.sanity.studio` where the handler logs in and
gets a real editor: rich text, images, drag-and-drop, publish button.
No code required for them, ever.

## 2. Connect it to the Next.js site

From the Sanity dashboard (sanity.io/manage), copy your **Project ID**.
Add these to a `.env.local` file at the repo root (never commit this
file — it's already gitignored):

```
NEXT_PUBLIC_SANITY_PROJECT_ID=your-project-id
NEXT_PUBLIC_SANITY_DATASET=production
```

Add the same two variables in **Vercel → Project Settings →
Environment Variables** so the live site picks them up too.

The moment `NEXT_PUBLIC_SANITY_PROJECT_ID` is set, `lib/sanity.ts`
automatically starts querying real Sanity content instead of the
seeded fallback posts — no other code changes needed.

## 3. Who can edit

Invite the handler's email in sanity.io/manage → Members. They get
their own login to the Studio, completely separate from your GitHub/
Vercel access — they never need either of those.

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

## What this does NOT include yet

- The proofreader/grammar-check integration
- The reader analytics dashboard (views, most-watched, trending)
- Comment moderation
- YouTube auto-sync

These are the next layer, described in the main migration notes.
