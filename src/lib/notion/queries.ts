import type { Client } from '@notionhq/client';
import type {
  PageObjectResponse,
  QueryDatabaseParameters,
  QueryDatabaseResponse,
} from '@notionhq/client/build/src/api-endpoints';

type FilterCondition = QueryDatabaseParameters['filter'];
type SortCondition = QueryDatabaseParameters['sorts'];

export function createPublishedFilter(): FilterCondition {
  return {
    property: 'Published',
    checkbox: {
      equals: true,
    },
  };
}

export function createOrderAscSort(): SortCondition {
  return [
    {
      property: 'Order',
      direction: 'ascending',
    },
  ];
}

export async function queryAllPages(notion: Client, params: QueryDatabaseParameters): Promise<PageObjectResponse[]> {
  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const response: QueryDatabaseResponse = await notion.databases.query({
      ...params,
      start_cursor: cursor,
    });
    for (const result of response.results) {
      if (result.object === 'page' && 'properties' in result) {
        pages.push(result as PageObjectResponse);
      }
    }
    cursor = response.has_more ? (response.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return pages;
}
