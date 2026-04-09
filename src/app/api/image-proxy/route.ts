import type { NextRequest } from 'next/server';

const ALLOWED_HOSTNAMES = new Set([
  'prod-files-secure.s3.us-west-2.amazonaws.com',
  's3.us-west-2.amazonaws.com',
]);

// 160×140 neutral SVG placeholder (person silhouette, muruk green palette)
const PLACEHOLDER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 140">' +
  '<rect width="160" height="140" fill="#e8f0e4"/>' +
  '<circle cx="80" cy="52" r="28" fill="#c5d9c0"/>' +
  '<ellipse cx="80" cy="118" rx="44" ry="30" fill="#c5d9c0"/>' +
  '</svg>';

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
    // S3 Presigned URL expired (403) or other error → return placeholder SVG
    // Short cache-control (60s) so browsers retry quickly after data revalidates
    return new Response(PLACEHOLDER_SVG, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    });
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
