import { UsersIcon } from '@sanity/icons/Users';
import { orderRankField, orderRankOrdering } from '@sanity/orderable-document-list';
import { defineField, defineType } from 'sanity';

export const member = defineType({
  name: 'member',
  title: '멤버',
  type: 'document',
  icon: UsersIcon,
  orderings: [orderRankOrdering],
  fields: [
    defineField({
      name: 'name',
      title: '이름',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'murukGeneration',
      title: '무럭무럭 기수',
      description: '예: 3기. 멤버 페이지의 탭이 이 값으로 나뉩니다.',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'role',
      title: '역할',
      description: '카드 위쪽 색 띠가 역할에 따라 달라집니다.',
      type: 'string',
      options: {
        list: [
          { title: '개발 (Developer)', value: 'Developer' },
          { title: '기획 (Project Manager)', value: 'Project Manager' },
          { title: '디자인 (Designer)', value: 'Designer' },
        ],
        layout: 'radio',
        direction: 'horizontal',
      },
    }),
    defineField({
      name: 'schoolGeneration',
      title: '학교 기수',
      description: '예: 25기',
      type: 'string',
    }),
    defineField({
      name: 'className',
      title: '학과',
      type: 'string',
      options: {
        list: ['E-비즈니스과', '해킹방어과', '디지털콘텐츠과', '웹프로그래밍과'],
      },
    }),
    defineField({
      name: 'statusMessage',
      title: '한 줄 소개',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'avatar',
      title: '프로필 사진',
      description: '사진을 올린 뒤 연필 아이콘을 눌러 얼굴 위치(핫스팟)를 찍어두면 카드에서 그 부분이 보입니다.',
      type: 'image',
      options: { hotspot: true },
    }),
    orderRankField({ type: 'member' }),
  ],
  preview: {
    select: { title: 'name', generation: 'murukGeneration', role: 'role', media: 'avatar' },
    prepare: ({ title, generation, role, media }) => ({
      title,
      subtitle: [generation, role].filter(Boolean).join(' · '),
      media,
    }),
  },
});
