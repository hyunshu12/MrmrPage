// v2: Notion → Sanity 이전. v1 에는 Notion S3 이미지 URL 이 들어 있는데, 그 호스트는 이제
// next.config 의 remotePatterns 에 없어서 next/image 가 렌더 중에 던진다. 버전을 올려 버린다.
const CACHE_PREFIX = 'mrmr-cache-v2';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type CacheEnvelope<T> = {
  savedAt: number;
  data: T;
};

function buildKey(queryKey: readonly unknown[]): string {
  return `${CACHE_PREFIX}-${queryKey.join('-')}`;
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readCache<T>(queryKey: readonly unknown[]): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(buildKey(queryKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (typeof parsed.savedAt !== 'number') return null;
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) {
      window.localStorage.removeItem(buildKey(queryKey));
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeCache<T>(queryKey: readonly unknown[], data: T): void {
  if (!isBrowser()) return;
  try {
    const envelope: CacheEnvelope<T> = { savedAt: Date.now(), data };
    window.localStorage.setItem(buildKey(queryKey), JSON.stringify(envelope));
  } catch {
    // localStorage full or disabled - silently ignore
  }
}

export function clearCache(queryKey: readonly unknown[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(buildKey(queryKey));
  } catch {
    // ignore
  }
}

export function hasCache(queryKey: readonly unknown[]): boolean {
  return readCache(queryKey) !== null;
}
