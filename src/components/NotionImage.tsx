'use client';

import { useQueryClient } from '@tanstack/react-query';
import Image, { type ImageProps } from 'next/image';
import { type ReactNode, useEffect, useRef, useState } from 'react';

type NotionImageProps = Omit<ImageProps, 'src'> & {
  src: string | null | undefined;
  fallback?: ReactNode;
  invalidateQueryKey?: readonly unknown[];
};

export default function NotionImage({ src, fallback = null, invalidateQueryKey, alt, ...rest }: NotionImageProps) {
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

  return (
    <Image
      src={src}
      alt={alt}
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
