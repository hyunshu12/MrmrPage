'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          backgroundColor: '#f6f7f1',
          color: '#1f2d1c',
        }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>사이트에 문제가 발생했어요</h1>
        <p style={{ marginTop: '16px', maxWidth: '420px', lineHeight: 1.7, fontSize: '0.95rem' }}>
          예상치 못한 오류로 페이지를 표시할 수 없습니다. 잠시 후 다시 시도해 주세요.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: '32px',
            padding: '12px 28px',
            border: 'none',
            borderRadius: '999px',
            background: '#688a46',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}>
          다시 시도
        </button>
      </body>
    </html>
  );
}
