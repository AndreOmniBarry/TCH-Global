# TCH Global

Website for TCH Global (The Comforter's House Global), led by Pastor Uzor
Echiejile — a church for every nation.

## Structure

Single-page site with anchor navigation (Home, About Church, Meet the
Pastor, Blog, Service Days, Media & Streaming, Contact Us, Join Us, Give).

- `index.html` — the full site
- `css/styles.css` — design tokens (light + dark themes), layout, the
  pop-up-book scroll-depth engine's styles
- `js/main.js` — theme toggle, mobile nav, form handlers, and the
  scroll-linked parallax/pop-up engine
- `images/` — logo, pastor photos, book covers
- `favicon.jpg` — browser tab icon

## Notes for the next pass

- Placeholder content still to be swapped in: pastor's full biography,
  real YouTube/Facebook URLs, real teaching series links, phone number.
- The map is a styled static card (Artifacts/most sandboxes can't load
  live map tiles) — swap in a real Google Maps or Leaflet embed once
  deployed somewhere that can reach external tile servers.
- Give/Join/Prayer forms currently just show a confirmation message
  client-side; no backend is wired up yet.

## Development

This is a static site — open `index.html` in a browser, or serve the
directory with any static file server, e.g.:

```
npx serve .
```

## Deploying

Static site, no build step — works as-is on Vercel, Netlify, GitHub
Pages, etc.
