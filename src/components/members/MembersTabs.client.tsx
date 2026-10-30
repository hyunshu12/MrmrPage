'use client';

import CmsImage from '@/components/CmsImage';
import FilterTabs, { useTabGroups } from '@/components/common/FilterTabs';
import ImagePlaceholder from '@/components/common/ImagePlaceholder';
import { compareGenerationKeys, memberGenerationOf } from '@/components/common/tab-keys';
import { membersQueryKey } from '@/hooks/useApi';
import { getRoleColor } from '@/lib/getRoleColor';
import { memberPhotoSizes } from '@/lib/image-sizes';
import type { Member } from '@/types';

export default function MembersTabs({ members }: { members: Member[] }) {
  // 기본 선택은 가장 최근 기수이고, 데이터가 바뀌면(새 기수 추가 등) 그대로 따라간다.
  const { keys, active, select, activeItems } = useTabGroups(members, memberGenerationOf, compareGenerationKeys);

  if (keys.length === 0) {
    return null;
  }

  return (
    <div className="space-y-10">
      {/* 기수 탭 */}
      <FilterTabs label="기수" keys={keys} active={active} onSelect={select} />

      <h2 className="sr-only">{active} 멤버</h2>

      {/* 멤버 카드 그리드: 4:5 사진이라 휴대폰에서 한 열이면 카드 하나가 화면을 거의 채운다. 휴대폰부터 2열. */}
      <div key={active} className="reveal-up grid grid-cols-2 gap-3 sm:gap-8 lg:grid-cols-4">
        {activeItems.map((member) => (
          <div
            key={member.id}
            className="content-visibility-auto cv-member group overflow-hidden rounded-2xl bg-white shadow-md transition-all hover:shadow-xl hover:-translate-y-1 sm:rounded-card">
            {/* 프로필 이미지 영역 (4:5 세로) */}
            <div className="aspect-[4/5] w-full overflow-hidden bg-gray-200">
              <CmsImage
                src={member.avatarUrl}
                alt={member.name}
                width={640}
                height={800}
                sizes={memberPhotoSizes(member.avatarUrl)}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                position={member.avatarPosition}
                invalidateQueryKey={membersQueryKey}
                fallback={
                  <ImagePlaceholder emoji="🌿" className="bg-muruk-green-lightest/40 text-muruk-green-muted/30" />
                }
              />
            </div>

            {/* 정보 영역 */}
            <div className="px-3 py-4 text-center sm:p-5">
              {/* 이름 */}
              <h3 className="text-balance-safe text-lg font-semibold text-gray-900 sm:text-2xl">{member.name}</h3>

              {/* 역할 색상 라인 */}
              <div
                className="mx-auto mt-2 h-[2px] w-10 rounded-full sm:w-12"
                style={{ backgroundColor: getRoleColor(member.role) }}
              />

              {/* 역할 & 학과 & 상태 메시지 */}
              <div className="mt-2.5 space-y-0.5 text-xs text-gray-600 sm:mt-3 sm:text-sm">
                {member.role && <p>{member.role}</p>}
                {(member.schoolGeneration || member.className) && (
                  <p>
                    {member.schoolGeneration ?? ''}
                    {member.schoolGeneration && member.className ? ' ' : ''}
                    {member.className ?? ''}
                  </p>
                )}
                {member.statusMessage && (
                  <p className="text-balance-safe break-words whitespace-pre-line leading-relaxed text-gray-500">
                    {member.statusMessage}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
