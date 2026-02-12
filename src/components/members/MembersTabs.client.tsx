'use client';

import { getRoleColor } from '@/lib/getRoleColor';
import type { Member } from '@/types';
import { useMemo, useState } from 'react';

function parseMurukGen(value: string): number | null {
  const match = value.match(/(\d+)/);
  if (!match) return null;
  const num = Number(match[1]);
  return Number.isFinite(num) ? num : null;
}

function sortMurukKeys(a: string, b: string): number {
  if (a === '미분류') return 1;
  if (b === '미분류') return -1;

  const an = parseMurukGen(a);
  const bn = parseMurukGen(b);
  if (an !== null && bn !== null) return bn - an;
  if (an !== null) return -1;
  if (bn !== null) return 1;
  return b.localeCompare(a, 'ko');
}

function normalizeAvatarPosition(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().toLowerCase();

  // keyword format: "center", "top center", "left top", etc.
  const keywordPattern = /^(center|top|bottom|left|right)(\s+(center|top|bottom|left|right))?$/;
  if (keywordPattern.test(trimmed)) return trimmed;

  // percentage format: "50% 20%"
  const percentPattern = /^(-?\d{1,3})%\s+(-?\d{1,3})%$/;
  const match = trimmed.match(percentPattern);
  if (!match) return undefined;

  const x = Math.min(100, Math.max(0, Number(match[1])));
  const y = Math.min(100, Math.max(0, Number(match[2])));
  return `${x}% ${y}%`;
}

export default function MembersTabs({ members }: { members: Member[] }) {
  const { membersByMuruk, murukKeys } = useMemo(() => {
    const by: Record<string, Member[]> = {};
    for (const member of members) {
      const key = member.murukGeneration?.trim() || '미분류';
      if (!by[key]) {
        by[key] = [];
      }
      by[key].push(member);
    }

    const keys = Object.keys(by).sort(sortMurukKeys);
    return { membersByMuruk: by, murukKeys: keys };
  }, [members]);

  const [selectedKey, setSelectedKey] = useState<string>(() => murukKeys[0] ?? '미분류');
  const selectedMembers = membersByMuruk[selectedKey] ?? [];

  if (murukKeys.length === 0) {
    return null;
  }

  return (
    <div className="space-y-10">
      {/* 기수 탭 */}
      <div className="flex flex-wrap gap-3 pb-2">
        {murukKeys.map((key) => {
          const isActive = key === selectedKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedKey(key)}
              className={`whitespace-nowrap rounded-btn border px-5 py-2.5 text-base font-semibold transition-all duration-300 ease-out ${
                isActive
                  ? 'translate-y-[-1px] scale-[1.02] border-muruk-green-border bg-muruk-green-sage text-white shadow-md'
                  : 'border-transparent bg-muruk-card-bg text-muruk-green-muted hover:-translate-y-0.5 hover:bg-muruk-green-sage/20 hover:shadow-sm'
              }`}
            >
              {key}
            </button>
          );
        })}
      </div>

      {/* 멤버 카드 그리드 */}
      <div key={selectedKey} className="reveal-up grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {selectedMembers.map((member) => {
          const lineColor = getRoleColor(member.role);
          const avatarPosition = normalizeAvatarPosition(member.avatarPosition);
          return (
            <div
              key={member.id}
              className="content-visibility-auto group overflow-hidden rounded-card bg-white shadow-md transition-all hover:shadow-xl hover:-translate-y-1"
            >
              {/* 프로필 이미지 영역 */}
              <div className="aspect-[312/275] w-full overflow-hidden bg-gray-200">
                {member.avatarUrl ? (
                  <img
                    src={member.avatarUrl}
                    alt={member.name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    style={avatarPosition ? { objectPosition: avatarPosition } : undefined}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muruk-green-lightest/40">
                    <span className="text-5xl text-muruk-green-muted/30">🌿</span>
                  </div>
                )}
              </div>

              {/* 정보 영역 */}
              <div className="p-5 text-center">
                {/* 이름 */}
                <h3 className="text-2xl font-semibold text-gray-900">{member.name}</h3>

                {/* 역할 색상 라인 */}
                <div
                  className="mx-auto mt-2 h-[2px] w-12 rounded-full"
                  style={{ backgroundColor: lineColor }}
                />

                {/* 역할 & 학과 & 상태 메시지 */}
                <div className="mt-3 space-y-0.5 text-sm text-gray-600">
                  {member.role && <p>{member.role}</p>}
                  {(member.schoolGeneration || member.className) && (
                    <p>
                      {member.schoolGeneration ?? ''}
                      {member.schoolGeneration && member.className ? ' ' : ''}
                      {member.className ?? ''}
                    </p>
                  )}
                  {member.statusMessage && (
                    <p className="break-words whitespace-pre-line leading-relaxed text-gray-500">
                      {member.statusMessage}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
