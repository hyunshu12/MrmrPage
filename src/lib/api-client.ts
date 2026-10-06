import { BOOTH_DATA_BASE_URL, isBoothMode } from '@/lib/booth';
import { achievementArraySchema, memberArraySchema, projectArraySchema } from '@/types';
import type { Achievement, Member, Project } from '@/types';
import type { ZodSchema } from 'zod';

const API_BASE_URL = '/api';

/**
 * 부스 모드에서는 Sanity 를 거치는 /api/* 대신 로컬 스냅샷(/booth/*.json)을 읽는다.
 * 네트워크가 끊긴 현장에서도 데이터와 이미지가 그대로 나오게 하기 위한 것이고,
 * 부스 모드가 아니면 경로도 캐시 정책도 기존과 동일하다.
 */
function resolveRequest(path: string): { url: string; cache: RequestCache } {
  if (isBoothMode()) {
    return { url: `${BOOTH_DATA_BASE_URL}${path}.json`, cache: 'force-cache' };
  }
  return { url: `${API_BASE_URL}${path}`, cache: 'no-store' };
}

async function fetchValidated<T>(path: string, schema: ZodSchema<T>, signal?: AbortSignal): Promise<T> {
  const request = resolveRequest(path);
  const res = await fetch(request.url, {
    cache: request.cache,
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
