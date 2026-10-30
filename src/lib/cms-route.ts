import { NextResponse } from 'next/server';

/**
 * Vercel CDN 이 응답을 10분(s-maxage) 들고 있고, 그 뒤 하루 동안은 옛 응답을 바로 주면서 뒤에서 새로 받는다
 * (stale-while-revalidate). CMS 가 잠깐 죽거나 요청 한도에 걸려도 방문자는 막히지 않는다.
 * 브라우저(QueryClientProvider)도 받은 지 10분이 지난 데이터는 다시 확인한다.
 */
const CACHE_CONTROL = 'public, s-maxage=600, stale-while-revalidate=86400';

/**
 * CMS 목록을 JSON 으로 내려주는 GET 핸들러를 만든다.
 * Next 16 의 GET 핸들러는 dynamic·revalidate 를 따로 정하지 않으면 빌드 때 미리 만들지 않고 요청마다 실행한다.
 * 그래서 빌드 중에는 CMS 를 조회하지 않고, 캐시는 위의 Cache-Control 로 CDN 에 맡긴다.
 */
export function cmsListRoute(load: () => Promise<unknown[]>, label: string) {
  return async function GET() {
    try {
      return NextResponse.json(await load(), {
        headers: { 'Cache-Control': CACHE_CONTROL },
      });
    } catch (error) {
      console.error(`Error fetching ${label}:`, error);
      // 오류는 캐시하지 않는다. 잠깐의 CMS 장애가 CDN 에 10분 동안 박히면 안 된다.
      return NextResponse.json(
        { error: `Failed to fetch ${label} data` },
        { status: 500, headers: { 'Cache-Control': 'no-store' } },
      );
    }
  };
}
