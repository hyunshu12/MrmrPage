import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.mrmr.kr';

export const metadata: Metadata = {
  title: {
    absolute: '업적 | 무럭무럭',
  },
  description:
    '디미고(한국디지털미디어고등학교) 스마트팜 동아리 무럭무럭의 수상 및 성과를 소개합니다. 공모전, 대회, 창업 프로젝트 업적을 확인하세요.',
  keywords: ['디미고 무럭무럭 업적', '한국디지털미디어고등학교 무럭무럭 수상', '스마트팜 동아리 업적'],
  alternates: {
    canonical: '/achievements',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    title: '업적 | 무럭무럭',
    description: '디미고 스마트팜 동아리 무럭무럭의 수상 및 성과를 소개합니다.',
    images: [{ url: '/og-achievements.png', width: 1200, height: 630, alt: '무럭무럭 업적' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '업적 | 무럭무럭',
    images: ['/og-achievements.png'],
  },
};

export default function AchievementsLayout({ children }: { children: ReactNode }) {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: '업적', item: `${SITE_URL}/achievements` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {children}
    </>
  );
}
