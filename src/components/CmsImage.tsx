'use client';

import { isSanityImage, sanityImageLoader } from '@/lib/image-loader';
import { type QueryClient, type QueryKey, useQueryClient } from '@tanstack/react-query';
import Image, { type ImageProps } from 'next/image';
import { type ReactNode, useState } from 'react';

type CmsImageProps = Omit<ImageProps, 'src' | 'loader'> & {
  src: string | null | undefined;
  /** 주소가 없거나 불러오지 못했을 때 그 자리에 그린다. 카드의 비율 상자를 그대로 채우는 것을 넘긴다. */
  fallback: ReactNode;
  /** 로드 실패 시 이 쿼리를 다시 받아온다. 편집자가 사진을 바꿔 URL 이 달라진 경우를 복구한다. */
  invalidateQueryKey?: QueryKey;
  /** CSS object-position. Studio 에서 찍은 핫스팟이 들어온다. 없으면 가운데. */
  position?: string | null;
};

/**
 * 로드 전에 bg-gray-200 대신 먼저 그리는 옅은 초록(#e6eee5) 8x8 PNG blur.
 * 원격 이미지라 Next 가 blur 를 만들어 주지 못해 직접 넘긴다. img-src 에 data: 가 허용돼 있다.
 */
const FALLBACK_BLUR_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGN49u4pVsQwtCQAFgSuQV1cocQAAAAASUVORK5CYII=';

/**
 * 같은 쿼리의 복구 재조회는 한 번에 하나만 보낸다.
 * 여러 장이 한꺼번에 실패해도 이미 받아오는 중이면 건너뛰고, 진행 중인 요청을 취소·재시작하지 않는다.
 */
function recoverQuery(queryClient: QueryClient, queryKey: QueryKey) {
  if (queryClient.isFetching({ queryKey }) > 0) return;
  void queryClient.invalidateQueries({ queryKey }, { cancelRefetch: false });
}

export default function CmsImage({
  src,
  fallback,
  invalidateQueryKey,
  position,
  alt,
  loading,
  priority,
  placeholder,
  blurDataURL,
  style,
  ...rest
}: CmsImageProps) {
  const queryClient = useQueryClient();
  // 실패한 주소. 재조회로 주소가 바뀌면 이 값과 달라지므로 새 주소를 다시 그려 본다.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || src === failedSrc) {
    return <>{fallback}</>;
  }

  // CMS 이미지는 모두 첫 화면 아래(히어로 다음 섹션부터)에 있어 기본은 lazy 다. 브라우저는 화면에 닿기
  // 한참 전(수백~수천 px)부터 받기 시작하고, AppBootGate 가 한가할 때 같은 URL(같은 srcset·sizes)로 받아 두면
  // 캐시에서 바로 나온다. 멤버 22명을 한꺼번에 받지 않아 휴대폰 데이터도 아낀다. priority 가 있으면 그쪽을 따른다.
  const effectiveLoading = priority ? undefined : (loading ?? 'lazy');

  return (
    <Image
      src={src}
      alt={alt}
      // Sanity 이미지는 Sanity CDN 이 줄인다(/_next/image 를 거치지 않는다). 부스 모드의 로컬 이미지는 기본 로더.
      loader={isSanityImage(src) ? sanityImageLoader : undefined}
      loading={effectiveLoading}
      priority={priority}
      placeholder={placeholder ?? 'blur'}
      blurDataURL={blurDataURL ?? FALLBACK_BLUR_DATA_URL}
      style={position ? { ...style, objectPosition: position } : style}
      {...rest}
      onError={() => {
        // 깨진 이미지와 alt 글자 대신 대체 상자를 보여준다.
        setFailedSrc(src);
        if (invalidateQueryKey) recoverQuery(queryClient, invalidateQueryKey);
      }}
    />
  );
}
