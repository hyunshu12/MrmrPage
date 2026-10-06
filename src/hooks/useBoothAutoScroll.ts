'use client';

import { type MutableRefObject, useEffect, useState } from 'react';

const DEFAULT_DWELL_MS = 5000;
const SCROLL_SETTLE_MS = 900;
const MIN_DWELL_MS = 1000;
const MAX_DWELL_MS = 60000;

type SectionRefs = MutableRefObject<Array<HTMLElement | null>>;

/**
 * 부스 전시용 자동 순환 모드.
 *
 * `?booth=1` 로 접속했을 때만 켜진다. 파라미터가 없으면 아무 것도 하지 않으므로
 * 일반 방문자의 스크롤 동작에는 영향이 없다.
 *
 * `?booth=1&dwell=8` 처럼 초 단위로 체류 시간을 조절할 수 있다 (기본 5초).
 *
 * 각 섹션에서 체류 시간만큼 머문 뒤 다음 섹션으로 부드럽게 이동하고,
 * 마지막 섹션 다음에는 맨 위로 돌아가 무한 반복한다.
 * 사용자가 마우스/키보드를 만져도 타이머는 멈추지 않는다.
 */
export function useBoothAutoScroll(sectionRefs: SectionRefs): boolean {
  const [enabled, setEnabled] = useState(false);
  const [dwellMs, setDwellMs] = useState(DEFAULT_DWELL_MS);

  // 마운트 후 URL 을 읽는다. SSR 과 첫 렌더 결과를 일치시키기 위해 초기값은 항상 false.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get('booth');
    setEnabled(value !== null && value !== '0' && value !== 'false');

    const dwellSeconds = Number(params.get('dwell'));
    if (Number.isFinite(dwellSeconds) && dwellSeconds > 0) {
      setDwellMs(Math.min(Math.max(dwellSeconds * 1000, MIN_DWELL_MS), MAX_DWELL_MS));
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let index = 0;
    let dwellTimer: number | null = null;
    let cancelled = false;

    const step = () => {
      if (cancelled) return;

      const sections = sectionRefs.current.filter((el): el is HTMLElement => el !== null);
      if (sections.length === 0) {
        // 섹션이 아직 마운트되지 않았다면 다음 주기에 다시 시도한다.
        dwellTimer = window.setTimeout(step, dwellMs);
        return;
      }

      index = (index + 1) % sections.length;

      if (index === 0) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        sections[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      dwellTimer = window.setTimeout(step, dwellMs + SCROLL_SETTLE_MS);
    };

    // 켜지는 순간 항상 맨 위에서 시작한다.
    window.scrollTo({ top: 0, behavior: 'auto' });
    dwellTimer = window.setTimeout(step, dwellMs);

    return () => {
      cancelled = true;
      if (dwellTimer !== null) window.clearTimeout(dwellTimer);
    };
  }, [enabled, dwellMs, sectionRefs]);

  return enabled;
}
