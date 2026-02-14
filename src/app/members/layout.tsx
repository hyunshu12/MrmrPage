import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  description:
    '디미고(한국디지털미디어고등학교) 스마트팜 동아리 무럭무럭의 멤버를 소개합니다. 기획, 디자인, 개발 멤버 구성을 확인할 수 있습니다.',
  keywords: [
    '디미고 무럭무럭 멤버',
    '한국디지털미디어고등학교 무럭무럭 멤버소개',
    '스마트팜 동아리 멤버',
  ],
  alternates: {
    canonical: '/members',
  },
};

export default function MembersLayout({ children }: { children: ReactNode }) {
  return children;
}
