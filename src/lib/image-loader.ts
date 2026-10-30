import { type ImageLoaderProps, getImageProps } from 'next/image';

/** next/image 기본 품질과 같다. 화면의 <Image> 와 프리로드가 같은 값을 써야 같은 URL 이 된다. */
export const IMAGE_QUALITY = 75;

const SANITY_IMAGE_ORIGIN = 'https://cdn.sanity.io/';

export function isSanityImage(src: string): boolean {
  return src.startsWith(SANITY_IMAGE_ORIGIN);
}

/**
 * Sanity 이미지는 Sanity CDN 이 직접 줄이고 포맷을 바꾼다.
 * Vercel 이미지 최적화(/_next/image)를 거치지 않으니 변환 한도를 쓰지 않고,
 * 임의 쿼리로 변환을 반복시키는 공격면도 사라진다.
 * 편집자가 크롭했으면 URL 에 이미 ?rect= 가 붙어 있어 & 로 잇는다. fit=max 라 원본보다 키우지 않는다.
 */
export function sanityImageLoader({ src, width, quality }: ImageLoaderProps): string {
  const joiner = src.includes('?') ? '&' : '?';
  return `${src}${joiner}w=${width}&q=${quality ?? IMAGE_QUALITY}&fit=max&auto=format`;
}

/**
 * 화면의 <Image> 가 이 폭(srcset 후보 중 하나)에서 실제로 요청하는 URL.
 * 프리로드가 같은 URL 을 받아야 브라우저 캐시가 맞는다.
 */
export function imageRequestUrl(src: string, width: number, quality = IMAGE_QUALITY): string {
  if (isSanityImage(src)) return sanityImageLoader({ src, width, quality });
  // 로컬 이미지는 Next 기본 로더(/_next/image)를 탄다. 배포 ID(&dpl=)처럼 Next 가 덧붙이는 값까지
  // 똑같아야 하므로 직접 조립하지 않고 Next 에게 받는다. srcset 의 첫 후보가 이 폭의 URL 이다.
  const { props } = getImageProps({ src, alt: '', width, height: width, quality });
  return props.srcSet ? props.srcSet.split(' ')[0] : props.src;
}
