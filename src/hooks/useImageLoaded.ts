import { type RefObject, useEffect, useState } from 'react';

/**
 * `<img>` element의 로드 완료 여부를 안정적으로 추적하는 hook.
 *
 * next/image의 onLoad가 캐시된 이미지에서 발화 안 하는 케이스와
 * ref forwarding이 일부 환경에서 늦게 잡히는 케이스를 모두 커버:
 * 1. mount 시 img.complete 즉시 체크 (캐시 hit 케이스)
 * 2. native 'load' 이벤트 리스너 등록 (React onLoad 우회)
 * 3. 1.5초 fallback 타이머 (모든 메커니즘이 실패해도 강제 true)
 *
 * @param ref next/image 또는 <img>에 전달된 ref
 * @returns 이미지 로드/디코딩 완료 여부
 */
export function useImageLoaded(ref: RefObject<HTMLImageElement | null>): boolean {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = ref.current;

    // ref가 아직 안 잡혔어도 fallback 타이머로 안전 보장
    if (!img) {
      const timer = setTimeout(() => setLoaded(true), 1500);
      return () => clearTimeout(timer);
    }

    // 캐시 hit 케이스: mount 시점에 이미 디코딩 완료
    if (img.complete && img.naturalWidth > 0) {
      setLoaded(true);
      return;
    }

    // 정상 로드 케이스: native load 이벤트 등록
    const onLoad = () => setLoaded(true);
    img.addEventListener('load', onLoad);

    // 최후 안전망: 1.5초 후엔 무조건 표시 (네트워크 지연 등 모든 실패 케이스 보호)
    const timer = setTimeout(() => setLoaded(true), 1500);

    return () => {
      img.removeEventListener('load', onLoad);
      clearTimeout(timer);
    };
  }, [ref]);

  return loaded;
}
