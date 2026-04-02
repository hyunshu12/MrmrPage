import { getPublishedAchievements, getPublishedProjects } from '@/lib/notion';
import HomePageClient from './HomePageClient';

export default async function HomePage() {
  const [projects, achievements] = await Promise.all([getPublishedProjects(), getPublishedAchievements()]);
  return <HomePageClient projects={projects} achievements={achievements} />;
}
