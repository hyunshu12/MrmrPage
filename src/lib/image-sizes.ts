import { isSanityImage } from '@/lib/image-loader';

/**
 * 화면별 next/image `sizes` 문자열.
 * 화면의 <Image> 와 AppBootGate 의 프리로드가 같은 상수를 import 하므로, 둘이 고르는 srcset 폭(= 요청 URL)이 항상 같다.
 * 레이아웃(열 수·간격·여백·최대 폭)을 바꾸면 여기도 고친다.
 *
 * 각 값은 그 구간에서 실제로 그려지는 폭보다 작지 않은 가장 가까운 어림값이다.
 * 모자라면 폰에서 사진이 흐려지고, 넘치면 데스크톱이 필요 없이 큰 파일을 받는다.
 * 본문 컨테이너(max-w-7xl, 좌우 여백 24px)가 다 펴지는 1280px 부터는 폭이 고정이라 px 로 적는다.
 */
export const SURFACE_SIZES = {
  // 상세 페이지 히어로 배경: 화면 전체
  hero: '100vw',
  // 홈 대표 프로젝트: 대표 업적 카드와 같은 칸이고, 로고는 카드 안쪽 여백(좌우 8%씩)을 뺀 폭까지 커진다
  homeProject: '(min-width: 1280px) 494px, (min-width: 1024px) 39vw, 81vw',
  // 홈 대표 업적: lg 부터 2열(gap-14), 그 아래는 한 열(좌우 여백 16/24px)
  homeAchievement: '(min-width: 1280px) 588px, (min-width: 1024px) 46vw, 96vw',
  // 멤버: 휴대폰부터 2열(gap-3, sm 부터 gap-8) → lg 4열(gap-8). 칸 폭 기준이고, 칸보다 가로로 긴 사진은 memberPhotoSizes 가 키운다.
  members: '(min-width: 1280px) 284px, (min-width: 1024px) 23vw, 47vw',
  // 프로젝트 로고: 1열(카드 안 p-4) → sm 부터 2열 카드의 왼쪽 2/5(p-4).
  // sm~xl 에서는 로고 칸이 글 높이만큼 세로로 늘어나고 object-cover 가 로고를 그 높이로 키우므로 칸 폭보다 크게 잡는다.
  projects: '(min-width: 1280px) 208px, (min-width: 1024px) 20vw, (min-width: 640px) 40vw, 90vw',
  // 업적: 1열 → sm 2열(gap-10) → lg 3열(gap-12), 카드 테두리 1px
  achievements: '(min-width: 1280px) 377px, (min-width: 1024px) 30vw, (min-width: 640px) 46vw, 95vw',
} as const;

export type ImageSurface = keyof typeof SURFACE_SIZES;

/** 멤버 사진 칸의 가로:세로 (MembersTabs 의 aspect-[4/5]). */
const MEMBER_PHOTO_ASPECT = 4 / 5;

/** Sanity 이미지의 가로:세로. 크롭했으면 잘린 영역(rect=), 아니면 파일 이름의 원본 크기(-WxH)로 안다. 모르면 null. */
function sanityImageAspect(src: string): number | null {
  if (!isSanityImage(src)) return null;
  const url = new URL(src);
  const rect = url.searchParams.get('rect')?.split(',').map(Number);
  if (rect?.length === 4 && rect[2] > 0 && rect[3] > 0) return rect[2] / rect[3];
  const size = /-(\d+)x(\d+)\.\w+$/.exec(url.pathname);
  return size ? Number(size[1]) / Number(size[2]) : null;
}

/**
 * object-cover 칸보다 가로로 긴 사진은 칸 높이에 맞춰 칸 폭보다 넓게 그려진다.
 * sizes 의 각 폭을 그 배율만큼 키워 브라우저가 흐리지 않은 후보를 고르게 한다. 미디어 조건은 그대로 둔다.
 */
function coverSizes(sizes: string, src: string | null | undefined, boxAspect: number): string {
  const aspect = src ? sanityImageAspect(src) : null;
  if (aspect === null || aspect <= boxAspect) return sizes;
  const scale = aspect / boxAspect;
  return sizes
    .split(',')
    .map((entry) =>
      // next/image 가 srcset 후보를 거를 때 정수 vw 만 읽으므로 올림해 정수로 둔다.
      entry.replace(
        /([\d.]+)(px|vw)\s*$/,
        (_, value: string, unit: string) => `${Math.ceil(Number(value) * scale)}${unit}`,
      ),
    )
    .join(',');
}

/** 멤버 사진의 sizes. MembersTabs 와 AppBootGate 의 프리로드(boot-plan)가 같이 써서 같은 URL 을 고른다. */
export function memberPhotoSizes(src: string | null | undefined): string {
  return coverSizes(SURFACE_SIZES.members, src, MEMBER_PHOTO_ASPECT);
}
