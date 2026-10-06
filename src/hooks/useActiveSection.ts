'use client';

import { type MutableRefObject, useEffect, useState } from 'react';

type SectionRefs = MutableRefObject<Array<HTMLElement | null>>;

/**
 * 뷰포트 가운데에 걸친 섹션의 인덱스를 돌려준다.
 *
 * 한 번이라도 가운데를 지난 섹션에는 `data-inview` 를 단다.
 * `data-reveal` 섹션 안의 `.reveal-up` 은 이 표시가 붙을 때까지 멈춰 있다가,
 * 사용자가 그 섹션에 도착하는 순간 등장한다 (globals.css 참고).
 */
export function useActiveSection(sectionRefs: SectionRefs): number {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const sections = sectionRefs.current.filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.dataset.inview = '';
          setActive(sections.indexOf(el));
        }
      },
      // 높이 0 인 가운데 선과 겹치는 섹션만 잡는다. 섹션 높이와 무관하게 항상 하나만 걸린다.
      { rootMargin: '-50% 0px -50% 0px' },
    );

    for (const el of sections) observer.observe(el);
    return () => observer.disconnect();
  }, [sectionRefs]);

  return active;
}
