/**
 * 멤버 카드 이름 아래 선의 색. Studio 의 역할 값(영문 세 가지)과 정확히 맞춘다.
 * - 개발(Developer): 파랑 #2f5eff
 * - 디자인(Designer): 핑크 #ff5fa2
 * - 기획(Project Manager): 민트그린 #2dbe8d
 */
const ROLE_COLORS = new Map([
  ['Developer', '#2f5eff'],
  ['Designer', '#ff5fa2'],
  ['Project Manager', '#2dbe8d'],
]);

/** 역할이 없거나 모르는 값이면 회색. 특정 역할(예: 기획)로 오해하지 않게 한다. */
const NO_ROLE_COLOR = '#a1a1a1';

export function getRoleColor(role: string | null): string {
  return (role && ROLE_COLORS.get(role)) || NO_ROLE_COLOR;
}
