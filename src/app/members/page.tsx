'use client';

import nextDynamic from 'next/dynamic';
import { useMembers } from '@/hooks/useApi';

const MembersTabs = nextDynamic(() => import('@/components/members/MembersTabs.client'), {
  ssr: true,
  loading: () => null,
});
import { useEffect, useRef } from 'react';

export default function MembersPage() {
  const membersQuery = useMembers();
  const members = membersQuery.data ?? [];
  const error = membersQuery.isError;
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const lockRef = useRef(false);
  const wheelDeltaAccumRef = useRef(0);
  const wheelResetTimerRef = useRef<number | null>(null);

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
    <div className="min-h-screen bg-gradient-members">
      <section
        ref={(el) => {
          sectionRefs.current[0] = el;
        }}
        className="relative h-screen overflow-hidden"
      >
        <img
          src="/memberImage.png"
          alt="멤버 소개 대표 이미지"
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/28 via-black/42 to-black/62" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center">
          <div className="rounded-2xl bg-black/18 px-8 py-6 backdrop-blur-[2px]">
            <p className="reveal-up text-sm font-semibold tracking-[0.2em] text-white/90">MEMBERS</p>
            <h1 className="reveal-up delay-1 mt-4 text-4xl font-bold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] sm:text-5xl">
            함께하는 멤버들
            </h1>
            <p className="reveal-up delay-2 mx-auto mt-4 max-w-xl text-lg leading-relaxed text-white/92">
              기획, 디자인, 개발이 함께 모여 더 나은 결과를 만듭니다.
            </p>
          </div>
        </div>
        <a
          href="#members-content"
          aria-label="멤버 소개 내용으로 이동"
          className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2 animate-bounce text-white/75 transition-opacity hover:opacity-90"
        >
          <svg className="mx-auto h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </a>
      </section>

      <div
        id="members-content"
        ref={(el) => {
          sectionRefs.current[1] = el;
        }}
        className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 lg:pt-20"
      >
        {/* 에러 */}
        {error && (
          <div className="mb-6 rounded-card bg-red-50/80 border border-red-200 p-4 text-red-700">
            <p>데이터를 불러오는데 실패했습니다.</p>
          </div>
        )}

        {/* 빈 상태 */}
        {members.length === 0 && !error && !membersQuery.isLoading && (
          <div className="rounded-card bg-muruk-card-bg p-12 text-center text-muruk-green-muted">
            등록된 멤버가 없습니다.
          </div>
        )}

        {/* 멤버 탭 */}
        {members.length > 0 && <MembersTabs members={members} />}
      </div>
    </div>
  );
}
