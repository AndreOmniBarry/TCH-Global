// The site's public origin, used for canonical URLs, the sitemap, Open Graph
// images and links in emails. Set SITE_URL once the custom domain is live.
export const SITE_URL = (process.env.SITE_URL || 'https://tch-global.vercel.app').trim().replace(/\/+$/, '');
