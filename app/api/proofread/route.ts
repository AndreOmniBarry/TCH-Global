import { NextRequest, NextResponse } from 'next/server';

// Proxies to LanguageTool's grammar-check API (server-side, so no CORS
// issues and the endpoint is swappable in one place). Defaults to the
// free public API (no key required, generous enough for a weekly
// church blog post) — set LANGUAGETOOL_API_URL to point at a
// self-hosted instance later for offline/private use, no other code
// changes needed. See /proofreader/README.md.
const API_URL = process.env.LANGUAGETOOL_API_URL || 'https://api.languagetool.org/v2/check';

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ error: 'text required' }, { status: 400 });
    }

    const body = new URLSearchParams({ text, language: 'en-US' });
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!res.ok) {
      return NextResponse.json({ error: `proofreader service returned ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json({ matches: data.matches ?? [] });
  } catch (err) {
    console.error('Proofread request failed:', err);
    return NextResponse.json({ error: 'proofreader unavailable right now' }, { status: 502 });
  }
}
