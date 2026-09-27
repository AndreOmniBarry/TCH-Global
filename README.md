# TCH Global

Website for TCH Global (The Comforter's House Global), led by Pastor Uzor
Echiejile — a church for every nation.

**This branch (`nextjs-migration`) is the Next.js rebuild.** The
previously-shipped static-HTML site still lives on the
`claude/tch-global-church-site-g7adxm` branch. Once this is verified on a
Vercel preview deployment, switch the Vercel project's Production Branch
to this one to go live — see "Deploying" below.

## Structure

- `app/page.tsx` — homepage (bridged from the original static markup;
  see the comment at the top of the file)
- `app/blog/page.tsx` — blog listing, reads from Sanity or falls back
  to seeded posts
- `app/blog/[slug]/page.tsx` — individual post page
- `lib/sanity.ts` — Sanity client + queries (returns `null` gracefully
  until a Sanity project is connected)
- `lib/fallback-posts.ts` — the 4 seeded posts, used until Sanity is live
- `sanity/schema.ts` — content schema (Post, Author, Announcement) —
  see `sanity/README.md` for how to actually stand up the CMS
- `components/SiteChrome.tsx` — shared header/footer for blog pages
- `public/` — images, css, js, favicon (served as-is at the site root)

## Development

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`. Works immediately — no Sanity account
needed; the blog uses seeded content until you connect one.

## Deploying

This is now a real Next.js app, not a static site — the Vercel project
needs:

1. **Framework Preset: Next.js** (Vercel should auto-detect this once
   `package.json` exists at the root; double-check it in Project
   Settings → General if the build fails).
2. **Production Branch** pointed at whichever branch you want live.
   Pushing this branch creates a Preview deployment automatically —
   check that URL before switching Production Branch over to it.
3. Once ready to connect the CMS: the two env vars described in
   `sanity/README.md`.

## What's next

See `sanity/README.md` for connecting the CMS. Beyond that, still
ahead: reader analytics (most-watched/trending), a proofreader
integration for the post editor, comment moderation, and YouTube
auto-sync — all layered on top of this same Next.js + Sanity
foundation.
