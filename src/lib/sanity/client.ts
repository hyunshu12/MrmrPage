import { createClient } from '@sanity/client';
import { type SanityImageSource, createImageUrlBuilder } from '@sanity/image-url';

/**
 * 공개 데이터셋이라 읽기에는 토큰이 필요 없다. projectId·dataset 은 비밀이 아니므로
 * 환경변수 대신 코드에 둔다 (studio/sanity.config.ts 와 같은 값).
 */
export const sanityClient = createClient({
  projectId: 'dldhzjbv',
  dataset: 'production',
  apiVersion: '2025-02-19',
  useCdn: true,
  // 발행된 문서만 읽는다. 편집 중인 초안은 사이트에 나오지 않는다.
  perspective: 'published',
});

const imageBuilder = createImageUrlBuilder(sanityClient);

/** 편집자가 지정한 크롭을 반영한 원본 URL. 리사이즈·포맷 변환은 next/image 가 맡는다. */
export function imageUrl(source: SanityImageSource | null | undefined): string | null {
  return source ? imageBuilder.image(source).url() : null;
}
