'use client';

import { useQueryClient } from '@tanstack/react-query';
import Image, { type ImageProps } from 'next/image';
import { type ReactNode, useEffect, useRef, useState } from 'react';

type NotionImageProps = Omit<ImageProps, 'src'> & {
  src: string | null | undefined;
  fallback?: ReactNode;
  invalidateQueryKey?: readonly unknown[];
};

/**
 * 브랜드 톤(muruk-green-lightest, #e6eee5)으로 채운 8x8 단색 PNG blur.
 *
 * AppBootGate가 splash 동안 각 surface의 정확한 next/image 변환 URL을 미리 받아두므로
 * 대부분의 경우 마운트 즉시 브라우저 캐시 hit이지만, 다음 잔여 케이스에서는 한 프레임의
 * 회색 플래시가 발생할 수 있다:
 *   - splash와 탭 진입 사이에 미디어쿼리 breakpoint/DPR 경계를 넘는 리사이즈가 일어나
 *     예측한 width와 실제 요청 width가 어긋나는 경우(1회 재요청)
 *   - 데이터 timeout 등으로 일부 콘텐츠 이미지가 프리로드되지 못한 경우(진짜 cold miss)
 * placeholder='blur'는 이 모든 경우에 bg-gray-200 대신 브랜드 blur를 즉시 그려
 * 회색 플래시를 구조적으로 불가능하게 만든다(예측 정확도와 무관한 직교 보장).
 *
 * 원본이 원격(S3 presigned) 동적 URL이라 Next가 blur를 자동 생성할 수 없으므로
 * 정적 blurDataURL을 직접 제공한다. svg가 아닌 raster(PNG) data URL이라
 * dangerouslyAllowSVG 없이도 안전하게 렌더된다. img-src에 data: 가 이미 허용돼 있다.
 */
const FALLBACK_BLUR_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGN49u4pVsQwtCQAFgSuQV1cocQAAAAASUVORK5CYII=';

export default function NotionImage({
  src,
  fallback = null,
  invalidateQueryKey,
  alt,
  loading,
  priority,
  placeholder,
  blurDataURL,
  ...rest
}: NotionImageProps) {
  const queryClient = useQueryClient();
  const [errored, setErrored] = useState(false);
  const recoveryAttemptedRef = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: src change is the intended trigger to reset error state
  useEffect(() => {
    setErrored(false);
    recoveryAttemptedRef.current = false;
  }, [src]);

  if (!src || errored) {
    return <>{fallback}</>;
  }

  // AppBootGate가 splash 동안 모든 콘텐츠 이미지의 next/image 변환 URL을 미리 받아놓으므로,
  // 컴포넌트가 마운트되는 시점엔 브라우저 캐시 hit이 가능하다. lazy loading은 캐시 hit을 지연시키므로
  // 기본을 eager로 두어 splash가 끝나는 즉시 이미지가 보이도록 한다. priority가 명시되면 그쪽이 우선.
  const effectiveLoading = priority ? undefined : (loading ?? 'eager');

  return (
    <Image
      src={src}
      alt={alt}
      loading={effectiveLoading}
      priority={priority}
      placeholder={placeholder ?? 'blur'}
      blurDataURL={blurDataURL ?? FALLBACK_BLUR_DATA_URL}
      {...rest}
      onError={() => {
        if (invalidateQueryKey && !recoveryAttemptedRef.current) {
          recoveryAttemptedRef.current = true;
          void queryClient.invalidateQueries({ queryKey: invalidateQueryKey });
          return;
        }
        setErrored(true);
      }}
    />
  );
}
