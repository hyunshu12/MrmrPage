import { RocketIcon } from '@sanity/icons/Rocket';
import { orderRankField, orderRankOrdering } from '@sanity/orderable-document-list';
import { defineField, defineType } from 'sanity';
import { checkYear } from './tabValues';

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
      description: '네 자리 숫자로만 씁니다. 예: 2025. 프로젝트 페이지의 연도 탭이 이 값으로 나뉩니다.',
      type: 'string',
      placeholder: '2025',
      validation: (rule) => rule.required().custom(checkYear),
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
      description:
        '홈 대표 카드에서는 잘리지 않고 가운데에 놓이고, 프로젝트 페이지에서는 1:1 정사각형 칸을 채웁니다. 태블릿처럼 좁은 화면에서는 칸이 세로로 길어져 좌우가 잘릴 수 있으니, 연필 아이콘을 눌러 핫스팟을 로고 중심에 맞춰 두세요. 정사각형 이미지를 권장하며, 배경이 투명한 PNG도 괜찮습니다.',
      type: 'image',
      options: { hotspot: true },
    }),
    orderRankField({ type: 'project' }),
  ],
  preview: {
    select: { title: 'name', subtitle: 'year', media: 'logo' },
  },
});
