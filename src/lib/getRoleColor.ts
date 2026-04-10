/**
 * 멤버 역할에 따른 색상 라인 컬러를 반환합니다.
 * - 개발(Developer): 파랑 #2f5eff
 * - 디자인(Designer): 핑크 #ff5fa2
 * - 기획/PM(Project Manager): 민트그린 #2dbe8d
 */
export function getRoleColor(role: string | null): string {
  if (!role) return '#2dbe8d';
  const r = role.toLowerCase();
  if (r.includes('개발') || r.includes('dev')) return '#2f5eff';
  if (r.includes('디자인') || r.includes('design')) return '#ff5fa2';
  if (
    r.includes('기획') ||
    r.includes('pm') ||
    r.includes('프로젝트') ||
    r.includes('매니저') ||
    r.includes('manager')
  )
    return '#2dbe8d';
  return '#2dbe8d';
}
