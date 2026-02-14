import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Q&A',
  description:
    '디미고(한국디지털미디어고등학교) 스마트팜 동아리 무럭무럭의 자주 묻는 질문 페이지입니다. 동아리 활동과 지원 관련 정보를 확인하세요.',
  keywords: [
    '디미고 무럭무럭 Q&A',
    '한국디지털미디어고등학교 무럭무럭 FAQ',
    '스마트팜 동아리 질문',
  ],
  alternates: {
    canonical: '/qna',
  },
};

export default function QnaLayout({ children }: { children: ReactNode }) {
  return children;
}
