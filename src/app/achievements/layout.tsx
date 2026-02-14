import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: '업적',
  description:
    '디미고(한국디지털미디어고등학교) 스마트팜 동아리 무럭무럭의 수상 및 성과를 소개합니다. 공모전, 대회, 창업 프로젝트 업적을 확인하세요.',
  keywords: [
    '디미고 무럭무럭 업적',
    '한국디지털미디어고등학교 무럭무럭 수상',
    '스마트팜 동아리 업적',
  ],
  alternates: {
    canonical: '/achievements',
  },
};

export default function AchievementsLayout({ children }: { children: ReactNode }) {
  return children;
}
