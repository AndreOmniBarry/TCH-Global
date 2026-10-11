import { sanityClient } from '@/lib/sanity';
import type { Prop, Scene, Story } from './stories';

export type CmsStory = Story & { date?: string | null };

const Q = `*[_type == "kidsStory" && defined(title) && count(pages) > 0] | order(_createdAt asc) {
  "id": _id, title, ref, date, pages, scene, prop, "image": image.asset->url,
  verseText, verseRef, thought, deep, confess, prayer, challenge, quiz, words
}`;

/** Stories the team published in Sanity. Empty if Sanity is unreachable. */
export async function getCmsStories(): Promise<CmsStory[]> {
  if (!sanityClient) return [];
  try {
    const rows = await sanityClient.fetch<any[]>(Q);
    return rows.map((r) => ({
      id: `cms-${r.id}`, title: r.title, ref: r.ref ?? '', date: r.date ?? null,
      scene: (r.scene || 'field') as Scene, prop: (r.prop || 'star') as Prop, image: r.image ?? undefined,
      pages: (r.pages ?? []).filter(Boolean),
      verse: { text: r.verseText ?? '', ref: r.verseRef ?? '' },
      thought: r.thought ?? '', deep: r.deep || undefined, confess: r.confess || undefined,
      prayer: r.prayer ?? '', challenge: r.challenge ?? '',
      quiz: (r.quiz ?? []).filter((q: any) => q?.q && q.options?.length === 3).map((q: any) => ({ q: q.q, options: q.options, a: Math.min(2, Math.max(0, q.answer ?? 0)) })),
      words: (r.words ?? []).filter((w: any) => w?.w && w.clue).map((w: any) => ({ w: String(w.w).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 9), clue: w.clue })).filter((w: any) => w.w.length >= 2),
    }));
  } catch (err) {
    console.error('Kids stories fetch failed, using built-in stories:', err);
    return [];
  }
}
