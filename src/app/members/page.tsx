'use client';

import MembersTabs from '@/components/members/MembersTabs.client';
import { useMembers } from '@/hooks/useApi';
import { useSnapScroll } from '@/hooks/useSnapScroll';
import { useRef } from 'react';

export default function MembersPage() {
  const membersQuery = useMembers();
  const members = membersQuery.data ?? [];
  const error = membersQuery.isError;
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  useSnapScroll(sectionRefs, true);

  return (
    <div className="min-h-screen bg-gradient-members">
      <section
        ref={(el) => {
          sectionRefs.current[0] = el;
        }}
        className="relative min-h-[100svh] overflow-hidden">
        <img
          src="/memberImage.png"
          alt="멤버 소개 대표 이미지"
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/28 via-black/42 to-black/62" />
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4 text-center">
          <div className="rounded-2xl bg-black/18 px-5 py-5 backdrop-blur-[2px] sm:px-8 sm:py-6">
            <p className="reveal-up text-sm font-semibold tracking-[0.2em] text-white/90">MEMBERS</p>
            <h1 className="reveal-up delay-1 mt-4 text-3xl font-bold text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] sm:text-4xl lg:text-5xl">
              함께하는 멤버들
            </h1>
            <p className="text-balance-safe reveal-up delay-2 mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/92 sm:text-lg">
              기획, 디자인, 개발이 함께 모여 더 나은 결과를 만듭니다.
            </p>
          </div>
        </div>
        <a
          href="#members-content"
          aria-label="멤버 소개 내용으로 이동"
          className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2 animate-bounce text-white/75 transition-opacity hover:opacity-90">
          <span className="sr-only">멤버 소개 내용으로 이동</span>
          <svg
            aria-hidden="true"
            focusable="false"
            className="mx-auto h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </a>
      </section>

      <div
        id="members-content"
        ref={(el) => {
          sectionRefs.current[1] = el;
        }}
        className="mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 lg:pt-20">
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
