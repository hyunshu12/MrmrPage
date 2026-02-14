import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: '프로젝트',
  description:
    '디미고(한국디지털미디어고등학교) 스마트팜 동아리 무럭무럭의 프로젝트를 소개합니다. 기술과 농업을 연결한 활동 결과를 확인할 수 있습니다.',
  keywords: [
    '디미고 무럭무럭 프로젝트',
    '한국디지털미디어고등학교 무럭무럭 프로젝트',
    '스마트팜 동아리 프로젝트',
  ],
  alternates: {
    canonical: '/projects',
  },
  robots: {
    index: false,
    follow: true,
    googleBot: {
      index: false,
      follow: true,
    },
  },
};

export default function ProjectsLayout({ children }: { children: ReactNode }) {
  return children;
}
