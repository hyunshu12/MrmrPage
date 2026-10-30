'use client';

import { fetchAchievements, fetchMembers, fetchProjects } from '@/lib/api-client';
import { queryOptions, useQuery } from '@tanstack/react-query';

export const membersQueryKey = ['members'] as const;
export const projectsQueryKey = ['projects'] as const;
export const achievementsQueryKey = ['achievements'] as const;

// 훅과 AppBootGate 가 같은 정의를 쓴다. 키 하나를 받아 오는 방법도 하나다.
export const membersQuery = queryOptions({
  queryKey: membersQueryKey,
  queryFn: ({ signal }) => fetchMembers(signal),
});

export const projectsQuery = queryOptions({
  queryKey: projectsQueryKey,
  queryFn: ({ signal }) => fetchProjects(signal),
});

export const achievementsQuery = queryOptions({
  queryKey: achievementsQueryKey,
  queryFn: ({ signal }) => fetchAchievements(signal),
});

export function useMembers() {
  return useQuery(membersQuery);
}

export function useProjects() {
  return useQuery(projectsQuery);
}

export function useAchievements() {
  return useQuery(achievementsQuery);
}
