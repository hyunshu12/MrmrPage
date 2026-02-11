'use client';

import { achievementsQueryKey, membersQueryKey, projectsQueryKey } from '@/hooks/useApi';
import { fetchAchievements, fetchMembers, fetchProjects } from '@/lib/api-client';
import type { Achievement, Member, Project } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

type BootState =
  | { status: 'loading'; loaded: number; total: number; phase: string }
  | { status: 'ready' }
  | { status: 'error'; message: string };

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
  const [state, setState] = useState<BootState>({ status: 'loading', loaded: 0, total: 0, phase: '데이터 로딩 중' });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setState({ status: 'loading', loaded: 0, total: 3, phase: '데이터 로딩 중' });

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

        setState({ status: 'loading', loaded: 0, total: urls.length, phase: '이미지 로딩 중' });

        await preloadImages(urls, (loaded, total) => {
          if (cancelled) return;
          setState({ status: 'loading', loaded, total, phase: '이미지 로딩 중' });
        });

        if (cancelled) return;

        setState({ status: 'ready' });
      } catch (e) {
        if (cancelled) return;
        const message = e instanceof Error ? e.message : 'Unknown error';
        setState({ status: 'error', message });
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  if (state.status === 'ready') {
    return <>{children}</>;
  }

  if (state.status === 'error') {
    return (
      <div className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="mb-4 text-2xl font-semibold">로딩 실패</h1>
        <p className="text-gray-700">{state.message}</p>
        <p className="mt-2 text-sm text-gray-500">페이지를 새로고침해 주세요.</p>
      </div>
    );
  }

  const progressText = state.total > 0 ? `${Math.min(state.loaded, state.total)} / ${state.total}` : `${state.loaded}`;

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <h1 className="mb-4 text-2xl font-semibold">준비 중…</h1>
      <p className="mb-4 text-gray-700">{state.phase}</p>
      <div className="h-2 w-full overflow-hidden rounded bg-gray-200">
        <div
          className="h-full bg-gray-900 transition-all"
          style={{
            width: state.total > 0 ? `${Math.round((state.loaded / state.total) * 100)}%` : '0%',
          }}
        />
      </div>
      <p className="mt-2 text-sm text-gray-500">{progressText}</p>
    </div>
  );
}
