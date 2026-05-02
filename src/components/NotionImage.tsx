'use client';

import { useQueryClient } from '@tanstack/react-query';
import Image, { type ImageProps } from 'next/image';
import { type ReactNode, useEffect, useRef, useState } from 'react';

type NotionImageProps = Omit<ImageProps, 'src'> & {
  src: string | null | undefined;
  fallback?: ReactNode;
  invalidateQueryKey?: readonly unknown[];
};

export default function NotionImage({
  src,
  fallback = null,
  invalidateQueryKey,
  alt,
  loading,
  priority,
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
