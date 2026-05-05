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
const NEXT_IMAGE_PRELOAD_WIDTHS = [1920] as const;
const NEXT_IMAGE_QUALITY = 75;

function uniqueNonEmpty(urls: Array<string | null | undefined>): string[] {
  return Array.from(new Set(urls.filter((u): u is string => typeof u === 'string' && u.length > 0)));
}

function buildNextImageUrl(src: string, width: number, quality = NEXT_IMAGE_QUALITY): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}

function expandToTransformedUrls(rawUrls: string[]): string[] {
  const expanded: string[] = [];
  for (const url of rawUrls) {
    for (const width of NEXT_IMAGE_PRELOAD_WIDTHS) {
      expanded.push(buildNextImageUrl(url, width));
    }
  }
  return expanded;
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
      const heroPromise = preloadImages(expandToTransformedUrls([...HERO_IMAGE_URLS]));
      const result = await withTimeout(dataPromise, SPLASH_TIMEOUT_MS);
      if (cancelled) return;

      if (result) {
        const [members, projects, achievements] = result;
        const contentRawUrls = uniqueNonEmpty([
          ...members.map((m) => m.avatarUrl),
          ...projects.map((p) => p.logoUrl),
          ...achievements.map((a) => a.thumbnailUrl),
        ]).slice(0, MAX_CONTENT_IMAGE_PRELOAD);
        const contentTransformedUrls = expandToTransformedUrls(contentRawUrls);
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
        const rawUrls = uniqueNonEmpty([
          ...members.map((m) => m.avatarUrl),
          ...projects.map((p) => p.logoUrl),
          ...achievements.map((a) => a.thumbnailUrl),
        ]).slice(0, MAX_CONTENT_IMAGE_PRELOAD);
        const heroTransformedUrls = expandToTransformedUrls([...HERO_IMAGE_URLS]);
        const transformedUrls = [...heroTransformedUrls, ...expandToTransformedUrls(rawUrls)];

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
