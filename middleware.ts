import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function unauthorized() {
  const res = new NextResponse('Unauthorized', { status: 401 });
  res.headers.set('WWW-Authenticate', 'Basic realm="Admin", charset="UTF-8"');
  return res;
}

function checkBasicAuth(req: NextRequest): boolean {
  const header = req.headers.get('authorization') || req.headers.get('Authorization');
  const user = process.env.ADMIN_USER || '';
  const pass = process.env.ADMIN_PASS || '';
  if (!user || !pass) return false;
  if (!header?.startsWith('Basic ')) return false;
  try {
    const b64 = header.slice(6);
    const [u, p] = Buffer.from(b64, 'base64').toString('utf8').split(':', 2);
    return u === user && p === pass;
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/admin') || pathname === '/api/reseed') {
    if (!checkBasicAuth(req)) {
      return unauthorized();
    }
  }
  // Protect mutating airport APIs; allow GETs without auth
  if (pathname.startsWith('/api/airports')) {
    if (req.method !== 'GET') {
      if (!checkBasicAuth(req)) {
        return unauthorized();
      }
    }
  }
    if (!checkBasicAuth(req)) {
      return unauthorized();
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/reseed', '/api/airports/:path*'] ,
};
