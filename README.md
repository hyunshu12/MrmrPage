# MurukMuruk Page

한국디지털미디어고등학교 스마트팜 동아리 **무럭무럭**의 홍보 웹사이트입니다.
Next.js App Router 기반으로 구성되어 있으며, 데이터는 Notion을 헤드리스 CMS처럼 사용해 관리합니다.

## 주요 기능

- 홈, 프로젝트, 업적, 멤버, QnA 페이지 제공
- Notion 데이터베이스에서 공개(`Published`)된 항목만 노출
- App Router API 라우트를 통한 서버 데이터 제공
- React Query 기반 클라이언트 데이터 패칭

## 기술 스택

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **UI/Styling**: React 19, Tailwind CSS 4
- **State/Data Fetching**: TanStack React Query 5
- **Validation**: Zod
- **CMS/Data Source**: Notion (`@notionhq/client`)
- **Lint/Format**: Biome
- **Package Manager**: Bun

## 빠른 시작

### 1) 의존성 설치

```bash
bun install
```

### 2) 환경변수 설정

루트에 `.env.local` 파일을 만들고 아래 값을 설정하세요.

```env
NOTION_TOKEN=your_notion_integration_token
NOTION_MEMBERS_DB_ID=your_members_database_id
NOTION_PROJECTS_DB_ID=your_projects_database_id
NOTION_ACHIEVEMENTS_DB_ID=your_achievements_database_id
```

### 3) 개발 서버 실행

```bash
bun dev
```

브라우저에서 `http://localhost:3000`으로 접속합니다.

## 스크립트

```bash
bun dev         # 개발 서버 (turbopack)
bun run build   # 프로덕션 빌드
bun start       # 프로덕션 실행
bun run lint    # 코드 검사
bun run lint:fix# 코드 검사 + 자동 수정
bun run format  # 코드 포맷팅
```

## 라우트

### 페이지 라우트

- `/`
- `/projects`
- `/achievements`
- `/members`
- `/qna`

### API 라우트

- `GET /api/members`: 공개된 멤버 목록
- `GET /api/projects`: 공개된 프로젝트 목록
- `GET /api/achievements`: 공개된 업적 목록

## Notion 데이터베이스 스키마

각 데이터베이스에는 아래 공통 필드가 필요합니다.

| 필드명 | 타입 | 설명 |
| --- | --- | --- |
| Name | Title | 이름 |
| Slug | Rich text | URL 식별자 |
| Published | Checkbox | 공개 여부 |
| Order | Number | 정렬 순서 |

### Members

| 필드명 | 타입 | 설명 |
| --- | --- | --- |
| Role | Select | 역할 |
| Bio | Rich text | 소개 |
| Avatar | Files | 프로필 이미지 |
| GitHubUrl | URL | GitHub 링크 |
| PortfolioUrl | URL | 포트폴리오 링크 |

### Projects

| 필드명 | 타입 | 설명 |
| --- | --- | --- |
| Summary | Rich text | 프로젝트 요약 |
| Period | Date | 진행 기간 |
| TechStack | Multi-select | 기술 스택 |
| Thumbnail | Files | 썸네일 이미지 |
| GitHubUrl | URL | GitHub 링크 |
| DemoUrl | URL | 데모 링크 |

### Achievements

| 필드명 | 타입 | 설명 |
| --- | --- | --- |
| AwardName | Rich text | 수상명 |
| Organizer | Rich text | 주최 기관 |
| Date | Date | 날짜 |
| ProofUrl | URL | 증빙 링크 |

## 프로젝트 구조

```text
src/
  app/
    api/
      members/route.ts
      projects/route.ts
      achievements/route.ts
    achievements/page.tsx
    members/page.tsx
    projects/page.tsx
    qna/page.tsx
    page.tsx
  components/
    layout/
  hooks/
  lib/
    env.ts
    notion/
      repositories/
  providers/
  types/
```

## 배포 (Vercel)

### 1) GitHub에 코드 푸시

이 저장소를 GitHub(예: `hyunshu12/MrmrPage`)에 푸시해 두세요.

### 2) Vercel에서 프로젝트 Import

1. [vercel.com](https://vercel.com) 로그인 후 **Add New → Project**
2. **Import Git Repository**에서 해당 GitHub 저장소 선택
3. **Framework Preset**: Next.js (자동 감지)
4. **Build Command**: `bun run build` (또는 `vercel.json` 기본값 사용)
5. **Install Command**: `bun install`

### 3) 환경변수 설정

Vercel 프로젝트 **Settings → Environment Variables**에서 **Production**에 아래 4개 추가:

| Name | Value |
|------|--------|
| `NOTION_TOKEN` | Notion Integration Token |
| `NOTION_MEMBERS_DB_ID` | Members DB ID |
| `NOTION_PROJECTS_DB_ID` | Projects DB ID |
| `NOTION_ACHIEVEMENTS_DB_ID` | Achievements DB ID |

### 4) Deploy

**Deploy** 버튼으로 배포 후, `*.vercel.app` URL에서 확인합니다.  
커스텀 도메인은 **Settings → Domains**에서 연결할 수 있습니다.

### CLI로 배포

로컬에서 한 번에 배포하려면:

```bash
npx vercel --prod
```

최초 실행 시 로그인·프로젝트 연결 안내가 나옵니다. 환경변수는 Vercel 대시보드에서 미리 넣어 두거나, `vercel env add`로 추가할 수 있습니다.

---

## Docker

```bash
docker build -t murukmuruk-page .
docker run -p 3000:3000 --env-file .env.local murukmuruk-page
```

## 참고 사항

- Notion API 연동 정보가 없으면 앱이 정상 동작하지 않습니다.
- 이미지 호스트 관련 설정은 `next.config.ts`에서 관리합니다.
- 현재 저장소에는 `.env.local.example` 파일이 없으므로, 위 예시를 참고해 `.env.local`을 직접 생성해야 합니다.
