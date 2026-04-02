'use client';

import { useScrollSnap } from '@/hooks/useScrollSnap';
import type { Achievement } from '@/types';
import { useMemo, useState } from 'react';

function parseYear(value: string): number | null {
  const match = value.match(/(\d{4})/);
  if (!match) return null;
  const year = Number(match[1]);
  return Number.isFinite(year) ? year : null;
}

interface AchievementsPageClientProps {
  achievements: Achievement[];
}

export default function AchievementsPageClient({ achievements }: AchievementsPageClientProps) {
  const { sectionRefs } = useScrollSnap({ onlyFromFirst: true });

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

  return (
    <div className="min-h-screen bg-gradient-achievements">
      <section
        ref={(el) => {
          sectionRefs.current[0] = el;
        }}
        className="relative min-h-[100svh] overflow-hidden"
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
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4 text-center">
          <div className="rounded-2xl bg-black/18 px-5 py-5 backdrop-blur-[2px] sm:px-8 sm:py-6">
            <p className="reveal-up text-sm font-semibold tracking-[0.2em] text-white/90">ACHIEVEMENT</p>
            <h1 className="reveal-up delay-1 mt-4 text-3xl font-bold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] sm:text-4xl lg:text-5xl">
              동아리의 업적
            </h1>
            <p className="text-balance-safe reveal-up delay-2 mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/92 sm:text-lg">
              도전의 과정에서 만들어낸 결과와 성장을 기록합니다.
            </p>
          </div>
        </div>
        <a
          href="#achievements-content"
          aria-label="업적 내용으로 이동"
          className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2 animate-bounce text-white/75 transition-opacity hover:opacity-90"
        >
          <svg
            aria-hidden="true"
            focusable="false"
            className="mx-auto h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </a>
      </section>

      <div
        id="achievements-content"
        ref={(el) => {
          sectionRefs.current[1] = el;
        }}
        className="mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 lg:pt-20"
      >
        {/* 연도 탭 */}
        {yearKeys.length > 0 && (
          <div className="mb-12 flex flex-wrap gap-2.5 pb-2 sm:gap-3">
            {yearKeys.map((year) => {
              const isActive = year === activeYear;
              return (
                <button
                  key={year}
                  type="button"
                  onClick={() => setSelectedYear(year)}
                  className={`whitespace-nowrap rounded-btn border px-4 py-2 text-sm font-semibold transition-all duration-300 ease-out sm:px-5 sm:py-2.5 sm:text-base ${
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

        {/* 빈 상태 */}
        {achievements.length === 0 && (
          <div className="rounded-card bg-muruk-card-bg p-12 text-center text-muruk-green-muted">
            등록된 업적이 없습니다.
          </div>
        )}

        {/* 업적 카드 그리드 */}
        {filteredAchievements.length > 0 && (
          <div key={activeYear ?? 'all'} className="reveal-up grid gap-8 sm:grid-cols-2 sm:gap-10 lg:grid-cols-3 lg:gap-12">
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
                <div className="flex flex-1 border-t border-muruk-green-primary bg-white p-4 sm:p-6">
                  <div className="flex flex-1 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-balance-safe text-base font-semibold leading-snug text-gray-900">
                        {achievement.name}
                      </h2>
                      <div className="mt-3 space-y-1 text-xs text-gray-600 sm:text-sm">
                        {(achievement.team || achievement.members.length > 0) && (
                          <p className="text-balance-safe break-words">
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
