import { isBoothMode } from '@/lib/booth';
import type { ZodType } from 'zod';

// v2: Notion → Sanity 이전. v1 에는 Notion S3 이미지 URL 이 들어 있는데, 그 호스트는 이제
// next.config 의 remotePatterns 에 없어서 next/image 가 렌더 중에 던진다. 버전을 올려 버린다.
const CACHE_PREFIX = 'mrmr-cache-v2';
// 재방문 때 화면을 바로 여는 용도다. 오래된 데이터는 화면에 먼저 보인 뒤 뒤에서 다시 받는다.
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type CacheEnvelope = {
  /** 이 데이터를 네트워크에서 받은 시각(query.state.dataUpdatedAt). 복원할 때 그대로 updatedAt 이 된다. */
  savedAt: number;
  data: unknown;
};

export type CacheEntry<T> = { data: T; savedAt: number };

function storageKey(queryKey: readonly unknown[]): string {
  // 부스 스냅샷은 로컬 이미지 경로를 담는다. 실제 API 데이터와 같은 칸을 쓰면 서로를 덮어쓴다.
  const prefix = isBoothMode() ? `${CACHE_PREFIX}-booth` : CACHE_PREFIX;
  return `${prefix}-${queryKey.join('-')}`;
}

/**
 * 저장해 둔 데이터를 꺼낸다. 받은 시각이 없거나 미래이거나 TTL 이 지났거나,
 * 지금 스키마와 모양이 다르면 지우고 null 을 돌려준다.
 */
export function readCache<T>(queryKey: readonly unknown[], schema: ZodType<T>): CacheEntry<T> | null {
  // localStorage 는 접근만으로 던지는 브라우저가 있다(저장소 차단). 그래서 전부 try 안에 둔다.
  try {
    if (typeof window === 'undefined') return null;
    const key = storageKey(queryKey);
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const { savedAt, data } = JSON.parse(raw) as Partial<CacheEnvelope>;
    if (typeof savedAt === 'number') {
      const age = Date.now() - savedAt;
      const parsed = age >= 0 && age <= CACHE_TTL_MS ? schema.safeParse(data) : null;
      if (parsed?.success) return { data: parsed.data, savedAt };
    }
    window.localStorage.removeItem(key);
    return null;
  } catch {
    return null;
  }
}

export function writeCache(queryKey: readonly unknown[], data: unknown, savedAt: number): void {
  try {
    if (typeof window === 'undefined') return;
    const envelope: CacheEnvelope = { savedAt, data };
    window.localStorage.setItem(storageKey(queryKey), JSON.stringify(envelope));
  } catch {
    // 저장소가 꽉 찼거나 막혀 있으면 다음 방문에 다시 받을 뿐이다.
  }
}
