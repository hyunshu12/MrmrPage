import type { Metadata } from 'next';
import { getPublishedAchievements, getPublishedProjects } from '@/lib/notion';
import HomePageClient from './HomePageClient';

export const revalidate = 1800;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.mrmr.kr';

export const metadata: Metadata = {
  title: '무럭무럭 | 디미고 스마트팜 동아리',
  description: '한국디지털미디어고등학교(디미고) 유일 스마트팜 동아리 무럭무럭 공식 웹사이트. 농업과 기술의 만남.',
  openGraph: {
    title: '무럭무럭 | 디미고 스마트팜 동아리',
    description: '한국디지털미디어고등학교(디미고) 유일 스마트팜 동아리 무럭무럭 공식 웹사이트.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
};

export default async function HomePage() {
  const [projects, achievements] = await Promise.all([getPublishedProjects(), getPublishedAchievements()]);
  return <HomePageClient projects={projects} achievements={achievements} />;
}
