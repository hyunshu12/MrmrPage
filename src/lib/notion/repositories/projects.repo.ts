import { env } from '@/lib/env';
import { type Project, projectSchema } from '@/types/project';
import { getNotionClient } from '../client';
import { mapPageToProject } from '../mappers';
import { createOrderAscSort, createPublishedFilter, queryAllPages } from '../queries';
import { validatePerRow } from '../safe-validate';

export async function getPublishedProjects(): Promise<Project[]> {
  const notion = getNotionClient();

  const pages = await queryAllPages(notion, {
    database_id: env.NOTION_PROJECTS_DB_ID,
    filter: createPublishedFilter(),
    sorts: createOrderAscSort(),
  });

  const mapped = pages.map(mapPageToProject);
  const validated = validatePerRow(mapped, projectSchema, 'projects');
  return validated.filter((p) => p.name.trim().length > 0);
}
