import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import type { ReactNode } from 'react';
import './globals.css';
import AppBootGate from '@/components/AppBootGate.client';
import BoothFonts from '@/components/BoothFonts.client';
import { INTRO_FLAG_SCRIPT } from '@/components/intro/intro-flag';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import QueryClientProvider from '@/providers/QueryClientProvider';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.mrmr.kr';
const SITE_NAME = '무럭무럭 | MRMR';
const SITE_DESCRIPTION = '한국디지털미디어고등학교 스마트팜 동아리 무럭무럭 공식 웹사이트.';
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
    type: 'website',
    locale: 'ko_KR',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/logo.png`,
        width: 1200,
        height: 1200,
        alt: '무럭무럭 로고',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/logo.png`],
  },
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#688a46',
};

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
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: 코드에 고정된 상수 문자열이다 */}
        <script dangerouslySetInnerHTML={{ __html: INTRO_FLAG_SCRIPT }} />
        <Script id="ld-website" type="application/ld+json" strategy="beforeInteractive">
          {JSON.stringify(websiteJsonLd)}
        </Script>
        <Script id="ld-organization" type="application/ld+json" strategy="beforeInteractive">
          {JSON.stringify(organizationJsonLd)}
        </Script>
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
