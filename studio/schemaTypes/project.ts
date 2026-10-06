import { RocketIcon } from '@sanity/icons/Rocket';
import { orderRankField, orderRankOrdering } from '@sanity/orderable-document-list';
import { defineField, defineType } from 'sanity';

export const project = defineType({
  name: 'project',
  title: '프로젝트',
  type: 'document',
  icon: RocketIcon,
  orderings: [orderRankOrdering],
  fields: [
    defineField({
      name: 'name',
      title: '프로젝트 이름',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'year',
      title: '연도',
      description: '예: 2025. 프로젝트 페이지의 연도 탭이 이 값으로 나뉩니다.',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: '설명',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'logo',
      title: '로고 / 대표 이미지',
      type: 'image',
      options: { hotspot: true },
    }),
    orderRankField({ type: 'project' }),
  ],
  preview: {
    select: { title: 'name', subtitle: 'year', media: 'logo' },
  },
});
