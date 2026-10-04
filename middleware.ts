import { NextRequest, NextResponse } from 'next/server';

// Locks /admin (analytics, form submissions) behind the same password
// as /write. The browser shows its own sign-in box; any username works.
export function middleware(req: NextRequest) {
  const expected = process.env.WRITE_PASSWORD;
  if (!expected) return new NextResponse('Admin is locked until WRITE_PASSWORD is set.', { status: 503 });
  const auth = req.headers.get('authorization') || '';
  if (auth.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6));
      const given = decoded.slice(decoded.indexOf(':') + 1);
      if (given.length === expected.length) {
        let diff = 0;
        for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
        if (diff === 0) return NextResponse.next();
      }
    } catch {}
  }
  return new NextResponse('Password required.', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="TCH Global admin", charset="UTF-8"' } });
}

export const config = { matcher: ['/admin/:path*'] };
