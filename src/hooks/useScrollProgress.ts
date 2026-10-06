'use client';

import { type RefObject, useEffect, useRef } from 'react';

export interface ScrollProgress {
  /** 문서 스크롤 진행도 0..1 */
  scroll: number;
  /** 뷰포트 높이 / 문서 전체 높이 */
  viewFrac: number;
}

/**
 * 스크롤 진행도를 ref 에 담아 돌려준다.
 *
 * state 를 쓰지 않는 이유: 이 값은 GPU 렌더 루프만 읽는다. state 로 만들면
 * 스크롤 한 번에 홈 전체가 리렌더된다.
 *
 * 문서 높이 측정과 스크롤 위치 읽기를 분리한 이유가 더 중요하다.
 * `scrollHeight` 를 읽으면 브라우저가 그 자리에서 레이아웃을 강제로 계산한다.
 * 이걸 스크롤 이벤트마다 하면 스크롤 내내 메인 스레드가 레이아웃을 다시 돌려서
 * 눈에 보이는 버벅임이 된다. 그래서 높이는 크기가 실제로 바뀔 때만 재고,
 * 스크롤 중에는 레이아웃을 건드리지 않는 `scrollY` 만 읽는다.
 */
export function useScrollProgress(): RefObject<ScrollProgress> {
  const ref = useRef<ScrollProgress>({ scroll: 0, viewFrac: 1 });

  useEffect(() => {
    // 마지막으로 잰 문서 크기. 스크롤 핸들러는 이 값만 쓰고 DOM 을 다시 읽지 않는다.
    let scrollable = 1;

    const applyScroll = () => {
      ref.current.scroll = Math.min(Math.max(window.scrollY / scrollable, 0), 1);
    };

    const measureDocument = () => {
      const viewport = window.innerHeight;
      const total = document.documentElement.scrollHeight;
      scrollable = Math.max(total - viewport, 1);
      ref.current.viewFrac = Math.min(viewport / Math.max(total, 1), 1);
      applyScroll();
    };

    measureDocument();
    window.addEventListener('scroll', applyScroll, { passive: true });
    window.addEventListener('resize', measureDocument);

    // 이미지·폰트가 늦게 들어오면 문서 높이가 바뀐다. 그때만 다시 잰다.
    const observer = new ResizeObserver(measureDocument);
    observer.observe(document.documentElement);

    return () => {
      window.removeEventListener('scroll', applyScroll);
      window.removeEventListener('resize', measureDocument);
      observer.disconnect();
    };
  }, []);

  return ref;
}
