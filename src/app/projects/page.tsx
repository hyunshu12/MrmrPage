'use client';

import CmsImage from '@/components/CmsImage';
import FilterTabs, { useTabGroups } from '@/components/common/FilterTabs';
import ImagePlaceholder from '@/components/common/ImagePlaceholder';
import QueryState from '@/components/common/QueryState';
import { compareYearKeys, projectYearOf } from '@/components/common/tab-keys';
import { projectsQueryKey, useProjects } from '@/hooks/useApi';
import { PROJECT_HERO_PLACEHOLDER } from '@/lib/hero-placeholders';
import { IMAGE_QUALITY } from '@/lib/image-loader';
import { SURFACE_SIZES } from '@/lib/image-sizes';
import Image from 'next/image';

export default function ProjectsPage() {
  const projectsQuery = useProjects();
  // 연도별 그룹핑과 선택한 연도 탭
  const {
    keys: yearKeys,
    active: activeYear,
    select,
    activeItems,
  } = useTabGroups(projectsQuery.data, projectYearOf, compareYearKeys);

  return (
    <div className="min-h-screen bg-gradient-projects">
      <section
        className="snap-section relative min-h-[100svh] overflow-hidden"
        style={{
          backgroundColor: PROJECT_HERO_PLACEHOLDER.dominantColor,
          backgroundImage: `url(${PROJECT_HERO_PLACEHOLDER.blurDataUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}>
        <Image
          src="/projectImage.png"
          alt="프로젝트 소개 대표 이미지"
          fill
          priority
          sizes={SURFACE_SIZES.hero}
          quality={IMAGE_QUALITY}
          className="scale-[1.12] object-cover object-center"
          style={{ objectPosition: 'calc(50% - 48px) center' }}
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
          className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2 animate-bounce text-white/75 transition-opacity hover:opacity-90">
          <span className="sr-only">프로젝트 내용으로 이동</span>
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
        id="projects-content"
        className="snap-section mx-auto max-w-7xl scroll-mt-12 px-4 pb-20 pt-14 sm:px-6 lg:scroll-mt-0 lg:pt-28">
        {/* 연도 탭 */}
        <FilterTabs label="프로젝트 연도" keys={yearKeys} active={activeYear} onSelect={select} className="mb-12" />

        {/* 불러오는 중·실패·빈 상태 */}
        <QueryState query={projectsQuery} emptyText="등록된 프로젝트가 없습니다." />

        {/* 프로젝트 카드 그리드 */}
        {activeItems.length > 0 && (
          <div key={activeYear ?? 'all'} className="reveal-up grid gap-6 sm:grid-cols-2 sm:gap-8">
            {activeItems.map((project) => (
              <div
                key={project.id}
                className="content-visibility-auto group flex flex-col overflow-hidden rounded-card bg-muruk-card-bg shadow-md transition-all hover:-translate-y-1 hover:shadow-xl sm:flex-row">
                <div className="w-full shrink-0 overflow-hidden bg-muruk-green-lightest/30 sm:w-2/5">
                  <CmsImage
                    src={project.logoUrl}
                    alt={project.name}
                    width={600}
                    height={600}
                    sizes={SURFACE_SIZES.projects}
                    className="h-full w-full rounded-[30px] object-cover p-4 sm:rounded-[53px]"
                    // sm~xl 에서는 칸이 세로로 늘어나 좌우가 잘린다. Studio 핫스팟 쪽을 남긴다.
                    position={project.logoPosition}
                    invalidateQueryKey={projectsQueryKey}
                    // 로고와 같은 1:1 상자. sm 이상에서는 글 높이에 맞춰 늘어난다.
                    fallback={<ImagePlaceholder emoji="🌱" className="aspect-square text-muruk-green-muted/30" />}
                  />
                </div>

                <div className="flex flex-1 flex-col justify-center p-5 sm:p-6">
                  <h2 className="text-xl font-semibold text-muruk-green-text sm:text-2xl">{project.name}</h2>
                  {project.description && (
                    // Studio 의 여러 줄 입력이라 줄바꿈을 살린다.
                    <p className="text-balance-safe mt-3 whitespace-pre-line text-sm leading-relaxed text-muruk-green-text/90 sm:text-base">
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
