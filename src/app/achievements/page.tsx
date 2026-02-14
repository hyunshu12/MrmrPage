'use client';

import { useAchievements } from '@/hooks/useApi';
import { useEffect, useMemo, useRef, useState } from 'react';

function parseYear(value: string): number | null {
  const match = value.match(/(\d{4})/);
  if (!match) return null;
  const year = Number(match[1]);
  return Number.isFinite(year) ? year : null;
}

export default function AchievementsPage() {
  const achievementsQuery = useAchievements();
  const achievements = achievementsQuery.data ?? [];
  const error = achievementsQuery.isError;
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const lockRef = useRef(false);
  const wheelDeltaAccumRef = useRef(0);
  const wheelResetTimerRef = useRef<number | null>(null);

  // 연도별 그룹핑
  const { yearKeys, achievementsByYear } = useMemo(() => {
    const byYear: Record<string, typeof achievements> = {};
    for (const a of achievements) {
      const key = a.year?.trim() || a.date?.split('-')[0]?.trim() || '기타';
      if (!byYear[key]) byYear[key] = [];
      byYear[key].push(a);
    }
    const keys = Object.keys(byYear).sort((a, b) => {
      if (a === '기타') return 1;
      if (b === '기타') return -1;
      const ay = parseYear(a);
      const by = parseYear(b);
      if (ay !== null && by !== null) return by - ay;
      if (ay !== null) return -1;
      if (by !== null) return 1;
      return b.localeCompare(a, 'ko');
    });
    return { yearKeys: keys, achievementsByYear: byYear };
  }, [achievements]);

  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const activeYear = selectedYear ?? yearKeys[0] ?? null;
  const filteredAchievements = activeYear ? (achievementsByYear[activeYear] ?? []) : [];

  useEffect(() => {
    const sections = sectionRefs.current.filter(Boolean) as HTMLElement[];
    if (sections.length === 0) return;

    const findClosestSection = () => {
      const y = window.scrollY + window.innerHeight * 0.35;
      let closest = 0;
      let minDist = Number.POSITIVE_INFINITY;
      for (let i = 0; i < sections.length; i += 1) {
        const dist = Math.abs(sections[i].offsetTop - y);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      }
      return closest;
    };

    const handleWheel = (event: WheelEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('a, button, input, textarea, select')) return;
      // 자연스러운 사용성을 위해 히어로 섹션에서만 스냅 전환을 사용한다.
      if (findClosestSection() > 0) return;
      if (Math.abs(event.deltaY) < 1.5) return;
      if (lockRef.current) {
        event.preventDefault();
        return;
      }

      const deltaUnit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      const normalizedDelta = event.deltaY * deltaUnit;

      if (wheelResetTimerRef.current !== null) {
        window.clearTimeout(wheelResetTimerRef.current);
      }
      if (wheelDeltaAccumRef.current !== 0 && Math.sign(wheelDeltaAccumRef.current) !== Math.sign(normalizedDelta)) {
        wheelDeltaAccumRef.current = 0;
      }
      wheelDeltaAccumRef.current += normalizedDelta;
      wheelResetTimerRef.current = window.setTimeout(() => {
        wheelDeltaAccumRef.current = 0;
      }, 320);

      const WHEEL_TRIGGER_THRESHOLD = 90;
      if (Math.abs(wheelDeltaAccumRef.current) < WHEEL_TRIGGER_THRESHOLD) return;

      const current = findClosestSection();
      const direction = wheelDeltaAccumRef.current > 0 ? 1 : -1;
      const next = Math.min(Math.max(current + direction, 0), sections.length - 1);
      if (next === current) return;

      wheelDeltaAccumRef.current = 0;
      lockRef.current = true;
      event.preventDefault();
      sections[next].scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => {
        lockRef.current = false;
      }, 700);
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (!['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Space'].includes(event.key)) return;
      // 콘텐츠 섹션에서는 기본 키 스크롤을 유지한다.
      if (findClosestSection() > 0) return;
      if (lockRef.current) {
        event.preventDefault();
        return;
      }
      const current = findClosestSection();
      let next = current;
      if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === 'Space') next = current + 1;
      if (event.key === 'ArrowUp' || event.key === 'PageUp') next = current - 1;
      next = Math.min(Math.max(next, 0), sections.length - 1);
      if (next === current) return;

      lockRef.current = true;
      event.preventDefault();
      sections[next].scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => {
        lockRef.current = false;
      }, 700);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeydown);
      if (wheelResetTimerRef.current !== null) {
        window.clearTimeout(wheelResetTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-achievements">
      <section
        ref={(el) => {
          sectionRefs.current[0] = el;
        }}
        className="relative h-screen overflow-hidden"
      >
        <img
          src="/archiveImage.png"
          alt="업적 소개 대표 이미지"
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/28 via-black/42 to-black/62" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center">
          <div className="rounded-2xl bg-black/18 px-8 py-6 backdrop-blur-[2px]">
            <p className="reveal-up text-sm font-semibold tracking-[0.2em] text-white/90">ACHIEVEMENT</p>
            <h1 className="reveal-up delay-1 mt-4 text-4xl font-bold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] sm:text-5xl">
              동아리의 업적
            </h1>
            <p className="reveal-up delay-2 mx-auto mt-4 max-w-xl text-lg leading-relaxed text-white/92">
              도전의 과정에서 만들어낸 결과와 성장을 기록합니다.
            </p>
          </div>
        </div>
        <a
          href="#achievements-content"
          aria-label="업적 내용으로 이동"
          className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2 animate-bounce text-white/75 transition-opacity hover:opacity-90"
        >
          <svg className="mx-auto h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </a>
      </section>

      <div
        id="achievements-content"
        ref={(el) => {
          sectionRefs.current[1] = el;
        }}
        className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:pt-20"
      >
        {/* 연도 탭 */}
        {yearKeys.length > 0 && (
          <div className="mb-12 flex flex-wrap gap-3 pb-2">
            {yearKeys.map((year) => {
              const isActive = year === activeYear;
              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => setSelectedYear(year)}
                  className={`whitespace-nowrap rounded-btn border px-5 py-2.5 text-base font-semibold transition-all duration-300 ease-out ${
                    isActive
                      ? 'translate-y-[-1px] scale-[1.02] border-muruk-green-border bg-muruk-green-sage text-white shadow-md'
                      : 'border-transparent bg-muruk-card-bg text-muruk-green-muted hover:-translate-y-0.5 hover:bg-muruk-green-sage/20 hover:shadow-sm'
                  }`}
                >
                  {year}
                </button>
              );
            })}
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div className="mb-6 rounded-card bg-red-50/80 border border-red-200 p-4 text-red-700">
            <p>데이터를 불러오는데 실패했습니다.</p>
          </div>
        )}

        {/* 빈 상태 */}
        {achievements.length === 0 && !error && !achievementsQuery.isLoading && (
          <div className="rounded-card bg-muruk-card-bg p-12 text-center text-muruk-green-muted">
            등록된 업적이 없습니다.
          </div>
        )}

        {/* 업적 카드 그리드 */}
        {filteredAchievements.length > 0 && (
          <div key={activeYear ?? 'all'} className="reveal-up grid gap-12 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className="content-visibility-auto group flex flex-col overflow-hidden rounded-[20px] border border-muruk-green-primary bg-white shadow-md transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                {/* 썸네일 이미지 */}
                <div className="aspect-[2/1] w-full shrink-0 overflow-hidden bg-gray-200">
                  {achievement.thumbnailUrl ? (
                    <img
                      src={achievement.thumbnailUrl}
                      alt={achievement.name}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muruk-green-lightest/30">
                      <span className="text-5xl text-muruk-green-muted/30">🏆</span>
                    </div>
                  )}
                </div>

                {/* 정보 영역 */}
                <div className="flex flex-1 border-t border-muruk-green-primary bg-white p-6">
                  <div className="flex flex-1 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-semibold leading-snug text-gray-900">
                        {achievement.name}
                      </h2>
                      <div className="mt-3 space-y-1 text-sm text-gray-600">
                        {(achievement.team || achievement.members.length > 0) && (
                          <p className="truncate">
                            {achievement.team ?? '팀'}
                            {achievement.members.length > 0 ? ` - ${achievement.members.join(', ')}` : ''}
                          </p>
                        )}
                        {achievement.date && <p>{achievement.date}</p>}
                      </div>
                    </div>
                    {achievement.award && (
                      <span className="shrink-0 text-2xl font-bold text-muruk-green-award">
                        {achievement.award}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
