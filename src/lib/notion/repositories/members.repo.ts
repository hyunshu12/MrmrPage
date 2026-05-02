import { env } from '@/lib/env';
import { type Member, memberSchema } from '@/types/member';
import { getNotionClient } from '../client';
import { mapPageToMember } from '../mappers';
import { createOrderAscSort, createPublishedFilter, queryAllPages } from '../queries';
import { validatePerRow } from '../safe-validate';

export async function getPublishedMembers(): Promise<Member[]> {
  const notion = getNotionClient();

  const pages = await queryAllPages(notion, {
    database_id: env.NOTION_MEMBERS_DB_ID,
    filter: createPublishedFilter(),
    sorts: createOrderAscSort(),
  });

  const mapped = pages.map(mapPageToMember);
  const validated = validatePerRow(mapped, memberSchema, 'members');
  return validated.filter((m) => m.name.trim().length > 0);
}
