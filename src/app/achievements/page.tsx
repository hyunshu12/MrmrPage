import { getPublishedAchievements } from '@/lib/notion';
import AchievementsPageClient from './AchievementsPageClient';

export const revalidate = 1800;

export default async function AchievementsPage() {
  const achievements = await getPublishedAchievements();
  return <AchievementsPageClient achievements={achievements} />;
}
