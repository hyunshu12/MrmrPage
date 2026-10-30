import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';
// Vercel 은 빌드·런타임 모두 VERCEL=1 이고 항상 HTTPS 로 서빙한다.
const isVercel = process.env.VERCEL === '1';

/**
 * Content-Security-Policy
 *
 * 빌드/런타임의 NODE_ENV에 따라 'unsafe-eval' 포함 여부를 분기한다.
 * - dev(turbopack/HMR)는 eval 기반 모듈 평가가 필요하므로 'unsafe-eval'을 허용한다.
 * - prod 번들은 eval이 불필요하므로 제거하여 공격 표면을 줄인다.
 *
 * 각 directive 근거:
 * - default-src 'self': 명시되지 않은 모든 리소스는 동일 출처로 제한.
 * - script-src: Next 하이드레이션 인라인 스크립트(self.__next_f)와 layout.tsx의 INTRO_FLAG_SCRIPT가
 *   인라인이라 'unsafe-inline' 필요. JSON-LD(<script type="application/ld+json">)는 실행되지 않는
 *   데이터 블록이라 script-src 대상이 아니다. dev에서만 'unsafe-eval' 추가.
 * - style-src: layout.tsx가 Pretendard CSS를 jsdelivr에서 <link>로 받고, 코드 전반에
 *   inline style(style={{...}})이 있어 'unsafe-inline' + jsdelivr 허용.
 * - font-src: Crimson Text는 next/font가 동일 출처(/_next/static/media)로 내려주고,
 *   Pretendard 파일은 cdn.jsdelivr.net. data: 는 인라인/base64 폰트 fallback 대비.
 * - img-src: 로컬 이미지는 /_next/image('self'), Sanity 이미지는 커스텀 로더(src/lib/image-loader.ts)로
 *   Sanity CDN에서 직접 받는다. blur placeholder(data:)와 blob: 도 허용.
 * - connect-src 'self': 브라우저 측 fetch는 React Query가 동일 출처 /api만 호출(api-client.ts).
 *   Sanity 조회(src/lib/sanity)는 서버(Node) 측이라 CSP 미적용.
 * - frame-ancestors 'none': 클릭재킹 방지(앱에 iframe 임베드 요구 없음).
 * - base-uri 'self' / form-action 'self' / object-src 'none': 베이스 URL 변조, 폼 탈취, 플러그인 차단.
 * - upgrade-insecure-requests: HTTPS로만 서빙되는 Vercel에서만 보낸다. 평문 HTTP로 띄운 서버
 *   (TLS 없는 Docker, LAN에서 next start 등)에 붙으면 브라우저가 하위 요청을 전부 https로 바꿔 화면이 빈다.
 */
const cspDirectives = [
  "default-src 'self'",
  isProd ? "script-src 'self' 'unsafe-inline'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "font-src 'self' https://cdn.jsdelivr.net data:",
  "img-src 'self' data: blob: https://cdn.sanity.io",
  "connect-src 'self'",
  "media-src 'self'",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isVercel ? ['upgrade-insecure-requests'] : []),
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
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  // vgpu(WebGPU) 셰이더 로더.
  // .wgsl 파일을 빌드 타임에 JS 문자열 모듈로 변환한다. 런타임 eval이 없으므로
  // prod CSP(script-src에 'unsafe-eval' 없음)와 충돌하지 않는다.
  turbopack: {
    rules: {
      '*.wgsl': {
        loaders: ['@vgpu/wgsl/loader-webpack'],
        as: '*.js',
      },
    },
  },
  images: {
    // /_next/image 는 public/ 의 로컬 이미지만 최적화한다. Sanity 이미지는 CmsImage 가 커스텀 로더로
    // Sanity CDN 에서 직접 줄여 받으므로 remotePatterns 를 두지 않는다. 그래서 /_next/image 에 Sanity URL 을
    // 넣어 변환 한도를 소진시키는 요청은 거절된다.
    formats: ['image/avif', 'image/webp'],
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
