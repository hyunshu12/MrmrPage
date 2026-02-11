import { env } from '@/lib/env';
import { type Project, projectArraySchema } from '@/types/project';
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints';
import { getNotionClient } from '../client';
import { mapPageToProject } from '../mappers';
import { createOrderAscSort, createPublishedFilter } from '../queries';

export async function getPublishedProjects(): Promise<Project[]> {
  const notion = getNotionClient();

  const response = await notion.databases.query({
    database_id: env.NOTION_PROJECTS_DB_ID,
    filter: createPublishedFilter(),
    sorts: createOrderAscSort(),
  });

  const projects = response.results
    .filter((page): page is PageObjectResponse => page.object === 'page' && 'properties' in page)
    .map(mapPageToProject);

  const parsed = projectArraySchema.safeParse(projects);
  if (!parsed.success) {
    console.error('Projects validation failed:', parsed.error.flatten());
    throw new Error('Failed to validate projects data');
  }

  return parsed.data.filter((p) => p.name.trim().length > 0);
}

// getProjectBySlug removed: Projects DB has no Slug column.
