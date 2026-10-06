'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const CHIPS = [
  { href: '/projects', label: '#프로젝트' },
  { href: '/achievements', label: '#업적' },
  { href: '/members', label: '#멤버소개' },
] as const;

/** 알약 버튼에서 돌아가며 보이는 문구. */
const PROMPTS = ['무럭무럭이 궁금하다면?', 'PLANT US, RAISE EARTH', '스마트팜으로 농업의 내일을 키웁니다'] as const;
const PROMPT_MS = 3200;

const CHIP =
  'inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 font-pretendard text-[13px] font-bold tracking-tight transition hover:-translate-y-px';

/**
 * 히어로 아래쪽의 칩 줄과 알약 버튼. 바로가기 역할을 한다.
 * 첫 칩만 강조색이고, 알약은 FAQ 로 이어진다.
 */
export default function HeroDock() {
  const [prompt, setPrompt] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setPrompt((index) => (index + 1) % PROMPTS.length), PROMPT_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-x-0 bottom-6 z-10 flex flex-col items-center gap-3 px-4 sm:bottom-10">
      <ul className="flex flex-wrap justify-center gap-2">
        <li>
          <a href="#home-intro" className={`${CHIP} bg-muruk-sun text-muruk-green-deepest hover:bg-muruk-sun`}>
            <span aria-hidden="true">🌱</span> 무럭무럭 소개
          </a>
        </li>
        {CHIPS.map((chip) => (
          <li key={chip.href}>
            <Link
              href={chip.href}
              className={`${CHIP} bg-muruk-green-deepest text-muruk-cream hover:bg-muruk-green-darker`}>
              {chip.label}
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href="/faq"
        aria-label="자주 묻는 질문 보기"
        className="group flex w-[min(520px,92vw)] items-center gap-3 rounded-full bg-muruk-green-deepest/90 px-5 py-3.5 font-pretendard text-sm font-semibold text-muruk-cream shadow-lg backdrop-blur-md transition-colors hover:bg-muruk-green-deepest">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="7" strokeWidth={2} />
          <path d="M20 20l-3.5-3.5" strokeWidth={2} strokeLinecap="round" />
        </svg>
        <span className="relative h-5 flex-1 overflow-hidden text-left">
          {PROMPTS.map((text, index) => (
            <span
              key={text}
              className={`absolute inset-0 truncate transition-all duration-500 ease-out ${
                index === prompt
                  ? 'translate-y-0 opacity-100'
                  : index < prompt
                    ? '-translate-y-full opacity-0'
                    : 'translate-y-full opacity-0'
              }`}>
              {text}
            </span>
          ))}
        </span>
        <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5">
          →
        </span>
      </Link>
    </div>
  );
}
