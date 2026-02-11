'use client';

import { QueryClient, QueryClientProvider as RQProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';

const DEFAULT_STALE_TIME_MS = 1000 * 60 * 10;

export default function QueryClientProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: DEFAULT_STALE_TIME_MS,
            gcTime: DEFAULT_STALE_TIME_MS,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            refetchOnReconnect: true,
            retry: 1,
          },
        },
      }),
  );

  return <RQProvider client={queryClient}>{children}</RQProvider>;
}
