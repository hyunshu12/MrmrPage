import type { Achievement, Member, Project } from '@/types';

/**
 * 연도·기수 탭으로 묶는 규칙. 페이지(useTabGroups)와 스플래시 프리로드(lib/boot-plan)가 같은 함수를 쓴다.
 * 화면 코드를 끌어오지 않도록 컴포넌트와 따로 둔다.
 */

const OTHER_YEAR = '기타';
const UNSORTED_GENERATION = '미분류';

export const projectYearOf = (project: Project) => project.year?.trim() || OTHER_YEAR;

/** 연도를 비워 두면 날짜의 연도를 쓴다 (Studio 안내와 같은 규칙). */
export const achievementYearOf = (achievement: Achievement) =>
  achievement.year?.trim() || achievement.date?.split('-')[0]?.trim() || OTHER_YEAR;

export const memberGenerationOf = (member: Member) => member.murukGeneration?.trim() || UNSORTED_GENERATION;

function firstNumber(value: string, pattern: RegExp): number | null {
  const match = value.match(pattern);
  if (!match) return null;
  const num = Number(match[1]);
  return Number.isFinite(num) ? num : null;
}

/** 숫자가 큰(최근) 키가 앞, 숫자가 없는 키는 그 뒤, 나머지 키(lastKey)는 맨 뒤. */
function compareNewestFirst(a: string, b: string, pattern: RegExp, lastKey: string): number {
  if (a === lastKey) return 1;
  if (b === lastKey) return -1;
  const an = firstNumber(a, pattern);
  const bn = firstNumber(b, pattern);
  if (an !== null && bn !== null) return bn - an;
  if (an !== null) return -1;
  if (bn !== null) return 1;
  return b.localeCompare(a, 'ko');
}

export const compareYearKeys = (a: string, b: string) => compareNewestFirst(a, b, /(\d{4})/, OTHER_YEAR);

export const compareGenerationKeys = (a: string, b: string) => compareNewestFirst(a, b, /(\d+)/, UNSORTED_GENERATION);

/** 항목을 탭 키별로 묶는다. keys 는 compareKeys 순서이고 첫 키가 기본 탭이다. */
export function groupByTab<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  compareKeys: (a: string, b: string) => number,
): { keys: string[]; groups: Map<string, T[]> } {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const group = groups.get(key);
    if (group) group.push(item);
    else groups.set(key, [item]);
  }
  return { keys: [...groups.keys()].sort(compareKeys), groups };
}
