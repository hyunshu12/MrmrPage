'use client';

import { fetchAchievements, fetchMembers, fetchProjects } from '@/lib/api-client';
import type { Achievement, Member, Project } from '@/types';
import { useQuery } from '@tanstack/react-query';

export const membersQueryKey = ['members'] as const;
export const projectsQueryKey = ['projects'] as const;
export const achievementsQueryKey = ['achievements'] as const;

export function useMembers() {
  return useQuery<Member[]>({
    queryKey: membersQueryKey,
    queryFn: fetchMembers,
  });
}

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: projectsQueryKey,
    queryFn: fetchProjects,
  });
}

export function useAchievements() {
  return useQuery<Achievement[]>({
    queryKey: achievementsQueryKey,
    queryFn: fetchAchievements,
  });
}
