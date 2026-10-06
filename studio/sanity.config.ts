import { RocketIcon } from '@sanity/icons/Rocket';
import { StarIcon } from '@sanity/icons/Star';
import { UsersIcon } from '@sanity/icons/Users';
import { koKRLocale } from '@sanity/locale-ko-kr';
import { orderableDocumentListDeskItem } from '@sanity/orderable-document-list';
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './schemaTypes';

export default defineConfig({
  name: 'default',
  title: '무럭무럭',

  projectId: 'dldhzjbv',
  dataset: 'production',

  plugins: [
    // 목록은 끌어서 순서를 바꾼다. 그 순서가 사이트에 그대로 나온다.
    structureTool({
      structure: (S, context) =>
        S.list()
          .id('content')
          .title('콘텐츠')
          .items([
            orderableDocumentListDeskItem({ type: 'member', title: '멤버', icon: UsersIcon, S, context }),
            orderableDocumentListDeskItem({ type: 'project', title: '프로젝트', icon: RocketIcon, S, context }),
            orderableDocumentListDeskItem({ type: 'achievement', title: '업적', icon: StarIcon, S, context }),
          ]),
    }),
    koKRLocale(),
  ],

  schema: {
    types: schemaTypes,
  },
});
