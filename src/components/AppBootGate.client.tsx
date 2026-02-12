'use client';

import { achievementsQueryKey, membersQueryKey, projectsQueryKey } from '@/hooks/useApi';
import { fetchAchievements, fetchMembers, fetchProjects } from '@/lib/api-client';
import type { Achievement, Member, Project } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

const HERO_IMAGE_URLS = ['/memberImage.png', '/projectImage.png', '/archiveImage.png'] as const;
const MAX_CONTENT_IMAGE_PRELOAD = 80;

function uniqueNonEmpty(urls: Array<string | null | undefined>): string[] {
  return Array.from(new Set(urls.filter((u): u is string => typeof u === 'string' && u.length > 0)));
}

async function preloadImages(urls: string[]): Promise<void> {
  const uniqueUrls = uniqueNonEmpty(urls);
  if (uniqueUrls.length === 0) return;

  await Promise.allSettled(
    uniqueUrls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = url;
        }),
    ),
  );
}

export default function AppBootGate({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const heroWarmupPromise = preloadImages([...HERO_IMAGE_URLS]);
        const dataWarmupPromise = Promise.all([
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
        const [dataResult] = await Promise.all([dataWarmupPromise, heroWarmupPromise]);

        if (cancelled) return;
        const [members, projects, achievements] = dataResult;
        const urls = uniqueNonEmpty([
          ...members.map((m) => m.avatarUrl),
          ...projects.map((p) => p.logoUrl),
          ...achievements.map((a) => a.thumbnailUrl),
        ]).slice(0, MAX_CONTENT_IMAGE_PRELOAD);

        // Defer bulk image warmup to idle time so hero paints first.
        const requestIdleCallbackFn =
          'requestIdleCallback' in window ? window.requestIdleCallback.bind(window) : undefined;
        if (requestIdleCallbackFn) {
          requestIdleCallbackFn(() => {
            void preloadImages(urls);
          });
        } else {
          setTimeout(() => {
            void preloadImages(urls);
          }, 0);
        }
      } catch (e) {
        if (cancelled) return;
        console.error('AppBootGate prefetch failed:', e);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [queryClient]);
  return <>{children}</>;
}
