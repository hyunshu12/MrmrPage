import { env } from '@/lib/env';
import { type Achievement, achievementSchema } from '@/types/achievement';
import { getNotionClient } from '../client';
import { mapPageToAchievement } from '../mappers';
import { createOrderAscSort, createPublishedFilter, queryAllPages } from '../queries';
import { validatePerRow } from '../safe-validate';

export async function getPublishedAchievements(): Promise<Achievement[]> {
  const notion = getNotionClient();

  const pages = await queryAllPages(notion, {
    database_id: env.NOTION_ACHIEVEMENTS_DB_ID,
    filter: createPublishedFilter(),
    sorts: createOrderAscSort(),
  });

  const mapped = pages.map(mapPageToAchievement);
  const validated = validatePerRow(mapped, achievementSchema, 'achievements');
  return validated.filter((a) => a.name.trim().length > 0);
}
