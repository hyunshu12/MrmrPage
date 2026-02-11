import type { Achievement, Member, Project } from '@/types';

const API_BASE_URL = '/api';

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}: ${res.status}`);
  }
  return (await res.json()) as T;
}

export function fetchMembers(): Promise<Member[]> {
  return fetchJson<Member[]>('/members');
}

export function fetchProjects(): Promise<Project[]> {
  return fetchJson<Project[]>('/projects');
}

export function fetchAchievements(): Promise<Achievement[]> {
  return fetchJson<Achievement[]>('/achievements');
}
