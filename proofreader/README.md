# The proofreader (`/write`)

Works right now, no setup needed — it uses LanguageTool's free public
grammar-check API, which requires no account or key.

Visit `/write` on the live site (not linked in navigation — treat it
as an internal handler tool). Draft there, use the toolbar to format
(headings, bold, italic, underline, pull quotes, tappable Bible verse
references), see a live preview styled exactly like a real published
post, and click **Check Writing** for grammar/style suggestions.

## Going offline / self-hosted

The free public API is fine for the volume of a weekly church blog,
but it's rate-limited and requires an internet connection. If you
outgrow that or want it to work without depending on a third-party
service, LanguageTool can be self-hosted (a free, open-source Docker
container you or a developer runs):

```bash
docker run -d -p 8010:8010 erikvl87/languagetool
```

Then set one environment variable and nothing else changes:

```
LANGUAGETOOL_API_URL=http://your-server:8010/v2/check
```

`app/api/proofread/route.ts` already reads this variable — it's a
drop-in swap, no code changes.

## Publishing what you write here

This tool does **not** publish directly to the live blog yet — it's a
drafting and proofreading aid. Once you're happy with a post, copy the
text into the Sanity Studio editor (see `sanity/README.md`) to
actually publish it. Wiring this page to publish directly is a
reasonable next step once Sanity is connected — it would need a
Sanity write token, which is more sensitive to store than the
read-only setup that's already in place.
