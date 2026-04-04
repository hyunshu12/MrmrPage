import { env } from '@/lib/env';
import { type Member, memberArraySchema } from '@/types/member';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { unstable_cache } from 'next/cache';
import { getNotionClient } from '../client';
import { mapPageToMember } from '../mappers';
import { createOrderAscSort, createPublishedFilter } from '../queries';

async function fetchPublishedMembers(): Promise<Member[]> {
  const notion = getNotionClient();

  const response = await notion.databases.query({
    database_id: env.NOTION_MEMBERS_DB_ID,
    filter: createPublishedFilter(),
    sorts: createOrderAscSort(),
  });

  const members = response.results
    .filter((page): page is PageObjectResponse => page.object === 'page' && 'properties' in page)
    .map(mapPageToMember);

  const parsed = memberArraySchema.safeParse(members);
  if (!parsed.success) {
    console.error('Members validation failed:', parsed.error.flatten());
    throw new Error('Failed to validate members data');
  }

  return parsed.data.filter((m) => m.name.trim().length > 0);
}

export const getPublishedMembers = unstable_cache(fetchPublishedMembers, ['notion-members'], {
  revalidate: 1800,
  tags: ['members'],
});

// getMemberBySlug removed: Members DB has no Slug column.
