// Cache-buster for the hand-written assets in /public (styles.css,
// main.js, blog.js). Changes on every deploy, so phones never mix a new
// page with an old cached stylesheet or script.
export const ASSET_V = (process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || 'dev').slice(0, 8);
export const asset = (path: string) => `${path}?v=${ASSET_V}`;
