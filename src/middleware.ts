import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const CANONICAL_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mrmr.kr';
const canonicalUrl = new URL(CANONICAL_ORIGIN);
const canonicalHost = canonicalUrl.hostname.replace(/^www\./, '');

export function middleware(request: NextRequest) {
  const { nextUrl } = request;
  const incomingHost = nextUrl.hostname.toLowerCase();

  if (incomingHost === `www.${canonicalHost}`) {
    const redirectUrl = nextUrl.clone();
    redirectUrl.hostname = canonicalHost;
    redirectUrl.protocol = canonicalUrl.protocol;
    redirectUrl.port = '';
    return NextResponse.redirect(redirectUrl, 308);
  }

  const response = NextResponse.next();
  const isHtmlRequest = request.headers.get('accept')?.includes('text/html') ?? false;

  if (isHtmlRequest) {
    const path = nextUrl.pathname === '/' ? '/' : nextUrl.pathname.replace(/\/$/, '');
    response.headers.set('Link', `<${canonicalUrl.origin}${path}>; rel="canonical"`);
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
