'use client';

import { useMemo, useState } from 'react';
import { groupByTab } from './tab-keys';

/**
 * 목록을 탭(연도·기수)별로 묶고, 지금 보여줄 탭과 그 탭의 항목을 돌려준다.
 * keyOf·compareKeys 는 tab-keys 의 모듈 단위 함수를 넘긴다(렌더마다 새로 만들면 묶음도 매번 다시 계산된다).
 */
export function useTabGroups<T>(
  items: readonly T[] | undefined,
  keyOf: (item: T) => string,
  compareKeys: (a: string, b: string) => number,
) {
  const { keys, groups } = useMemo(() => groupByTab(items ?? [], keyOf, compareKeys), [items, keyOf, compareKeys]);

  // 방문자가 고른 탭. 고른 적이 없거나 데이터 갱신으로 그 탭이 사라졌으면 첫(최신) 탭을 보여준다.
  const [chosen, setChosen] = useState<string | null>(null);
  const active = chosen !== null && groups.has(chosen) ? chosen : (keys[0] ?? null);
  const activeItems = active === null ? [] : (groups.get(active) ?? []);

  return { keys, active, select: setChosen, activeItems };
}

interface FilterTabsProps {
  /** 보조기기가 읽는 버튼 묶음 이름. 예: '프로젝트 연도' */
  label: string;
  keys: readonly string[];
  active: string | null;
  onSelect: (key: string) => void;
  className?: string;
}

/** 연도·기수 필터 버튼. 묶음 이름은 legend 로, 선택 상태는 aria-pressed 로 알린다. */
export default function FilterTabs({ label, keys, active, onSelect, className = '' }: FilterTabsProps) {
  if (keys.length === 0) return null;

  return (
    <fieldset className={className}>
      <legend className="sr-only">{label}</legend>
      <div className="flex flex-wrap gap-2.5 pb-2 sm:gap-3">
        {keys.map((key) => {
          const isActive = key === active;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isActive}
              onClick={() => onSelect(key)}
              className={`whitespace-nowrap rounded-btn border px-4 py-2 text-sm font-semibold transition-all duration-300 ease-out sm:px-5 sm:py-2.5 sm:text-base ${
                isActive
                  ? 'translate-y-[-1px] scale-[1.02] border-muruk-green-border bg-muruk-green-darker text-white shadow-md'
                  : 'border-transparent bg-muruk-card-bg text-muruk-green-text hover:-translate-y-0.5 hover:bg-muruk-green-sage/20 hover:shadow-sm'
              }`}>
              {key}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
