'use client';

import { achievementsQueryKey, membersQueryKey, projectsQueryKey } from '@/hooks/useApi';
import { fetchAchievements, fetchMembers, fetchProjects } from '@/lib/api-client';
import type { Achievement, Member, Project } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

const HERO_IMAGE_URLS = ['/memberImage.png', '/projectImage.png', '/archiveImage.png'] as const;

function uniqueNonEmpty(urls: Array<string | null | undefined>): string[] {
  return Array.from(new Set(urls.filter((u): u is string => typeof u === 'string' && u.length > 0)));
}

async function preloadImages(urls: string[], onProgress: (loaded: number, total: number) => void): Promise<void> {
  let loaded = 0;
  const total = urls.length;
  onProgress(loaded, total);

  await Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            loaded += 1;
            onProgress(loaded, total);
            resolve();
          };
          img.onerror = () => {
            loaded += 1;
            onProgress(loaded, total);
            resolve();
          };
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
        // Keep hero images warm in cache so route transitions feel instant.
        await preloadImages([...HERO_IMAGE_URLS], () => {
          if (cancelled) return;
        });

        const [members, projects, achievements] = await Promise.all([
          queryClient.fetchQuery<Member[]>({ queryKey: membersQueryKey, queryFn: fetchMembers }),
          queryClient.fetchQuery<Project[]>({ queryKey: projectsQueryKey, queryFn: fetchProjects }),
          queryClient.fetchQuery<Achievement[]>({ queryKey: achievementsQueryKey, queryFn: fetchAchievements }),
        ]);

        if (cancelled) return;

        const urls = uniqueNonEmpty([
          ...members.map((m) => m.avatarUrl),
          ...projects.map((p) => p.logoUrl),
          ...achievements.map((a) => a.thumbnailUrl),
        ]);

        await preloadImages(urls, () => {
          if (cancelled) return;
        });
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
