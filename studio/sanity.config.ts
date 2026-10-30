import { RocketIcon } from '@sanity/icons/Rocket';
import { StarIcon } from '@sanity/icons/Star';
import { UsersIcon } from '@sanity/icons/Users';
import { koKRLocale } from '@sanity/locale-ko-kr';
import { orderableDocumentListDeskItem } from '@sanity/orderable-document-list';
// 정렬 플러그인이 순서 값을 만들 때 쓰는 라이브러리(플러그인 의존성으로 함께 설치된다). 같은 형식을 내야 한다.
import { LexoRank } from 'lexorank';
import { useCallback, useRef, useState } from 'react';
import {
  type DocumentActionComponent,
  type DuplicateDocumentActionComponent,
  type SanityDocumentLike,
  defineConfig,
  useClient,
} from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './schemaTypes';

const ORDER_FIELD = 'orderRank';

/** 원본 바로 뒤, 그다음 문서 앞의 순서 값. 원본에 값이 없으면 새 문서처럼 맨 뒤에 둔다. */
function rankAfter(source: unknown, ranks: string[]): string {
  const sorted = [...ranks].sort();
  if (typeof source === 'string') {
    const next = sorted.find((rank) => rank > source);
    const current = LexoRank.parse(source);
    return (next ? current.between(LexoRank.parse(next)) : current.genNext().genNext()).toString();
  }
  const last = sorted[sorted.length - 1];
  return (last ? LexoRank.parse(last) : LexoRank.min()).genNext().genNext().toString();
}

const orderedDuplicates = new WeakMap<DocumentActionComponent, DocumentActionComponent>();

/**
 * 기본 '복제'는 orderRank 까지 그대로 복사해 원본과 순서 값이 같아진다.
 * 같은 값끼리는 사이트 순서가 정해지지 않고, 그 둘 사이로 끌어 놓으면 정렬 목록이 예외를 내고 멈춘다.
 * 그래서 기본 복제는 그대로 쓰고, 복제본에만 원본 바로 뒤의 새 순서 값을 넣는다.
 */
function withFreshOrderRank(original: DocumentActionComponent): DocumentActionComponent {
  // 같은 함수를 돌려줘야 문서를 열 때마다 액션이 새로 마운트되지 않는다.
  const cached = orderedDuplicates.get(original);
  if (cached) return cached;

  // 내장 복제 액션은 mapDocument 를 받는다(타입만 공개돼 있다).
  const Duplicate = original as DuplicateDocumentActionComponent;
  const OrderedDuplicateAction: DocumentActionComponent = (props) => {
    const client = useClient({ apiVersion: '2025-02-19' });
    const ranks = useRef<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);

    const mapDocument = useCallback((doc: SanityDocumentLike) => {
      const { [ORDER_FIELD]: sourceRank, ...rest } = doc;
      try {
        return { ...rest, [ORDER_FIELD]: rankAfter(sourceRank, ranks.current) };
      } catch {
        // 순서 값이 깨져 있으면 값 없이 만든다. 목록 메뉴의 'Reset Order' 로 다시 매길 수 있다.
        return rest;
      }
    }, []);

    const action = Duplicate({ ...props, mapDocument });
    if (!action) return null;
    return {
      ...action,
      disabled: action.disabled || loading,
      dialog: failed
        ? {
            type: 'popover',
            content: '순서 값을 확인하지 못해 복제하지 않았습니다. 잠시 뒤 다시 눌러 주세요.',
            onClose: () => setFailed(false),
          }
        : action.dialog,
      onHandle: async () => {
        setLoading(true);
        try {
          // 초안·릴리스 버전까지 모두 본다. 아직 발행하지 않은 다른 복제본과도 겹치지 않게.
          ranks.current = await client.fetch<string[]>(
            `*[_type == $type && defined(${ORDER_FIELD})].${ORDER_FIELD}`,
            { type: props.type },
            { perspective: 'raw' },
          );
        } catch {
          setFailed(true);
          return;
        } finally {
          setLoading(false);
        }
        action.onHandle?.();
      },
    };
  };
  OrderedDuplicateAction.action = original.action;
  OrderedDuplicateAction.displayName = 'OrderedDuplicateAction';
  orderedDuplicates.set(original, OrderedDuplicateAction);
  return OrderedDuplicateAction;
}

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

  document: {
    // 순서 필드(orderRank)가 있는 타입만 복제 동작을 바꾼다.
    actions: (prev, { schema, schemaType }) => {
      const type = schema.get(schemaType);
      const orderable = type?.jsonType === 'object' && type.fields.some((field) => field.name === ORDER_FIELD);
      return orderable
        ? prev.map((action) => (action.action === 'duplicate' ? withFreshOrderRank(action) : action))
        : prev;
    },
  },
});
