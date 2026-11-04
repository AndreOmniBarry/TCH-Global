# Continue with Google: setup

Free. No billing account or card is needed (ignore any "Start free trial" prompt).

1. **Project**: open console.cloud.google.com/projectcreate (church Google account). Name it `TCH Global` → Create. If asked for a billing account, leave it empty.
2. **Sign-in screen**: open console.cloud.google.com/auth/overview with `TCH Global` selected → Get started.
   - App information: name `TCH Global`, support email = church email
   - Audience: External
   - Contact information: church email → agree → Create
   - Left menu **Audience** → **Publish app** → Confirm (only name + email are requested, so no Google review is needed)
3. **Client ID**: left menu **Clients** → Create client → Web application, name `TCH Global website`.
   - Authorized JavaScript origins: `https://tch-global.vercel.app` (add the custom domain too when it goes live)
   - No redirect URIs → Create → copy the Client ID (`…apps.googleusercontent.com`; not a secret)
4. **Vercel**: Settings → Environment Variables → `NEXT_PUBLIC_GOOGLE_CLIENT_ID` = the Client ID (Production + Preview) → Save → Deployments → ⋯ → Redeploy. It must be a redeploy: `NEXT_PUBLIC_` values are built into the page.
5. **Check**: /admin/status shows "Continue with Google" green; /account shows the Google button.

## How it works
- Button and One Tap: `components/members/google.ts`, `GoogleButton.tsx`, `SessionWatcher.tsx`.
- Server: `lib/google.ts` verifies the RS256 ID token against Google's published keys (audience, issuer, expiry, verified email); `/api/auth/google` signs in the account with that email (linking Google on first use) or creates one, then starts the usual 90-day rolling session.
- Signing out turns off Google auto sign-in on that browser.
