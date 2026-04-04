import { env } from '@/lib/env';
import { type Achievement, achievementArraySchema } from '@/types/achievement';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { unstable_cache } from 'next/cache';
import { getNotionClient } from '../client';
import { mapPageToAchievement } from '../mappers';
import { createOrderAscSort, createPublishedFilter } from '../queries';

async function fetchPublishedAchievements(): Promise<Achievement[]> {
  const notion = getNotionClient();

  const response = await notion.databases.query({
    database_id: env.NOTION_ACHIEVEMENTS_DB_ID,
    filter: createPublishedFilter(),
    sorts: createOrderAscSort(),
  });

  const achievements = response.results
    .filter((page): page is PageObjectResponse => page.object === 'page' && 'properties' in page)
    .map(mapPageToAchievement);

  const parsed = achievementArraySchema.safeParse(achievements);
  if (!parsed.success) {
    console.error('Achievements validation failed:', parsed.error.flatten());
    throw new Error('Failed to validate achievements data');
  }

  return parsed.data.filter((a) => a.name.trim().length > 0);
}

export const getPublishedAchievements = unstable_cache(fetchPublishedAchievements, ['notion-achievements'], {
  revalidate: 1800,
  tags: ['achievements'],
});

// getAchievementBySlug removed: Achievements DB has no Slug column.
