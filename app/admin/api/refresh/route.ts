import { revalidatePath, revalidateTag } from 'next/cache';

// Admin-only (middleware): drop every cached Sanity read and page now.
export async function POST(req: Request) {
  revalidateTag('sanity');
  ['/', '/blog', '/library', '/live', '/kids', '/teens', '/teens/blog'].forEach((p) => revalidatePath(p));
  return Response.redirect(new URL('/admin/status?refreshed=1', req.url), 303);
}
