'use client';

// A random, anonymous per-browser ID — not tied to a name, email, or any
// personal data — used only to tell "10 different people" apart from "1
// person refreshing 10 times" for unique-visitor counts. Lives in
// localStorage only (never sent anywhere but our own /api/track-view,
// never readable across sites). Clearing browser data resets it.
const KEY = 'tch_visitor_id';

export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    // Private browsing / storage blocked — fall back to a per-load ID.
    // Uniqueness just won't dedupe across page loads for this visitor.
    return crypto.randomUUID();
  }
}
