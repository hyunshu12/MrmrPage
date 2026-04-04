import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.mrmr.kr';

export const metadata: Metadata = {
  title: {
    absolute: '프로젝트 | 무럭무럭',
  },
  description:
    '디미고(한국디지털미디어고등학교) 스마트팜 동아리 무럭무럭의 프로젝트를 소개합니다. 기술과 농업을 연결한 활동 결과를 확인할 수 있습니다.',
  keywords: ['디미고 무럭무럭 프로젝트', '한국디지털미디어고등학교 무럭무럭 프로젝트', '스마트팜 동아리 프로젝트'],
  alternates: {
    canonical: '/projects',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    title: '프로젝트 | 무럭무럭',
    description: '디미고 스마트팜 동아리 무럭무럭의 프로젝트를 소개합니다.',
    images: [{ url: '/og-projects.png', width: 1200, height: 630, alt: '무럭무럭 프로젝트' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '프로젝트 | 무럭무럭',
    images: ['/og-projects.png'],
  },
};

export default function ProjectsLayout({ children }: { children: ReactNode }) {
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '홈', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: '프로젝트', item: `${SITE_URL}/projects` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      {children}
    </>
  );
}
