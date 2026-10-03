import { createClient, type SanityClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

// These env vars come from your Sanity project once created (see
// /sanity/README.md). Until they're set, sanityClient is null and every
// page falls back to the seeded local posts in lib/fallback-posts.ts —
// the site works out of the box, no Sanity account required to build.
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

export const sanityClient: SanityClient | null = projectId
  ? createClient({
      projectId,
      dataset,
      apiVersion: '2024-01-01',
      useCdn: true,
    })
  : null;

export function urlFor(source: any) {
  if (!sanityClient) return null;
  return imageUrlBuilder(sanityClient).image(source);
}

export type Post = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  readTime: string;
  coverImage: string;
  authorName: string;
  authorImage: string;
  body: any; // Portable Text array when sourced from Sanity, or HTML string for fallback posts
};

const POSTS_QUERY = `*[_type == "post" && publishedAt <= now()] | order(publishedAt desc) {
  _id,
  title,
  "slug": slug.current,
  excerpt,
  category,
  publishedAt,
  readTime,
  "coverImage": coalesce(coverImage.asset->url, coverImageUrl, "/images/pastor-teaching.webp"),
  "authorName": coalesce(author->name, authorName, "Pastor Uzor Echiejile"),
  "authorImage": author->image.asset->url,
  "body": coalesce(bodyHtml, pt::text(body))
}`;

const POST_BY_SLUG_QUERY = `*[_type == "post" && slug.current == $slug && publishedAt <= now()][0] {
  _id,
  title,
  "slug": slug.current,
  excerpt,
  category,
  publishedAt,
  readTime,
  "coverImage": coalesce(coverImage.asset->url, coverImageUrl, "/images/pastor-teaching.webp"),
  "authorName": coalesce(author->name, authorName, "Pastor Uzor Echiejile"),
  "authorImage": author->image.asset->url,
  "body": coalesce(bodyHtml, pt::text(body))
}`;

export async function getAllPosts(): Promise<Post[] | null> {
  if (!sanityClient) return null;
  try {
    return await sanityClient.fetch(POSTS_QUERY);
  } catch (err) {
    console.error('Sanity fetch failed, falling back to seeded posts:', err);
    return null;
  }
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  if (!sanityClient) return null;
  try {
    return await sanityClient.fetch(POST_BY_SLUG_QUERY, { slug });
  } catch (err) {
    console.error('Sanity fetch failed, falling back to seeded posts:', err);
    return null;
  }
}

export type Announcement = {
  _id: string;
  title: string;
  body: string;
  flyerImage: string | null;
  startsAt: string;
  endsAt: string | null;
  link: string | null;
};

// Only future/current announcements, soonest first.
const ANNOUNCEMENTS_QUERY = `*[_type == "announcement" && (endsAt > now() || !defined(endsAt))] | order(startsAt asc) {
  _id,
  title,
  body,
  "flyerImage": flyerImage.asset->url,
  startsAt,
  endsAt,
  link
}`;

export async function getAnnouncements(): Promise<Announcement[] | null> {
  if (!sanityClient) return null;
  try {
    return await sanityClient.fetch(ANNOUNCEMENTS_QUERY);
  } catch (err) {
    console.error('Sanity fetch failed, no announcements shown:', err);
    return null;
  }
}

export type ChurchEvent = {
  _id: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  flyerImage: string | null;
  link: string | null;
};

// Only events that haven't ended yet (or have no end date), soonest first.
const EVENTS_QUERY = `*[_type == "event" && dateTime(coalesce(endsAt, startsAt)) + 60*60*3 > dateTime(now())] | order(startsAt asc) {
  _id,
  title,
  description,
  startsAt,
  endsAt,
  location,
  "flyerImage": coalesce(flyerImage.asset->url, flyerUrl),
  link
}`;

export async function getUpcomingEvents(): Promise<ChurchEvent[] | null> {
  if (!sanityClient) return null;
  try {
    return await sanityClient.fetch(EVENTS_QUERY);
  } catch (err) {
    console.error('Sanity fetch failed, no events shown:', err);
    return null;
  }
}

export type Testimony = {
  _id: string;
  name: string;
  quote: string;
  image: string | null;
  submittedAt: string | null;
};

const TESTIMONIES_QUERY = `*[_type == "testimony"] | order(submittedAt desc) [0...12] {
  _id,
  name,
  quote,
  "image": image.asset->url,
  submittedAt
}`;

export async function getTestimonies(): Promise<Testimony[] | null> {
  if (!sanityClient) return null;
  try {
    return await sanityClient.fetch(TESTIMONIES_QUERY);
  } catch (err) {
    console.error('Sanity fetch failed, no testimonies shown:', err);
    return null;
  }
}
