import { achievementArraySchema, memberArraySchema, projectArraySchema } from '@/types';
import type { Achievement, Member, Project } from '@/types';
import type { ZodSchema } from 'zod';

const API_BASE_URL = '/api';

async function fetchValidated<T>(path: string, schema: ZodSchema<T>, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    cache: 'no-store',
    signal,
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}: ${res.status}`);
  }
  const json = (await res.json()) as unknown;
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    console.error(`[api-client] response shape invalid for ${path}:`, parsed.error.flatten());
    throw new Error(`Invalid response shape for ${path}`);
  }
  return parsed.data;
}

export function fetchMembers(signal?: AbortSignal): Promise<Member[]> {
  return fetchValidated('/members', memberArraySchema, signal);
}

export function fetchProjects(signal?: AbortSignal): Promise<Project[]> {
  return fetchValidated('/projects', projectArraySchema, signal);
}

export function fetchAchievements(signal?: AbortSignal): Promise<Achievement[]> {
  return fetchValidated('/achievements', achievementArraySchema, signal);
}
