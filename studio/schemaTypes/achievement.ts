import { StarIcon } from '@sanity/icons/Star';
import { orderRankField, orderRankOrdering } from '@sanity/orderable-document-list';
import { defineField, defineType } from 'sanity';

export const achievement = defineType({
  name: 'achievement',
  title: '업적',
  type: 'document',
  icon: StarIcon,
  orderings: [orderRankOrdering],
  fields: [
    defineField({
      name: 'name',
      title: '대회 / 행사 이름',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'award',
      title: '수상 내역',
      description: '예: 최우수상',
      type: 'string',
    }),
    defineField({
      name: 'date',
      title: '날짜',
      type: 'date',
    }),
    defineField({
      name: 'year',
      title: '연도',
      description: '비워두면 날짜의 연도를 씁니다. 업적 페이지의 연도 탭이 이 값으로 나뉩니다.',
      type: 'string',
    }),
    defineField({
      name: 'team',
      title: '팀 이름',
      type: 'string',
    }),
    defineField({
      name: 'members',
      title: '팀원',
      description: '이름을 입력하고 Enter 를 누르면 한 명씩 추가됩니다.',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    }),
    defineField({
      name: 'thumbnail',
      title: '대표 사진',
      type: 'image',
      options: { hotspot: true },
    }),
    orderRankField({ type: 'achievement' }),
  ],
  preview: {
    select: { title: 'name', award: 'award', date: 'date', media: 'thumbnail' },
    prepare: ({ title, award, date, media }) => ({
      title,
      subtitle: [award, date].filter(Boolean).join(' · '),
      media,
    }),
  },
});
