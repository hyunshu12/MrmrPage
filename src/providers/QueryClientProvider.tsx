'use client';

import { achievementsQueryKey, membersQueryKey, projectsQueryKey } from '@/hooks/useApi';
import { readCache, writeCache } from '@/lib/local-cache';
import type { Achievement, Member, Project } from '@/types';
import { QueryClient, QueryClientProvider as RQProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';

const STALE_TIME_MS = 50 * 60 * 1000;
const GC_TIME_MS = 24 * 60 * 60 * 1000;
const REFETCH_INTERVAL_MS = 50 * 60 * 1000;

function hydrateFromLocalCache(client: QueryClient): void {
  const members = readCache<Member[]>(membersQueryKey);
  if (members) client.setQueryData(membersQueryKey, members);

  const projects = readCache<Project[]>(projectsQueryKey);
  if (projects) client.setQueryData(projectsQueryKey, projects);

  const achievements = readCache<Achievement[]>(achievementsQueryKey);
  if (achievements) client.setQueryData(achievementsQueryKey, achievements);
}

function subscribeToCacheUpdates(client: QueryClient): void {
  client.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated') return;
    const { query } = event;
    if (query.state.status !== 'success') return;
    const key = query.queryKey;
    if (key.length !== 1 || (key[0] !== 'members' && key[0] !== 'projects' && key[0] !== 'achievements')) {
      return;
    }
    writeCache(key, query.state.data);
  });
}

export default function QueryClientProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: STALE_TIME_MS,
          gcTime: GC_TIME_MS,
          refetchOnWindowFocus: false,
          refetchOnMount: false,
          refetchOnReconnect: true,
          refetchInterval: REFETCH_INTERVAL_MS,
          refetchIntervalInBackground: false,
          retry: 1,
        },
      },
    });
    hydrateFromLocalCache(client);
    subscribeToCacheUpdates(client);
    return client;
  });

  return <RQProvider client={queryClient}>{children}</RQProvider>;
}
