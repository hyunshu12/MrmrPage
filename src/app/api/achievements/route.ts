import { getPublishedAchievements } from '@/lib/notion';
import { NextResponse } from 'next/server';

// CDN/edge caching for this public GET route.
//
// In Next.js 16 a GET Route Handler is dynamic (uncached) by default, so we
// keep it dynamic and make the response CDN-cacheable by returning an explicit
// Cache-Control header below — Next preserves a Cache-Control we set ourselves,
// and Vercel's CDN honors its s-maxage / stale-while-revalidate directives.
// We drop the previous 'force-dynamic' (set the explicit framework default
// 'auto') so there is no ambiguity about the route opting out of caching; the
// handler still runs per request (no build-time Notion query).
export const dynamic = 'auto';

// Edge cache for 10 min (matches the client React Query stale time); serve
// stale up to 1 day while revalidating in the background so a Notion outage
// or rate-limit never blocks visitors.
const CACHE_CONTROL = 'public, s-maxage=600, stale-while-revalidate=86400';

export async function GET() {
  try {
    const achievements = await getPublishedAchievements();
    return NextResponse.json(achievements, {
      headers: { 'Cache-Control': CACHE_CONTROL },
    });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    // Do not cache errors: a transient Notion failure must not be pinned at
    // the edge for the full TTL.
    return NextResponse.json(
      { error: 'Failed to fetch achievements data' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
