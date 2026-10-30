import { UsersIcon } from '@sanity/icons/Users';
import { orderRankField, orderRankOrdering } from '@sanity/orderable-document-list';
import { defineField, defineType } from 'sanity';
import { checkGeneration } from './tabValues';

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
      description: "숫자 뒤에 '기'를 붙여 띄어쓰기 없이 씁니다. 예: 3기. 멤버 페이지의 탭이 이 값 그대로 나뉩니다.",
      type: 'string',
      placeholder: '3기',
      validation: (rule) => rule.required().custom(checkGeneration),
    }),
    defineField({
      name: 'role',
      title: '역할',
      // 비어 있어도 된다. 사이트는 역할 글자를 빼고 회색 선만 그린다(getRoleColor).
      description:
        '멤버 카드의 이름 아래 짧은 선 색과 역할 이름이 이 값으로 정해집니다. 아직 정해지지 않았으면 비워 두세요. 회색 선만 나옵니다.',
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
      description:
        '멤버 카드에 4:5 세로 비율로 잘려 나옵니다. 사진을 올린 뒤 연필 아이콘을 눌러 핫스팟을 얼굴에 맞춰 두면 얼굴이 보이게 잘립니다.',
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
