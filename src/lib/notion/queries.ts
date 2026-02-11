import type { QueryDatabaseParameters } from '@notionhq/client/build/src/api-endpoints';

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
