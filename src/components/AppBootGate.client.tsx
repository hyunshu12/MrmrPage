'use client';

import { achievementsQueryKey, membersQueryKey, projectsQueryKey } from '@/hooks/useApi';
import { fetchAchievements, fetchMembers, fetchProjects } from '@/lib/api-client';
import { hasCache } from '@/lib/local-cache';
import type { Achievement, Member, Project } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

const HERO_IMAGE_URLS = ['/memberImage.png', '/projectImage.png', '/archiveImage.png'] as const;
const MAX_CONTENT_IMAGE_PRELOAD = 20;
const SPLASH_TIMEOUT_MS = 8000;
const NEXT_IMAGE_QUALITY = 75;

/**
 * 각 surface의 next/image `sizes` 문자열. 컴포넌트의 실제 prop과 byte 단위로 일치해야 한다.
 * (verified)
 *   - hero        : members/projects/achievements page.tsx → sizes="100vw"
 *   - members     : members/MembersTabs.client.tsx:107
 *   - projects    : app/projects/page.tsx:159
 *   - achievements: app/achievements/page.tsx:159
 * 홈(app/page.tsx)의 카드는 동일 raw URL을 "(min-width:1024px) 50vw, 100vw"로 렌더하지만,
 * AppBootGate가 워밍업하는 대상은 "다른 라우트"(members/projects/achievements 상세)이므로
 * 각 surface는 해당 상세 페이지의 sizes로 계산한다. 홈 카드는 현재 문서이므로 next/image의
 * priority/lazy가 자체적으로 처리한다.
 */
const HERO_SIZES = '100vw';
const SURFACE_SIZES = {
  members: '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw',
  projects: '(min-width: 640px) 40vw, 100vw',
  achievements: '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw',
} as const;
type Surface = keyof typeof SURFACE_SIZES;

/**
 * next.config.ts에 custom deviceSizes/imageSizes가 없으므로 Next 16 기본값을 그대로 사용한다.
 * 이 두 배열이 next.config.ts에서 커스터마이즈되면 여기도 반드시 동기화해야 한다. (verified)
 */
const DEVICE_SIZES = [640, 750, 828, 1080, 1200, 1920, 2048, 3840] as const;
const IMAGE_SIZES = [16, 32, 48, 64, 96, 128, 256, 384] as const;
const ALL_SIZES = [...IMAGE_SIZES, ...DEVICE_SIZES].sort((a, b) => a - b);

function uniqueNonEmpty(urls: Array<string | null | undefined>): string[] {
  return Array.from(new Set(urls.filter((u): u is string => typeof u === 'string' && u.length > 0)));
}

function buildNextImageUrl(src: string, width: number, quality = NEXT_IMAGE_QUALITY): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}

/**
 * next/image의 srcset 후보 집합을 재현한다. (Next get-img-props.ts의 getWidths)
 * sizes에 vw 토큰이 있으면 가장 작은 vw 비율(smallestRatio)을 구해
 * `ALL_SIZES.filter(s => s >= DEVICE_SIZES[0] * smallestRatio)`로 후보를 만든다.
 * → 이 때문에 imageSizes(256/384)도 후보에 포함될 수 있다(작은 슬롯의 DPR1 케이스).
 * sizes에 vw가 없으면 deviceSizes 전체가 후보다.
 */
function getSrcsetCandidates(sizes: string): number[] {
  const viewportWidthRe = /(^|\s)(1?\d?\d)vw/g;
  const percents: number[] = [];
  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: regex exec loop는 의도된 패턴
  while ((match = viewportWidthRe.exec(sizes)) !== null) {
    percents.push(Number.parseInt(match[2], 10));
  }
  if (percents.length > 0) {
    const smallestRatio = Math.min(...percents) * 0.01;
    return ALL_SIZES.filter((s) => s >= DEVICE_SIZES[0] * smallestRatio);
  }
  return [...DEVICE_SIZES];
}

/**
 * 주어진 innerWidth에서 sizes 미디어 조건을 평가해 슬롯 CSS 폭(px)을 구한다.
 * "(min-width: Npx) Xvw" 조건은 순서대로 평가하여 처음 매칭되는 것을 채택하고,
 * 미디어 조건이 없는 마지막 "Xvw"가 fallback이다.
 */
function resolveSlotCssPx(sizes: string, innerWidth: number): number {
  const parts = sizes.split(',').map((p) => p.trim());
  for (const part of parts) {
    const conditional = part.match(/^\(min-width:\s*(\d+)px\)\s*(\d+)vw$/);
    if (conditional) {
      if (innerWidth >= Number.parseInt(conditional[1], 10)) {
        return (innerWidth * Number.parseInt(conditional[2], 10)) / 100;
      }
      continue;
    }
    const plain = part.match(/^(\d+)vw$/);
    if (plain) {
      return (innerWidth * Number.parseInt(plain[1], 10)) / 100;
    }
  }
  return innerWidth;
}

/**
 * 현재 디바이스(innerWidth + DPR)에서 실제 <Image>가 고를 단 하나의 width를 예측한다.
 * 브라우저의 "select an image source"는 srcset 후보 중 (슬롯CSS폭 × DPR) 이상인 가장 작은
 * 후보를 고른다. 후보가 모두 작으면 가장 큰 후보를 쓴다.
 */
function predictNextImageWidth(sizes: string): number {
  const candidates = getSrcsetCandidates(sizes);
  const innerWidth = typeof window !== 'undefined' && window.innerWidth > 0 ? window.innerWidth : 1280;
  const dpr = typeof window !== 'undefined' && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1;
  const target = resolveSlotCssPx(sizes, innerWidth) * dpr;
  return candidates.find((w) => w >= target) ?? candidates[candidates.length - 1];
}

/**
 * raw URL들을 현재 디바이스가 실제로 요청할 단일 변환 URL로 매핑한다.
 * 정확히 한 width만 생성하므로 byte 낭비가 없고, DPR/viewport가 무엇이든 캐시가 적중한다.
 */
function expandToTransformedUrls(rawUrls: string[], sizes: string): string[] {
  const width = predictNextImageWidth(sizes);
  return rawUrls.map((url) => buildNextImageUrl(url, width));
}

/**
 * 콘텐츠 이미지(멤버 avatar / 프로젝트 logo / 업적 thumbnail)를 각 surface의 sizes로
 * 변환 URL화한다. surface별 raw URL은 dedupe하고, 전체 합계에 글로벌 상한을 적용해
 * 다수 코호트(3기/2기/1기)로 인한 요청 폭증을 막는다. surface 간 동일 URL은
 * preloadImages 내부의 uniqueNonEmpty가 다시 한 번 dedupe한다.
 */
function buildContentTransformedUrls(members: Member[], projects: Project[], achievements: Achievement[]): string[] {
  const bySurface: Record<Surface, string[]> = {
    members: uniqueNonEmpty(members.map((m) => m.avatarUrl)),
    projects: uniqueNonEmpty(projects.map((p) => p.logoUrl)),
    achievements: uniqueNonEmpty(achievements.map((a) => a.thumbnailUrl)),
  };
  const transformed: string[] = [];
  let remaining = MAX_CONTENT_IMAGE_PRELOAD;
  for (const surface of Object.keys(bySurface) as Surface[]) {
    if (remaining <= 0) break;
    const rawUrls = bySurface[surface].slice(0, remaining);
    remaining -= rawUrls.length;
    transformed.push(...expandToTransformedUrls(rawUrls, SURFACE_SIZES[surface]));
  }
  return transformed;
}

function preloadImages(urls: string[]): Promise<void> {
  const uniqueUrls = uniqueNonEmpty(urls);
  if (uniqueUrls.length === 0) return Promise.resolve();
  return Promise.allSettled(
    uniqueUrls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onerror = () => resolve();
          if (typeof img.decode === 'function') {
            img.src = url;
            img
              .decode()
              .then(() => resolve())
              .catch(() => resolve());
          } else {
            img.onload = () => resolve();
            img.src = url;
          }
        }),
    ),
  ).then(() => undefined);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(null), ms);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        window.clearTimeout(timer);
        resolve(null);
      });
  });
}

function Splash() {
  return (
    <div aria-hidden="true" className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-home">
      <div className="flex flex-col items-center gap-6">
        <img
          src="/logo.png"
          alt=""
          width={120}
          height={120}
          className="float-slow h-28 w-28 object-contain sm:h-32 sm:w-32"
        />
        <div className="h-1 w-24 overflow-hidden rounded-full bg-muruk-green-lightest/40">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-muruk-green-primary/70" />
        </div>
      </div>
    </div>
  );
}

export default function AppBootGate({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const allCached = hasCache(membersQueryKey) && hasCache(projectsQueryKey) && hasCache(achievementsQueryKey);

    if (allCached) {
      setReady(true);
      void runBackgroundWarmup();
      return () => {
        cancelled = true;
      };
    }

    void runFirstVisitBoot();

    async function runFirstVisitBoot() {
      const dataPromise = Promise.all([
        queryClient.ensureQueryData<Member[]>({
          queryKey: membersQueryKey,
          queryFn: ({ signal }) => fetchMembers(signal),
        }),
        queryClient.ensureQueryData<Project[]>({
          queryKey: projectsQueryKey,
          queryFn: ({ signal }) => fetchProjects(signal),
        }),
        queryClient.ensureQueryData<Achievement[]>({
          queryKey: achievementsQueryKey,
          queryFn: ({ signal }) => fetchAchievements(signal),
        }),
      ]);

      // hero를 페이지의 next/image와 동일한 변환 URL로 프리로드 (캐시 적중)
      // 히어로는 sizes="100vw"이므로 hero 전용 sizes로 현재 디바이스 width를 예측한다.
      const heroPromise = preloadImages(expandToTransformedUrls([...HERO_IMAGE_URLS], HERO_SIZES));
      const result = await withTimeout(dataPromise, SPLASH_TIMEOUT_MS);
      if (cancelled) return;

      if (result) {
        const [members, projects, achievements] = result;
        const contentTransformedUrls = buildContentTransformedUrls(members, projects, achievements);
        const remainingMs = Math.max(SPLASH_TIMEOUT_MS - 1000, 1000);
        // hero 우선 보장: hero 완료 후 콘텐츠 시작 (잔여 시간 내 둘 다 완료 시도)
        await withTimeout(
          heroPromise.then(() => preloadImages(contentTransformedUrls)),
          remainingMs,
        );
      } else {
        // 데이터가 timeout 안에 안 와도 hero만이라도 1초 추가 시도
        await withTimeout(heroPromise, 1000);
      }

      if (cancelled) return;
      setReady(true);
    }

    async function runBackgroundWarmup() {
      try {
        const [members, projects, achievements] = await Promise.all([
          queryClient.ensureQueryData<Member[]>({
            queryKey: membersQueryKey,
            queryFn: ({ signal }) => fetchMembers(signal),
          }),
          queryClient.ensureQueryData<Project[]>({
            queryKey: projectsQueryKey,
            queryFn: ({ signal }) => fetchProjects(signal),
          }),
          queryClient.ensureQueryData<Achievement[]>({
            queryKey: achievementsQueryKey,
            queryFn: ({ signal }) => fetchAchievements(signal),
          }),
        ]);

        if (cancelled) return;
        const heroTransformedUrls = expandToTransformedUrls([...HERO_IMAGE_URLS], HERO_SIZES);
        const transformedUrls = [
          ...heroTransformedUrls,
          ...buildContentTransformedUrls(members, projects, achievements),
        ];

        const requestIdleCallbackFn =
          'requestIdleCallback' in window ? window.requestIdleCallback.bind(window) : undefined;
        if (requestIdleCallbackFn) {
          requestIdleCallbackFn(() => {
            void preloadImages(transformedUrls);
          });
        } else {
          window.setTimeout(() => {
            void preloadImages(transformedUrls);
          }, 0);
        }
      } catch (e) {
        if (cancelled) return;
        console.error('AppBootGate background warmup failed:', e);
      }
    }

    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  if (!ready) return <Splash />;
  return <>{children}</>;
}
