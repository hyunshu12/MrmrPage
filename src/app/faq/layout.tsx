import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.mrmr.kr';

export const metadata: Metadata = {
  title: {
    absolute: 'FAQ | 무럭무럭',
  },
  description:
    '디미고(한국디지털미디어고등학교) 스마트팜 동아리 무럭무럭의 자주 묻는 질문 페이지입니다. 동아리 활동과 지원 관련 정보를 확인하세요.',
  keywords: ['디미고 무럭무럭 FAQ', '한국디지털미디어고등학교 무럭무럭 FAQ', '스마트팜 동아리 질문'],
  alternates: {
    canonical: '/faq',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    title: 'FAQ | 무럭무럭',
    description: '디미고 스마트팜 동아리 무럭무럭의 자주 묻는 질문 페이지입니다.',
    images: [{ url: '/og-faq.png', width: 1200, height: 630, alt: '무럭무럭 FAQ' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FAQ | 무럭무럭',
    images: ['/og-faq.png'],
  },
};

export default function FaqLayout({ children }: { children: ReactNode }) {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'FAQ', item: `${SITE_URL}/faq` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {children}
    </>
  );
}
