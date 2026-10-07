import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminToken } from '@/lib/admin-token';

// /admin (analytics, submissions, members) is behind the publishing
// password. Signed-out visitors get the /admin/login page.
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname === '/admin/login' || pathname === '/admin/api/login') return NextResponse.next();
  const want = await adminToken();
  const have = req.cookies.get(ADMIN_COOKIE)?.value;
  if (want && have && have === want) return NextResponse.next();
  if (pathname.startsWith('/admin/api/')) return NextResponse.json({ error: 'Sign in to admin first.' }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = '/admin/login';
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/admin/:path*'] };
