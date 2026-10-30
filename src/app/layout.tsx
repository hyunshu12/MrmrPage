import type { Metadata, Viewport } from 'next';
import { Crimson_Text } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';
import AppBootGate from '@/components/AppBootGate.client';
import BoothFonts from '@/components/BoothFonts.client';
import { INTRO_FLAG_SCRIPT } from '@/components/intro/intro-flag';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, baseOpenGraph, baseTwitter } from '@/lib/site';
import QueryClientProvider from '@/providers/QueryClientProvider';

/*
 * 라틴 글자·숫자는 Crimson Text, 한글은 Pretendard 로 그린다 (globals.css 의 font-family 순서).
 * Crimson 은 next/font 가 빌드에 넣어 같은 출처에서 내려준다. 사이트에 기울임꼴은 없어 쓰는 굵기 셋만 받는다.
 * 폴백을 Pretendard 로 못박는 이유: 자동 폴백(Times New Roman 보정 face)이 끼면 Crimson 에 없는 기호(→ 등)를
 * Pretendard 보다 먼저 가져간다. Turbopack 은 adjustFontFallback: false 를 무시하고 fallback 이 없을 때만
 * 자동 폴백을 만들므로 fallback 을 준다. adjustFontFallback 은 webpack 빌드용으로 남긴다.
 */
const crimson = Crimson_Text({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-crimson',
  fallback: ['Pretendard'],
  adjustFontFallback: false,
});

/** 화면에 나온 글자 조각(unicode-range)만 받는 dynamic subset 판. */
const PRETENDARD_CSS_URL =
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard-dynamic-subset.min.css';

const SITE_KEYWORDS = [
  '무럭무럭',
  '디미고 무럭무럭',
  '한국디지털미디어고등학교 무럭무럭',
  '스마트팜 동아리 무럭무럭',
  '디미고 스마트팜 동아리',
  '한국디지털미디어고등학교 동아리',
  'MRMR',
  'MurukMuruk',
] as const;
const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const NAVER_SITE_VERIFICATION = process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION;

// 파비콘과 홈 화면 아이콘은 app/icon.png · app/apple-icon.png 파일 규칙으로 Next 가 크기와 함께 붙인다.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: '%s | 무럭무럭 | MRMR',
  },
  description: SITE_DESCRIPTION,
  keywords: [...SITE_KEYWORDS],
  applicationName: '무럭무럭',
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: 'Education',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  verification: {
    ...(GOOGLE_SITE_VERIFICATION ? { google: GOOGLE_SITE_VERIFICATION } : {}),
    ...(NAVER_SITE_VERIFICATION
      ? {
          other: {
            'naver-site-verification': NAVER_SITE_VERIFICATION,
          },
        }
      : {}),
  },
  openGraph: {
    ...baseOpenGraph,
    url: SITE_URL,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    ...baseTwitter,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  alternates: {
    canonical: '/',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#688a46',
};

/** 크롤러가 JS 없이 읽도록 서버 HTML 에 그대로 싣는다. '<' 를 이스케이프해 </script> 로 끊기지 않게 한다. */
function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: 코드에 고정된 데이터를 직렬화한다
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: ['디미고 무럭무럭', '한국디지털미디어고등학교 무럭무럭', '스마트팜 동아리 무럭무럭'],
    url: SITE_URL,
    inLanguage: 'ko-KR',
  };

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    keywords: [...SITE_KEYWORDS].join(', '),
  };

  return (
    // suppressHydrationWarning: 아래 인라인 스크립트가 하이드레이션 전에 data-intro 를 단다.
    // data-scroll-behavior: 페이지를 옮길 때는 smooth 를 잠깐 꺼 맨 위로 바로 간다. 같은 페이지 안 앵커는 그대로 부드럽다.
    <html lang="ko" className={crimson.variable} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: 코드에 고정된 상수 문자열이다 */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_FLAG_SCRIPT }} />
        {/* 인트로 스크립트보다 뒤에 둔다. 앞에 두면 스크립트가 이 CSS 를 다 받을 때까지 실행되지 않는다.
            crossOrigin 을 맞춰야 CSS 와 폰트 파일이 미리 열어 둔 같은 연결을 쓴다. */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="stylesheet" href={PRETENDARD_CSS_URL} crossOrigin="anonymous" />
        <JsonLd data={websiteJsonLd} />
        <JsonLd data={organizationJsonLd} />
      </head>
      <body className="flex min-h-screen flex-col font-crimson">
        {/* 부스 모드에서만 로컬 웹폰트를 얹는다. 스플래시보다 먼저 마운트되도록 게이트 바깥에 둔다. */}
        <BoothFonts />
        <QueryClientProvider>
          <AppBootGate>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </AppBootGate>
        </QueryClientProvider>
      </body>
    </html>
  );
}
