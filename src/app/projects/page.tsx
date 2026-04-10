'use client';

import { useProjects } from '@/hooks/useApi';
import { useEffect, useMemo, useRef, useState } from 'react';

function parseYear(value: string): number | null {
  const match = value.match(/(\d{4})/);
  if (!match) return null;
  const year = Number(match[1]);
  return Number.isFinite(year) ? year : null;
}

export default function ProjectsPage() {
  const projectsQuery = useProjects();
  const projects = projectsQuery.data ?? [];
  const error = projectsQuery.isError;
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const lockRef = useRef(false);
  const wheelDeltaAccumRef = useRef(0);
  const wheelResetTimerRef = useRef<number | null>(null);

  // 연도별 그룹핑
  const { yearKeys, projectsByYear } = useMemo(() => {
    const byYear: Record<string, typeof projects> = {};
    for (const p of projects) {
      const key = p.year?.trim() || '기타';
      if (!byYear[key]) byYear[key] = [];
      byYear[key].push(p);
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
    return { yearKeys: keys, projectsByYear: byYear };
  }, [projects]);

  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const activeYear = selectedYear ?? yearKeys[0] ?? null;
  const filteredProjects = activeYear ? (projectsByYear[activeYear] ?? []) : [];

  useEffect(() => {
    const shouldUseSnap = window.matchMedia('(pointer:fine)').matches && window.innerWidth >= 1024;
    if (!shouldUseSnap) return;

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
    <div className="min-h-screen bg-gradient-projects">
      <section
        ref={(el) => {
          sectionRefs.current[0] = el;
        }}
        className="relative min-h-[100svh] overflow-hidden"
      >
        <img
          src="/projectImage.png"
          alt="프로젝트 소개 대표 이미지"
          className="absolute inset-0 h-full w-full scale-[1.12] object-cover object-center"
          style={{ objectPosition: 'calc(50% - 48px) center' }}
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/28 via-black/42 to-black/62" />
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4 text-center">
          <div className="rounded-2xl bg-black/18 px-5 py-5 backdrop-blur-[2px] sm:px-8 sm:py-6">
            <p className="reveal-up text-sm font-semibold tracking-[0.2em] text-white/90">PROJECT</p>
            <h1 className="reveal-up delay-1 mt-4 text-3xl font-bold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] sm:text-4xl lg:text-5xl">
              우리가 만든 프로젝트
            </h1>
            <p className="text-balance-safe reveal-up delay-2 mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/92 sm:text-lg">
              아이디어를 실제 서비스로 구현하며, 팀 협업과 문제 해결 경험을 쌓아갑니다.
            </p>
          </div>
        </div>
        <a
          href="#projects-content"
          aria-label="프로젝트 내용으로 이동"
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
        id="projects-content"
        ref={(el) => {
          sectionRefs.current[1] = el;
        }}
        className="mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 lg:pt-20"
      >
        {/* 연도 탭 */}
        {yearKeys.length > 0 && (
          <div className="mb-12 flex justify-start">
            <div className="flex flex-wrap gap-2.5 pb-2 sm:gap-3">
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
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div className="mb-6 rounded-card bg-red-50/80 border border-red-200 p-4 text-red-700">
            <p>데이터를 불러오는데 실패했습니다.</p>
          </div>
        )}

        {/* 빈 상태 */}
        {projects.length === 0 && !error && !projectsQuery.isLoading && (
          <div className="rounded-card bg-muruk-card-bg p-12 text-center text-muruk-green-muted">
            등록된 프로젝트가 없습니다.
          </div>
        )}

        {/* 프로젝트 카드 그리드 */}
        {filteredProjects.length > 0 && (
          <div key={activeYear ?? 'all'} className="reveal-up grid gap-6 sm:grid-cols-2 sm:gap-8">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="content-visibility-auto group flex flex-col overflow-hidden rounded-card bg-muruk-card-bg shadow-md transition-all hover:-translate-y-1 hover:shadow-xl sm:flex-row"
              >
                <div className="w-full shrink-0 overflow-hidden bg-muruk-green-lightest/30 sm:w-2/5">
                  {project.logoUrl ? (
                    <img
                      src={project.logoUrl}
                      alt={project.name}
                      className="h-full w-full rounded-[30px] object-cover p-4 sm:rounded-[53px]"
                    />
                  ) : (
                    <div className="flex h-full min-h-[200px] w-full items-center justify-center">
                      <span className="text-5xl text-muruk-green-muted/30">🌱</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-center p-5 sm:p-6">
                  <h2 className="text-xl font-semibold text-muruk-green-text sm:text-2xl">{project.name}</h2>
                  {project.description && (
                    <p className="text-balance-safe mt-3 text-sm leading-relaxed text-muruk-green-muted sm:text-base">
                      {project.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
