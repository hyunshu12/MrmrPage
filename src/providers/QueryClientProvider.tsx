'use client';

import { achievementsQueryKey, membersQueryKey, projectsQueryKey } from '@/hooks/useApi';
import { isBoothMode } from '@/lib/booth';
import { readCache, writeCache } from '@/lib/local-cache';
import { achievementArraySchema, memberArraySchema, projectArraySchema } from '@/types';
import { QueryClient, type QueryKey, QueryClientProvider as RQProvider, hashKey } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';
import type { ZodType } from 'zod';

/** API 응답은 CDN 이 10분(s-maxage=600) 들고 있다. 클라이언트도 10분이 지나면 다시 확인한다. */
const STALE_TIME_MS = 10 * 60 * 1000;
const GC_TIME_MS = 24 * 60 * 60 * 1000;

/** 재방문 때 바로 그리려고 localStorage 에 남기는 쿼리. 꺼낼 때 같은 스키마로 다시 검사한다. */
const PERSISTED_QUERIES: Array<{ queryKey: QueryKey; schema: ZodType<unknown> }> = [
  { queryKey: membersQueryKey, schema: memberArraySchema },
  { queryKey: projectsQueryKey, schema: projectArraySchema },
  { queryKey: achievementsQueryKey, schema: achievementArraySchema },
];

function restoreFromLocalCache(client: QueryClient): void {
  for (const { queryKey, schema } of PERSISTED_QUERIES) {
    const entry = readCache(queryKey, schema);
    // 받은 시각을 그대로 넘긴다. 그래야 오래된 데이터가 stale 로 판정돼 화면에 뜬 뒤 다시 받아진다.
    if (entry) client.setQueryData(queryKey, entry.data, { updatedAt: entry.savedAt });
  }
}

function persistFetchedData(client: QueryClient): void {
  const persisted = new Set(PERSISTED_QUERIES.map(({ queryKey }) => hashKey(queryKey)));
  client.getQueryCache().subscribe((event) => {
    // 네트워크에서 실제로 받은 응답만 남긴다. setQueryData(위의 복원 포함)도 success 를 내지만 manual 이 붙고,
    // fetch 시작·실패·invalidate 는 success 가 아니다. 그래서 savedAt 은 늘 실제로 받은 시각이다.
    if (event.type !== 'updated' || event.action.type !== 'success' || event.action.manual) return;
    const { query } = event;
    if (!persisted.has(query.queryHash)) return;
    writeCache(query.queryKey, query.state.data, query.state.dataUpdatedAt);
  });
}

export default function QueryClientProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: STALE_TIME_MS,
          gcTime: GC_TIME_MS,
          // 마운트·창 포커스·재연결 때는 기본값대로 stale 이면 다시 받는다. 탭을 오래 띄워 두면
          // (부스 키오스크 포함) 10분마다도 확인한다. 응답은 CDN 이 주므로 싸다.
          refetchInterval: STALE_TIME_MS,
          retry: 1,
          // 부스 데이터는 로컬 서버에서 온다. 인터넷이 끊겨 브라우저가 offline 이어도 받으러 간다.
          networkMode: isBoothMode() ? 'always' : 'online',
        },
      },
    });
    restoreFromLocalCache(client);
    persistFetchedData(client);
    return client;
  });

  return <RQProvider client={queryClient}>{children}</RQProvider>;
}
