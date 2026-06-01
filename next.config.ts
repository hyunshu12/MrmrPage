import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Content-Security-Policy
 *
 * 빌드/런타임의 NODE_ENV에 따라 'unsafe-eval' 포함 여부를 분기한다.
 * - dev(turbopack/HMR)는 eval 기반 모듈 평가가 필요하므로 'unsafe-eval'을 허용한다.
 * - prod 번들은 eval이 불필요하므로 제거하여 공격 표면을 줄인다.
 *
 * 각 directive 근거:
 * - default-src 'self': 명시되지 않은 모든 리소스는 동일 출처로 제한.
 * - script-src: Next 하이드레이션 인라인 스크립트 + layout.tsx의 JSON-LD(<script type="application/ld+json">)
 *   가 인라인이라 'unsafe-inline' 필요. dev에서만 'unsafe-eval' 추가.
 * - style-src: globals.css가 google fonts / pretendard CSS를 @import 하고, 코드 전반에
 *   inline style(style={{...}})과 Tailwind 런타임 스타일이 있어 'unsafe-inline' + 두 CDN 허용.
 * - font-src: 폰트 파일은 fonts.gstatic.com(Crimson Text)과 cdn.jsdelivr.net(Pretendard).
 *   data: 는 인라인/base64 폰트 fallback 대비.
 * - img-src: next/image 최적화 경로는 동일 출처('self')지만, 원본/비최적화 fallback과
 *   blur placeholder(data:), blob: 을 대비해 S3 두 호스트를 명시.
 * - connect-src 'self': 브라우저 측 fetch는 React Query가 동일 출처 /api만 호출(api-client.ts).
 *   S3 다운로드(image-store.ts)는 서버(Node) 측이라 CSP 미적용.
 * - frame-ancestors 'none': 클릭재킹 방지(앱에 iframe 임베드 요구 없음).
 * - base-uri 'self' / form-action 'self' / object-src 'none': 베이스 URL 변조, 폼 탈취, 플러그인 차단.
 * - upgrade-insecure-requests: 혼합 콘텐츠를 https로 자동 승격.
 */
const cspDirectives = [
  "default-src 'self'",
  isProd ? "script-src 'self' 'unsafe-inline'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
  "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net data:",
  "img-src 'self' data: blob: https://prod-files-secure.s3.us-west-2.amazonaws.com https://s3.us-west-2.amazonaws.com",
  "connect-src 'self'",
  "media-src 'self'",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: cspDirectives,
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'prod-files-secure.s3.us-west-2.amazonaws.com',
        pathname: '/**',
      },
      // 레거시 호스트. image-store.ts의 ALLOWED_HOSTNAMES에 여전히 포함되어 있어
      // 일부 Notion 'file' URL이 이 호스트를 쓸 수 있으므로 제거하지 않는다.
      // pathname 제약으로 범위만 좁힌다.
      {
        protocol: 'https',
        hostname: 's3.us-west-2.amazonaws.com',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
