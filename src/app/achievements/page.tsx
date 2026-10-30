'use client';

import CmsImage from '@/components/CmsImage';
import FilterTabs, { useTabGroups } from '@/components/common/FilterTabs';
import ImagePlaceholder from '@/components/common/ImagePlaceholder';
import QueryState from '@/components/common/QueryState';
import { achievementYearOf, compareYearKeys } from '@/components/common/tab-keys';
import { achievementsQueryKey, useAchievements } from '@/hooks/useApi';
import { ARCHIVE_HERO_PLACEHOLDER } from '@/lib/hero-placeholders';
import { IMAGE_QUALITY } from '@/lib/image-loader';
import { SURFACE_SIZES } from '@/lib/image-sizes';
import Image from 'next/image';

export default function AchievementsPage() {
  const achievementsQuery = useAchievements();
  // 연도별 그룹핑과 선택한 연도 탭
  const {
    keys: yearKeys,
    active: activeYear,
    select,
    activeItems,
  } = useTabGroups(achievementsQuery.data, achievementYearOf, compareYearKeys);

  return (
    <div className="min-h-screen bg-gradient-achievements">
      <section
        className="snap-section relative min-h-[100svh] overflow-hidden"
        style={{
          backgroundColor: ARCHIVE_HERO_PLACEHOLDER.dominantColor,
          backgroundImage: `url(${ARCHIVE_HERO_PLACEHOLDER.blurDataUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}>
        <Image
          src="/archiveImage.png"
          alt="업적 소개 대표 이미지"
          fill
          priority
          sizes={SURFACE_SIZES.hero}
          quality={IMAGE_QUALITY}
          className="object-cover object-center"
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
          className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2 animate-bounce text-white/75 transition-opacity hover:opacity-90">
          <span className="sr-only">업적 내용으로 이동</span>
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

      {/* scroll-mt: lg 아래는 pt-14 가 고정 헤더보다 얕아 #앵커로 오면 탭이 헤더에 가려진다. lg(스냅 구간)는 pt-28 로 충분해 0. */}
      <div
        id="achievements-content"
        className="snap-section mx-auto max-w-7xl scroll-mt-12 px-4 pb-20 pt-14 sm:px-6 lg:scroll-mt-0 lg:pt-28">
        {/* 연도 탭 */}
        <FilterTabs label="업적 연도" keys={yearKeys} active={activeYear} onSelect={select} className="mb-12" />

        {/* 불러오는 중·실패·빈 상태 */}
        <QueryState query={achievementsQuery} emptyText="등록된 업적이 없습니다." />

        {/* 업적 카드 그리드 */}
        {activeItems.length > 0 && (
          <div
            key={activeYear ?? 'all'}
            className="reveal-up grid gap-8 sm:grid-cols-2 sm:gap-10 lg:grid-cols-3 lg:gap-12">
            {activeItems.map((achievement) => (
              <div
                key={achievement.id}
                className="content-visibility-auto group flex flex-col overflow-hidden rounded-[20px] border border-muruk-green-primary bg-white shadow-md transition-all hover:-translate-y-1 hover:shadow-xl">
                {/* 썸네일 이미지 (16:10) */}
                <div className="aspect-[16/10] w-full shrink-0 overflow-hidden bg-gray-200">
                  <CmsImage
                    src={achievement.thumbnailUrl}
                    alt={achievement.name}
                    width={800}
                    height={500}
                    sizes={SURFACE_SIZES.achievements}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    position={achievement.thumbnailPosition}
                    invalidateQueryKey={achievementsQueryKey}
                    fallback={
                      <ImagePlaceholder emoji="🏆" className="bg-muruk-green-lightest/30 text-muruk-green-muted/30" />
                    }
                  />
                </div>

                {/* 정보 영역 */}
                <div className="flex flex-1 border-t border-muruk-green-primary bg-white p-4 sm:p-6">
                  {/* 수상명은 길이 제한이 없다(예: '최은옥 교육부 차관'). 제목 칸이 basis(10rem)보다 좁아지면
                      수상명이 제목 위 한 줄로 내려간다. 짧으면 지금처럼 제목 오른쪽.
                      row-reverse 라 DOM 순서(수상명 → 제목)대로 읽히고, 한 줄일 때는 수상명이 오른쪽에 선다. */}
                  <div className="flex flex-1 flex-row-reverse flex-wrap items-start justify-end gap-x-3 gap-y-2">
                    {achievement.award && (
                      <span className="max-w-full text-2xl font-bold text-muruk-green-award">{achievement.award}</span>
                    )}
                    <div className="min-w-0 flex-1 basis-40">
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
