import { compareGenerationKeys, groupByTab, memberGenerationOf } from '@/components/common/tab-keys';
import { achievementsQuery, membersQuery, projectsQuery } from '@/hooks/useApi';
import { SURFACE_SIZES, memberPhotoSizes } from '@/lib/image-sizes';
import type { Member } from '@/types';
import type { QueryClient, QueryExecuteOptions, QueryKey } from '@tanstack/react-query';

/** AppBootGate 가 기다리거나 미리 받는 CMS 쿼리. 데이터 타입이 달라도 한 배열에 담기도록 받는 함수로 감싼다. */
export interface BootQuery {
  queryKey: QueryKey;
  /** 캐시가 신선하면 그대로 두고, 없거나 staleTime 이 지났으면 받아 온다. 실패해도 reject 하지 않는다. */
  load: (client: QueryClient) => Promise<unknown>;
}

function bootQuery<TData, TKey extends QueryKey>(
  options: QueryExecuteOptions<TData, Error, TData, TData, TKey>,
): BootQuery {
  return {
    queryKey: options.queryKey,
    load: (client) => client.query(options).catch(() => undefined),
  };
}

const members = bootQuery(membersQuery);
const projects = bootQuery(projectsQuery);
const achievements = bootQuery(achievementsQuery);

export const CMS_QUERIES: readonly BootQuery[] = [members, projects, achievements];

export interface WarmImage {
  src: string;
  sizes: string;
}

export interface BootPlan {
  /** 이 라우트가 그리는 CMS 쿼리. 캐시에 없으면(첫 방문) 게이트가 기다린다. */
  queries: readonly BootQuery[];
  /** 첫 화면을 채우는 히어로 이미지(public/, sizes 는 SURFACE_SIZES.hero). 첫 방문이면 게이트가 기다린다. */
  hero?: string;
  /** 첫 화면 아래로 이어지는 CMS 이미지. 게이트가 열린 뒤 한가할 때 받아 둔다. */
  images: (client: QueryClient) => WarmImage[];
}

/** URL 이 있는 것만, 같은 URL 은 한 번만. sizes 가 사진마다 다르면 화면과 같은 함수를 받는다. */
function imagesOf(urls: Array<string | null | undefined>, sizes: string | ((src: string) => string)): WarmImage[] {
  const unique = new Set(urls.filter((url): url is string => Boolean(url)));
  return [...unique].map((src) => ({ src, sizes: typeof sizes === 'string' ? sizes : sizes(src) }));
}

/** MembersTabs 가 처음 여는 기수 탭의 멤버. 페이지(useTabGroups)와 같은 tab-keys 규칙으로 묶는다. */
function defaultTabMembers(list: Member[]): Member[] {
  const { keys, groups } = groupByTab(list, memberGenerationOf, compareGenerationKeys);
  const [first] = keys;
  return first === undefined ? [] : (groups.get(first) ?? []);
}

/** 라우트의 첫 화면에 무엇이 필요한지. app/ 의 각 page.tsx 가 그리는 것과 맞춰야 한다. */
export function bootPlanFor(pathname: string): BootPlan {
  switch (pathname) {
    case '/':
      // 첫 화면은 하프톤 히어로(캔버스)다. 대표 프로젝트·업적 카드는 스크롤 아래에 있다.
      return {
        queries: [projects, achievements],
        images: (client) => [
          ...imagesOf([client.getQueryData(projectsQuery.queryKey)?.[0]?.logoUrl], SURFACE_SIZES.homeProject),
          ...imagesOf(
            [client.getQueryData(achievementsQuery.queryKey)?.[0]?.thumbnailUrl],
            SURFACE_SIZES.homeAchievement,
          ),
        ],
      };
    case '/members':
      return {
        queries: [members],
        hero: '/memberImage.png',
        images: (client) =>
          imagesOf(
            defaultTabMembers(client.getQueryData(membersQuery.queryKey) ?? []).map((member) => member.avatarUrl),
            memberPhotoSizes,
          ),
      };
    case '/projects':
      return {
        queries: [projects],
        hero: '/projectImage.png',
        images: (client) =>
          imagesOf(
            (client.getQueryData(projectsQuery.queryKey) ?? []).map((project) => project.logoUrl),
            SURFACE_SIZES.projects,
          ),
      };
    case '/achievements':
      return {
        queries: [achievements],
        hero: '/archiveImage.png',
        images: (client) =>
          imagesOf(
            (client.getQueryData(achievementsQuery.queryKey) ?? []).map((achievement) => achievement.thumbnailUrl),
            SURFACE_SIZES.achievements,
          ),
      };
    default:
      // /faq 처럼 CMS 를 쓰지 않는 라우트(와 404)는 기다릴 것이 없다.
      return { queries: [], images: () => [] };
  }
}
