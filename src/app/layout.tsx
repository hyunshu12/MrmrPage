import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import AppBootGate from '@/components/AppBootGate.client';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import QueryClientProvider from '@/providers/QueryClientProvider';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mrmr.kr';
const SITE_NAME = '무럭무럭 | MurukMuruk';
const SITE_DESCRIPTION =
  '한국디지털미디어고등학교 스마트팜 동아리 무럭무럭 공식 웹사이트.';
const SITE_KEYWORDS = [
  '무럭무럭',
  '디미고 무럭무럭',
  '한국디지털미디어고등학교 무럭무럭',
  '스마트팜 동아리 무럭무럭',
  '디미고 스마트팜 동아리',
  '한국디지털미디어고등학교 동아리',
  'MurukMuruk',
] as const;
const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
const NAVER_SITE_VERIFICATION = process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: '%s | 무럭무럭 MurukMuruk',
  },
  description: SITE_DESCRIPTION,
  keywords: [...SITE_KEYWORDS],
  applicationName: '무럭무럭',
  authors: [{ name: '무럭무럭 MurukMuruk', url: SITE_URL }],
  creator: '무럭무럭 MurukMuruk',
  publisher: '무럭무럭 MurukMuruk',
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
    siteName: '무럭무럭 MurukMuruk',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: '/logo.png',
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
    images: ['/logo.png'],
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
    name: '무럭무럭 MurukMuruk',
    alternateName: ['디미고 무럭무럭', '한국디지털미디어고등학교 무럭무럭', '스마트팜 동아리 무럭무럭'],
    url: SITE_URL,
    inLanguage: 'ko-KR',
  };

  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: '무럭무럭 MurukMuruk',
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    keywords: [...SITE_KEYWORDS].join(', '),
  };

  return (
    <html lang="ko">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className="flex min-h-screen flex-col font-crimson">
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
