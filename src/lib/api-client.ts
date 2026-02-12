import type { Achievement, Member, Project } from '@/types';

const API_BASE_URL = '/api';

async function fetchJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    cache: 'default',
    signal,
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}: ${res.status}`);
  }
  return (await res.json()) as T;
}

export function fetchMembers(signal?: AbortSignal): Promise<Member[]> {
  return fetchJson<Member[]>('/members', signal);
}

export function fetchProjects(signal?: AbortSignal): Promise<Project[]> {
  return fetchJson<Project[]>('/projects', signal);
}

export function fetchAchievements(signal?: AbortSignal): Promise<Achievement[]> {
  return fetchJson<Achievement[]>('/achievements', signal);
}
