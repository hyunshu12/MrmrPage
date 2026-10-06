import { validatePerRow } from '@/lib/safe-validate';
import { type Achievement, achievementSchema } from '@/types/achievement';
import { type Member, memberSchema } from '@/types/member';
import { type Project, projectSchema } from '@/types/project';
import type { SanityImageSource } from '@sanity/image-url';
import { imageUrl, sanityClient } from './client';

/**
 * Sanity 문서를 기존 DTO(Member·Project·Achievement) 모양으로 돌려준다.
 * 화면 쪽은 데이터 출처가 바뀐 것을 모른다.
 *
 * 순서는 Studio 에서 끌어서 정한 orderRank 를 따른다. DTO 의 order 는 그 순서의 인덱스다.
 */

interface ImageField {
  asset?: { _ref: string };
  hotspot?: { x: number; y: number };
}

const toPercent = (value: number) => `${Math.round(value * 100)}%`;

/** 핫스팟을 카드의 object-position 으로 바꾼다. 지정하지 않았으면 가운데(기본값). */
function hotspotPosition(image: ImageField | null): string | null {
  return image?.hotspot ? `${toPercent(image.hotspot.x)} ${toPercent(image.hotspot.y)}` : null;
}

function imageFieldUrl(image: ImageField | null): string | null {
  return image?.asset ? imageUrl(image as SanityImageSource) : null;
}

type MemberDoc = Omit<Member, 'avatarUrl' | 'avatarPosition' | 'order'> & { avatar: ImageField | null };

export async function getPublishedMembers(): Promise<Member[]> {
  const docs = await sanityClient.fetch<MemberDoc[]>(
    `*[_type == "member" && defined(name)] | order(orderRank) {
      "id": _id, name, murukGeneration, role, schoolGeneration, className, statusMessage, avatar
    }`,
  );
  const mapped = docs.map(({ avatar, ...doc }, index) => ({
    ...doc,
    avatarUrl: imageFieldUrl(avatar),
    avatarPosition: hotspotPosition(avatar),
    order: index,
  }));
  return validatePerRow(mapped, memberSchema, 'members');
}

type ProjectDoc = Omit<Project, 'logoUrl' | 'order'> & { logo: ImageField | null };

export async function getPublishedProjects(): Promise<Project[]> {
  const docs = await sanityClient.fetch<ProjectDoc[]>(
    `*[_type == "project" && defined(name)] | order(orderRank) {
      "id": _id, name, year, description, logo
    }`,
  );
  const mapped = docs.map(({ logo, ...doc }, index) => ({ ...doc, logoUrl: imageFieldUrl(logo), order: index }));
  return validatePerRow(mapped, projectSchema, 'projects');
}

type AchievementDoc = Omit<Achievement, 'thumbnailUrl' | 'order'> & { thumbnail: ImageField | null };

export async function getPublishedAchievements(): Promise<Achievement[]> {
  const docs = await sanityClient.fetch<AchievementDoc[]>(
    `*[_type == "achievement" && defined(name)] | order(orderRank) {
      "id": _id, name, year, award, team, "members": coalesce(members, []), date, thumbnail
    }`,
  );
  const mapped = docs.map(({ thumbnail, ...doc }, index) => ({
    ...doc,
    thumbnailUrl: imageFieldUrl(thumbnail),
    order: index,
  }));
  return validatePerRow(mapped, achievementSchema, 'achievements');
}
