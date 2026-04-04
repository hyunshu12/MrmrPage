import type { NextRequest } from 'next/server';

const ALLOWED_HOSTNAMES = new Set([
  'prod-files-secure.s3.us-west-2.amazonaws.com',
  's3.us-west-2.amazonaws.com',
]);

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return new Response('Missing url parameter', { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new Response('Invalid url parameter', { status: 400 });
  }

  if (!ALLOWED_HOSTNAMES.has(parsed.hostname)) {
    return new Response('URL not allowed', { status: 403 });
  }

  const upstream = await fetch(url, { cache: 'no-store' });

  if (!upstream.ok) {
    return new Response('Failed to fetch image', { status: upstream.status });
  }

  const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';
  const body = upstream.body;

  return new Response(body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=1800, s-maxage=1800',
    },
  });
}
