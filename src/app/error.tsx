'use client';

import { useEffect } from 'react';

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App route error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <h2 className="text-2xl font-bold text-muruk-green-darker sm:text-3xl">잠시 문제가 발생했어요</h2>
      <p className="mt-4 max-w-md text-sm leading-7 text-muruk-green-text/85 sm:text-base">
        페이지를 불러오는 중 오류가 발생했습니다. 다시 시도해 주세요.
      </p>
      <button
        type="button"
        onClick={reset}
        className="kakao-shortcut group mt-8 inline-flex items-center gap-3 px-7 py-3.5 text-sm font-semibold">
        <span className="relative z-[1]">다시 시도</span>
        <span className="kakao-shortcut-arrow relative z-[1]">→</span>
      </button>
    </div>
  );
}
