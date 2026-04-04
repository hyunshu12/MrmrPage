import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.mrmr.kr';

export const metadata: Metadata = {
  title: {
    absolute: '멤버소개 | 무럭무럭',
  },
  description:
    '디미고(한국디지털미디어고등학교) 스마트팜 동아리 무럭무럭의 멤버를 소개합니다. 기획, 디자인, 개발 멤버 구성을 확인할 수 있습니다.',
  keywords: ['디미고 무럭무럭 멤버', '한국디지털미디어고등학교 무럭무럭 멤버소개', '스마트팜 동아리 멤버'],
  alternates: {
    canonical: '/members',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    title: '멤버소개 | 무럭무럭',
    description: '디미고 스마트팜 동아리 무럭무럭의 멤버를 소개합니다.',
    images: [{ url: '/og-members.png', width: 1200, height: 630, alt: '무럭무럭 멤버' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '멤버소개 | 무럭무럭',
    images: ['/og-members.png'],
  },
};

export default function MembersLayout({ children }: { children: ReactNode }) {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: '멤버소개', item: `${SITE_URL}/members` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {children}
    </>
  );
}
