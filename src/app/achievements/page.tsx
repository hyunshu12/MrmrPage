import { getPublishedAchievements } from '@/lib/notion';
import AchievementsPageClient from './AchievementsPageClient';

export default async function AchievementsPage() {
  const achievements = await getPublishedAchievements();
  return <AchievementsPageClient achievements={achievements} />;
}
