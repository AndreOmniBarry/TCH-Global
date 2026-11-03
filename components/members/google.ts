'use client';

// Google Identity Services (Continue with Google + One Tap). Loaded only
// when NEXT_PUBLIC_GOOGLE_CLIENT_ID is set, once per page.
export const GOOGLE_ID = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '').trim();

type Gis = {
  accounts: { id: {
    initialize: (o: Record<string, unknown>) => void;
    renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
    prompt: () => void;
    cancel: () => void;
    disableAutoSelect: () => void;
  } };
};
declare global { interface Window { google?: Gis } }

let loading: Promise<Gis | null> | null = null;
let ready = false;

function load(): Promise<Gis | null> {
  if (!GOOGLE_ID || typeof window === 'undefined') return Promise.resolve(null);
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  loading ??= new Promise((res) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => res(window.google ?? null);
    s.onerror = () => { loading = null; res(null); };
    document.head.appendChild(s);
  });
  return loading;
}

/** Ready-to-use GIS, initialised so any successful Google sign-in posts the
 * credential to our server and announces 'tch:signedin' to the page. */
export async function gis(): Promise<Gis | null> {
  const g = await load();
  if (!g || ready) return g;
  g.accounts.id.initialize({
    client_id: GOOGLE_ID,
    auto_select: true, // returning users are signed straight back in
    cancel_on_tap_outside: true,
    itp_support: true,
    use_fedcm_for_prompt: true,
    callback: async ({ credential }: { credential: string }) => {
      try {
        const r = await fetch('/api/auth/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential }) });
        const d = await r.json().catch(() => ({}));
        if (r.ok) window.dispatchEvent(new CustomEvent('tch:signedin', { detail: d.member }));
        else window.dispatchEvent(new CustomEvent('tch:signin-error', { detail: d.error || 'Google sign-in didn’t work. Please try again.' }));
      } catch {
        window.dispatchEvent(new CustomEvent('tch:signin-error', { detail: 'We couldn’t reach the server. Check your connection.' }));
      }
    },
  });
  ready = true;
  return g;
}
