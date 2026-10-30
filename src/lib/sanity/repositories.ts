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
 * 배열 순서는 Studio 에서 끌어서 정한 orderRank 를 따른다.
 */

/** Studio 이미지 필드. crop·hotspot 은 원본 이미지 기준 0~1 비율이다. */
interface ImageField {
  asset?: { _ref: string };
  crop?: { top: number; bottom: number; left: number; right: number };
  hotspot?: { x: number; y: number };
}

const toPercent = (value: number) => `${Math.round(value * 100)}%`;

/** 원본 기준 좌표를 앞뒤가 잘린 이미지 안의 좌표로 옮긴다(0~1 로 자른다). */
function toCroppedAxis(value: number, cropStart = 0, cropEnd = 0): number {
  const span = 1 - cropStart - cropEnd;
  if (span <= 0) return 0.5;
  return Math.min(1, Math.max(0, (value - cropStart) / span));
}

/**
 * 핫스팟을 카드의 object-position 으로 바꾼다. 지정하지 않았으면 null(가운데).
 * 사이트가 받는 이미지는 크롭이 이미 적용된 것이라(imageUrl 의 rect=) 크롭된 이미지 기준으로 옮긴다.
 */
function hotspotPosition(image: ImageField | null): string | null {
  if (!image?.hotspot) return null;
  const { hotspot, crop } = image;
  const x = toCroppedAxis(hotspot.x, crop?.left, crop?.right);
  const y = toCroppedAxis(hotspot.y, crop?.top, crop?.bottom);
  return `${toPercent(x)} ${toPercent(y)}`;
}

function imageFieldUrl(image: ImageField | null): string | null {
  return image?.asset ? imageUrl(image as SanityImageSource) : null;
}

type MemberDoc = Omit<Member, 'avatarUrl' | 'avatarPosition'> & { avatar: ImageField | null };

export async function getPublishedMembers(): Promise<Member[]> {
  const docs = await sanityClient.fetch<MemberDoc[]>(
    `*[_type == "member" && defined(name)] | order(orderRank) {
      "id": _id, name, murukGeneration, role, schoolGeneration, className, statusMessage, avatar
    }`,
  );
  const mapped = docs.map(({ avatar, ...doc }) => ({
    ...doc,
    avatarUrl: imageFieldUrl(avatar),
    avatarPosition: hotspotPosition(avatar),
  }));
  return validatePerRow(mapped, memberSchema, 'members');
}

type ProjectDoc = Omit<Project, 'logoUrl' | 'logoPosition'> & { logo: ImageField | null };

export async function getPublishedProjects(): Promise<Project[]> {
  const docs = await sanityClient.fetch<ProjectDoc[]>(
    `*[_type == "project" && defined(name)] | order(orderRank) {
      "id": _id, name, year, description, logo
    }`,
  );
  const mapped = docs.map(({ logo, ...doc }) => ({
    ...doc,
    logoUrl: imageFieldUrl(logo),
    logoPosition: hotspotPosition(logo),
  }));
  return validatePerRow(mapped, projectSchema, 'projects');
}

type AchievementDoc = Omit<Achievement, 'thumbnailUrl' | 'thumbnailPosition'> & { thumbnail: ImageField | null };

export async function getPublishedAchievements(): Promise<Achievement[]> {
  const docs = await sanityClient.fetch<AchievementDoc[]>(
    `*[_type == "achievement" && defined(name)] | order(orderRank) {
      "id": _id, name, year, award, team, "members": coalesce(members, []), date, thumbnail
    }`,
  );
  const mapped = docs.map(({ thumbnail, ...doc }) => ({
    ...doc,
    thumbnailUrl: imageFieldUrl(thumbnail),
    thumbnailPosition: hotspotPosition(thumbnail),
  }));
  return validatePerRow(mapped, achievementSchema, 'achievements');
}
