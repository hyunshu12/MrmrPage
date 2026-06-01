import { unstable_cache } from 'next/cache';

const ALLOWED_HOSTNAMES = new Set(['prod-files-secure.s3.us-west-2.amazonaws.com', 's3.us-west-2.amazonaws.com']);

/**
 * S3 URL에서 stable cache key를 추출한다.
 * presigned URL 토큰이 달라도 동일 파일은 동일 key를 반환한다.
 */
export function getS3CacheKey(s3Url: string): string | null {
  try {
    const parsed = new URL(s3Url);
    if (!ALLOWED_HOSTNAMES.has(parsed.hostname)) return null;
    // pathname만 사용 — 쿼리 파라미터(presigned 토큰) 제외
    return parsed.hostname + parsed.pathname;
  } catch {
    return null;
  }
}

/**
 * S3 이미지를 unstable_cache에 stable key(s3Path)로 캐싱한다.
 *
 * - 캐시 hit: s3Url 불사용, 캐시 데이터 즉시 반환
 * - 캐시 miss: s3Url로 다운로드 후 캐싱
 * - ISR 시점(fresh URL)과 image-proxy(만료 가능 URL) 양쪽에서 동일 함수 호출
 *   → ISR이 먼저 warm하면 이후 image-proxy 요청은 항상 캐시 hit
 */
export function getOrCacheImage(s3Path: string, s3Url: string) {
  return unstable_cache(
    async () => {
      try {
        const res = await fetch(s3Url, { cache: 'no-store' });
        if (!res.ok) return null;
        const ab = await res.arrayBuffer();
        return {
          data: Buffer.from(ab).toString('base64'),
          contentType: res.headers.get('content-type') ?? 'image/jpeg',
        };
      } catch {
        return null;
      }
    },
    ['notion-img', s3Path],
    { revalidate: 86400, tags: ['notion-images'] },
  )();
}
