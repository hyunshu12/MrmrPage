import { BOOTH_DATA_BASE_URL, isBoothMode } from '@/lib/booth';
import { achievementArraySchema, memberArraySchema, projectArraySchema } from '@/types';
import type { Achievement, Member, Project } from '@/types';
import type { ZodType } from 'zod';

const API_BASE_URL = '/api';
/** 응답이 멈추면 이 시간 뒤에 실패로 끝낸다. 정상이면 CDN 이 1초 안에 준다. */
const REQUEST_TIMEOUT_MS = 10_000;

/** 호출한 쪽의 취소 신호에 시간 제한을 더한다. */
function withTimeout(signal: AbortSignal | undefined): AbortSignal | undefined {
  if (typeof AbortSignal.timeout !== 'function') return signal;
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  if (!signal) return timeout;
  if (typeof AbortSignal.any === 'function') return AbortSignal.any([signal, timeout]);
  if (signal.aborted) return signal;
  // AbortSignal.any 가 없는 브라우저(Safari 17.3 이하)는 둘 중 먼저 끊기는 쪽을 직접 따른다.
  const controller = new AbortController();
  for (const source of [signal, timeout]) {
    source.addEventListener('abort', () => controller.abort(source.reason), { once: true });
  }
  return controller.signal;
}

/**
 * 부스 모드에서는 Sanity 를 거치는 /api/* 대신 로컬 스냅샷(/booth/*.json)을 읽는다.
 * no-cache 라 스냅샷을 다시 만들면 바로 새 JSON 을 받는다. 확인 요청은 로컬 서버로 가므로 오프라인이어도 된다.
 * 스냅샷이 없는 서버(배포 사이트)에 ?booth=1 을 붙였으면 평소처럼 /api 를 읽는다.
 */
async function request(path: string, signal: AbortSignal | undefined): Promise<Response> {
  if (isBoothMode()) {
    const res = await fetch(`${BOOTH_DATA_BASE_URL}${path}.json`, { cache: 'no-cache', signal });
    if (res.status !== 404) return res;
  }
  return fetch(`${API_BASE_URL}${path}`, { cache: 'no-store', signal });
}

async function fetchValidated<T>(path: string, schema: ZodType<T>, signal?: AbortSignal): Promise<T> {
  const res = await request(path, withTimeout(signal));
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
