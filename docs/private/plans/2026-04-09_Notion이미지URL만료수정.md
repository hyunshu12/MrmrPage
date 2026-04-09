# Notion 이미지 URL 만료 문제 수정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notion S3 Presigned URL 만료로 인한 이미지 로딩 실패를 완전히 해결하고, 재발 시에도 UX에 영향이 없도록 방어 계층을 구축한다.

**Architecture:**
- **계층 1 (즉시 UX 보호):** `image-proxy`가 S3 에러 시 503 대신 SVG placeholder를 반환 → 브라우저에 깨진 이미지 아이콘 절대 표시 안 됨
- **계층 2 (클라이언트 방어):** 각 이미지 컴포넌트에 `onError` 핸들러로 fallback UI 전환
- **계층 3 (재발 방지):** `unstable_cache` 제거로 디스크 영구 캐시 문제 근절 → 페이지 ISR(`revalidate=1800`)이 Notion을 직접 호출하여 항상 fresh S3 URL 수신

**Tech Stack:** Next.js 16 App Router, Bun, Notion SDK, `unstable_cache` → ISR, SVG placeholder

---

## 근본 원인 요약

| 항목 | 값 |
|------|-----|
| S3 Presigned URL 유효 시간 | `X-Amz-Expires=3600` (1시간) |
| 기존 `unstable_cache` revalidate | 1800초 |
| 실제 캐시된 URL 서명 날짜 | `20260404` (5일 전!) |
| 현재 날짜 | 2026-04-09 |

`unstable_cache`는 Notion 응답(S3 URL 포함)을 `.next/cache` 디스크에 영구 저장한다. `bun dev` 재시작해도 `.next/cache`는 삭제되지 않아 5일 전 만료된 URL이 계속 서빙됨. 프로덕션에서도 트래픽이 1시간 이상 없으면 동일 현상 발생.

---

## 파일 변경 목록

| 파일 | 변경 유형 | 내용 |
|------|-----------|------|
| `src/app/api/image-proxy/route.ts` | 수정 | S3 에러 시 SVG placeholder 반환 |
| `src/lib/notion/repositories/members.repo.ts` | 수정 | `unstable_cache` 제거 |
| `src/lib/notion/repositories/projects.repo.ts` | 수정 | `unstable_cache` 제거 |
| `src/lib/notion/repositories/achievements.repo.ts` | 수정 | `unstable_cache` 제거 |
| `src/components/members/MembersTabs.client.tsx` | 수정 | 이미지 `onError` fallback 추가 |
| `src/app/projects/ProjectsPageClient.tsx` | 수정 | 이미지 `onError` fallback 추가 |
| `src/app/achievements/AchievementsPageClient.tsx` | 수정 | 이미지 `onError` fallback 추가 |

---

## Task 1: 오래된 디스크 캐시 즉시 제거

**Files:**
- `.next/cache/` (삭제)

- [ ] **Step 1: 캐시 디렉토리 삭제**

```bash
trash .next/cache
```

- [ ] **Step 2: 개발 서버 재시작**

```bash
bun dev
```

- [ ] **Step 3: 브라우저에서 `/members` 접속하여 이미지 로딩 확인**

기대값: 이미지가 정상 표시되거나 (Notion URL이 아직 유효하다면), 아직 403이 발생한다면 다음 Task들이 필요함을 확인.

---

## Task 2: image-proxy — S3 에러 시 SVG placeholder 반환

**Files:**
- Modify: `src/app/api/image-proxy/route.ts`

- [ ] **Step 1: `route.ts` 현재 내용 확인**

파일 내용 (참조):
```typescript
// 현재: upstream.ok 아닐 때 upstream.status를 그대로 반환
if (!upstream.ok) {
  return new Response('Failed to fetch image', { status: upstream.status });
}
```

이 403 응답이 브라우저에 깨진 이미지 아이콘을 유발한다.

- [ ] **Step 2: placeholder SVG 상수와 에러 핸들러 교체 작성**

`src/app/api/image-proxy/route.ts` 전체를 아래로 교체:

```typescript
import type { NextRequest } from 'next/server';

const ALLOWED_HOSTNAMES = new Set([
  'prod-files-secure.s3.us-west-2.amazonaws.com',
  's3.us-west-2.amazonaws.com',
]);

// 60px × 60px 중립 SVG placeholder (person 실루엣, 무럭무럭 green 계열)
const PLACEHOLDER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 140">' +
  '<rect width="160" height="140" fill="#e8f0e4"/>' +
  '<circle cx="80" cy="52" r="28" fill="#c5d9c0"/>' +
  '<ellipse cx="80" cy="118" rx="44" ry="30" fill="#c5d9c0"/>' +
  '</svg>';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return new Response('Missing url parameter', { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new Response('Invalid url parameter', { status: 400 });
  }

  if (!ALLOWED_HOSTNAMES.has(parsed.hostname)) {
    return new Response('URL not allowed', { status: 403 });
  }

  const upstream = await fetch(url, { cache: 'no-store' });

  if (!upstream.ok) {
    // S3 Presigned URL 만료(403) 또는 기타 오류 시 placeholder SVG 반환
    // 짧은 cache-control(60s)로 데이터 재검증 후 다음 요청에서 실제 이미지 사용
    return new Response(PLACEHOLDER_SVG, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    });
  }

  const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';
  const body = upstream.body;

  return new Response(body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=1800, s-maxage=1800',
    },
  });
}
```

- [ ] **Step 3: 브라우저에서 `/members` 접속**

기대값: 이미지가 로딩되지 않더라도 브라우저 콘솔에 403 에러가 없고, 깨진 아이콘 대신 연두색 원/타원 실루엣이 표시됨.

- [ ] **Step 4: 커밋**

```bash
git add src/app/api/image-proxy/route.ts
git commit -m "fix: return SVG placeholder when Notion S3 image URL expires (403)"
```

---

## Task 3: `members.repo.ts` — `unstable_cache` 제거

**Files:**
- Modify: `src/lib/notion/repositories/members.repo.ts`

**이유:** `unstable_cache`는 `.next/cache` 디스크에 데이터를 영구 저장한다. 서버 재시작 후에도 만료된 S3 URL이 살아있는 근본 원인. 제거하면 페이지 ISR(`revalidate = 1800`)이 Notion을 직접 호출 → 항상 fresh URL 수신.

- [ ] **Step 1: `members.repo.ts` 전체를 아래로 교체**

```typescript
import { env } from '@/lib/env';
import { type Member, memberArraySchema } from '@/types/member';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { getNotionClient } from '../client';
import { mapPageToMember } from '../mappers';
import { createOrderAscSort, createPublishedFilter } from '../queries';

export async function getPublishedMembers(): Promise<Member[]> {
  const notion = getNotionClient();

  const response = await notion.databases.query({
    database_id: env.NOTION_MEMBERS_DB_ID,
    filter: createPublishedFilter(),
    sorts: createOrderAscSort(),
  });

  const members = response.results
    .filter((page): page is PageObjectResponse => page.object === 'page' && 'properties' in page)
    .map(mapPageToMember);

  const parsed = memberArraySchema.safeParse(members);
  if (!parsed.success) {
    console.error('Members validation failed:', parsed.error.flatten());
    throw new Error('Failed to validate members data');
  }

  return parsed.data.filter((m) => m.name.trim().length > 0);
}
```

- [ ] **Step 2: TypeScript 타입 에러 없는지 확인**

```bash
bun run tsc --noEmit 2>&1 | head -20
```

기대값: 에러 없음. (page.tsx가 `getPublishedMembers()` 함수 시그니처를 그대로 사용하므로 변경 불필요)

- [ ] **Step 3: 커밋**

```bash
git add src/lib/notion/repositories/members.repo.ts
git commit -m "refactor: remove unstable_cache from members repo — ISR handles caching"
```

---

## Task 4: `projects.repo.ts` — `unstable_cache` 제거

**Files:**
- Modify: `src/lib/notion/repositories/projects.repo.ts`

- [ ] **Step 1: `projects.repo.ts` 전체를 아래로 교체**

```typescript
import { env } from '@/lib/env';
import { type Project, projectArraySchema } from '@/types/project';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { getNotionClient } from '../client';
import { mapPageToProject } from '../mappers';
import { createOrderAscSort, createPublishedFilter } from '../queries';

export async function getPublishedProjects(): Promise<Project[]> {
  const notion = getNotionClient();

  const response = await notion.databases.query({
    database_id: env.NOTION_PROJECTS_DB_ID,
    filter: createPublishedFilter(),
    sorts: createOrderAscSort(),
  });

  const projects = response.results
    .filter((page): page is PageObjectResponse => page.object === 'page' && 'properties' in page)
    .map(mapPageToProject);

  const parsed = projectArraySchema.safeParse(projects);
  if (!parsed.success) {
    console.error('Projects validation failed:', parsed.error.flatten());
    throw new Error('Failed to validate projects data');
  }

  return parsed.data.filter((p) => p.name.trim().length > 0);
}
```

- [ ] **Step 2: 타입 에러 확인**

```bash
bun run tsc --noEmit 2>&1 | head -20
```

기대값: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/lib/notion/repositories/projects.repo.ts
git commit -m "refactor: remove unstable_cache from projects repo — ISR handles caching"
```

---

## Task 5: `achievements.repo.ts` — `unstable_cache` 제거

**Files:**
- Modify: `src/lib/notion/repositories/achievements.repo.ts`

- [ ] **Step 1: `achievements.repo.ts` 전체를 아래로 교체**

```typescript
import { env } from '@/lib/env';
import { type Achievement, achievementArraySchema } from '@/types/achievement';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { getNotionClient } from '../client';
import { mapPageToAchievement } from '../mappers';
import { createOrderAscSort, createPublishedFilter } from '../queries';

export async function getPublishedAchievements(): Promise<Achievement[]> {
  const notion = getNotionClient();

  const response = await notion.databases.query({
    database_id: env.NOTION_ACHIEVEMENTS_DB_ID,
    filter: createPublishedFilter(),
    sorts: createOrderAscSort(),
  });

  const achievements = response.results
    .filter((page): page is PageObjectResponse => page.object === 'page' && 'properties' in page)
    .map(mapPageToAchievement);

  const parsed = achievementArraySchema.safeParse(achievements);
  if (!parsed.success) {
    console.error('Achievements validation failed:', parsed.error.flatten());
    throw new Error('Failed to validate achievements data');
  }

  return parsed.data.filter((a) => a.name.trim().length > 0);
}
```

- [ ] **Step 2: 타입 에러 확인**

```bash
bun run tsc --noEmit 2>&1 | head -20
```

기대값: 에러 없음.

- [ ] **Step 3: 커밋**

```bash
git add src/lib/notion/repositories/achievements.repo.ts
git commit -m "refactor: remove unstable_cache from achievements repo — ISR handles caching"
```

---

## Task 6: MembersTabs — 이미지 `onError` fallback 추가

**Files:**
- Modify: `src/components/members/MembersTabs.client.tsx`

image-proxy가 placeholder를 반환하더라도, 클라이언트에서 추가 방어 계층이 있으면 더 안전하다.

- [ ] **Step 1: `MembersTabs.client.tsx`에 `failedImages` state 추가 및 `onError` 핸들러 적용**

파일 상단 `useState` import에 추가 변경 없음 (이미 있음).

`export default function MembersTabs` 함수 안, `selectedMembers` 선언 이후에 아래 state 추가:

```typescript
const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
```

그리고 멤버 카드의 이미지 조건부 렌더링 블록 (현재 `member.avatarUrl ?` 분기) 을 아래로 교체:

```tsx
{member.avatarUrl && !failedImages.has(member.id) ? (
  <img
    src={member.avatarUrl}
    alt={member.name}
    className="h-full w-full object-cover transition-transform group-hover:scale-105"
    style={avatarPosition ? { objectPosition: avatarPosition } : undefined}
    onError={() =>
      setFailedImages((prev) => {
        const next = new Set(prev);
        next.add(member.id);
        return next;
      })
    }
  />
) : (
  <div className="flex h-full w-full items-center justify-center bg-muruk-green-lightest/40">
    <span className="text-5xl text-muruk-green-muted/30">🌿</span>
  </div>
)}
```

- [ ] **Step 2: 브라우저에서 `/members` 접속 및 확인**

기대값: 이미지 로드 실패 시 🌿 이모지가 표시됨 (깨진 아이콘 없음).

- [ ] **Step 3: 커밋**

```bash
git add src/components/members/MembersTabs.client.tsx
git commit -m "fix: add onError fallback for member avatar images"
```

---

## Task 7: ProjectsPageClient — 이미지 `onError` fallback 추가

**Files:**
- Modify: `src/app/projects/ProjectsPageClient.tsx`

- [ ] **Step 1: `useState` import 확인**

`ProjectsPageClient.tsx` 상단에 `useState`가 이미 import 되어 있음 (`import { useMemo, useState } from 'react'`). 추가 import 불필요.

- [ ] **Step 2: `failedImages` state 추가 및 `onError` 핸들러 적용**

`ProjectsPageClient` 함수 안 `filteredProjects` 선언 아래에 추가:

```typescript
const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
```

프로젝트 카드의 이미지 조건부 렌더링 블록 (`project.logoUrl ?` 분기) 을 아래로 교체:

```tsx
{project.logoUrl && !failedImages.has(project.id) ? (
  <img
    src={project.logoUrl}
    alt={project.name}
    className="h-full w-full rounded-[30px] object-cover p-4 sm:rounded-[53px]"
    onError={() =>
      setFailedImages((prev) => {
        const next = new Set(prev);
        next.add(project.id);
        return next;
      })
    }
  />
) : (
  <div className="flex h-full min-h-[200px] w-full items-center justify-center">
    <span className="text-5xl text-muruk-green-muted/30">🌱</span>
  </div>
)}
```

- [ ] **Step 3: 브라우저에서 `/projects` 접속 및 확인**

기대값: 이미지 로드 실패 시 🌱 이모지가 표시됨.

- [ ] **Step 4: 커밋**

```bash
git add src/app/projects/ProjectsPageClient.tsx
git commit -m "fix: add onError fallback for project logo images"
```

---

## Task 8: AchievementsPageClient — 이미지 `onError` fallback 추가

**Files:**
- Modify: `src/app/achievements/AchievementsPageClient.tsx`

- [ ] **Step 1: `failedImages` state 추가 및 `onError` 핸들러 적용**

`AchievementsPageClient` 함수 안 `filteredAchievements` 선언 아래에 추가:

```typescript
const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
```

업적 카드의 이미지 조건부 렌더링 블록 (`achievement.thumbnailUrl ?` 분기) 을 아래로 교체:

```tsx
{achievement.thumbnailUrl && !failedImages.has(achievement.id) ? (
  <img
    src={achievement.thumbnailUrl}
    alt={achievement.name}
    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
    onError={() =>
      setFailedImages((prev) => {
        const next = new Set(prev);
        next.add(achievement.id);
        return next;
      })
    }
  />
) : (
  <div className="flex h-full w-full items-center justify-center bg-muruk-green-lightest/30">
    <span className="text-5xl text-muruk-green-muted/30">🏆</span>
  </div>
)}
```

- [ ] **Step 2: 브라우저에서 `/achievements` 접속 및 확인**

기대값: 이미지 로드 실패 시 🏆 이모지가 표시됨.

- [ ] **Step 3: 커밋**

```bash
git add src/app/achievements/AchievementsPageClient.tsx
git commit -m "fix: add onError fallback for achievement thumbnail images"
```

---

## Task 9: 전체 검증 (Playwright)

**Files:** 없음 (검증만)

- [ ] **Step 1: 개발 서버 실행 확인**

```bash
bun dev &
sleep 3
echo "Server running"
```

- [ ] **Step 2: Playwright로 `/members` 검증**

Playwright MCP 도구로 `http://localhost:3000/members` 접속 후:
1. `browser_console_messages` (level: error) 호출
2. 기대값: **403 에러 0개**

- [ ] **Step 3: Playwright로 `/projects` 검증**

Playwright MCP 도구로 `http://localhost:3000/projects` 접속 후:
1. `browser_console_messages` (level: error) 호출
2. 기대값: 에러 없음

- [ ] **Step 4: Playwright로 `/achievements` 검증**

Playwright MCP 도구로 `http://localhost:3000/achievements` 접속 후:
1. `browser_console_messages` (level: error) 호출
2. 기대값: 에러 없음

- [ ] **Step 5: 스크린샷으로 UI 확인**

각 페이지에서 `browser_take_screenshot` 호출. 기대값: 이미지가 정상 로딩되거나 (Notion URL이 fresh), SVG/이모지 placeholder가 표시됨. 깨진 아이콘 없음.

---

## 재발 방지 요약

| 상황 | 이전 | 이후 |
|------|------|------|
| 트래픽 없이 1시간+ 경과 | ISR 미트리거 → 만료 URL 서빙 → 🚫 깨진 이미지 | ISR 미트리거 → 만료 URL → image-proxy가 SVG 반환 → ✅ placeholder 표시 |
| 개발 서버 재시작 | `.next/cache` 살아있어 오래된 URL 서빙 | `unstable_cache` 없음 → 요청마다 Notion 직접 호출 → ✅ 항상 fresh |
| URL이 있는데 이미지 로드 실패 | 깨진 아이콘 표시 | `onError` → ✅ 이모지 placeholder |
