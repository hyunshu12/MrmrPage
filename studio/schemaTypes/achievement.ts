import { StarIcon } from '@sanity/icons/Star';
import { orderRankField, orderRankOrdering } from '@sanity/orderable-document-list';
import { defineField, defineType } from 'sanity';
import { checkYear } from './tabValues';

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
      description:
        '네 자리 숫자로만 씁니다. 예: 2025. 비워두면 날짜의 연도를 씁니다. 업적 페이지의 연도 탭이 이 값으로 나뉩니다.',
      type: 'string',
      placeholder: '2025',
      validation: (rule) => [
        rule.custom(checkYear),
        // 둘 다 없으면 '기타' 탭으로 간다. 일부러 그럴 수도 있어 발행은 막지 않는다.
        rule
          .custom((year, context) =>
            year || context.document?.date ? true : "연도나 날짜가 없으면 업적 페이지의 '기타' 탭에 들어갑니다.",
          )
          .warning(),
      ],
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
      description:
        '업적 카드와 홈 화면에 16:10 가로 비율로 잘려 나옵니다. 연필 아이콘을 눌러 핫스팟을 꼭 보여야 할 곳(사람·상장 등)에 맞춰 두면 그 부분이 보이게 잘립니다.',
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
