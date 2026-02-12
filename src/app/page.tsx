'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useAchievements, useProjects } from '@/hooks/useApi';
import { useEffect, useRef } from 'react';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const projectsQuery = useProjects();
  const achievementsQuery = useAchievements();
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const activeIndexRef = useRef(0);
  const lockRef = useRef(false);
  const wheelDeltaAccumRef = useRef(0);
  const wheelResetTimerRef = useRef<number | null>(null);

  const projects = projectsQuery.data ?? [];
  const achievements = achievementsQuery.data ?? [];
  const featuredProject = projects[0] ?? null;
  const featuredAchievement = achievements[0] ?? null;
  const englishFontStyle = { fontFamily: "'Crimson Text', serif" } as const;

  useEffect(() => {
    const sections = sectionRefs.current.filter(Boolean) as HTMLElement[];
    if (sections.length === 0) return;

    const findClosestSection = () => {
      const y = window.scrollY + window.innerHeight * 0.35;
      let closest = 0;
      let minDist = Number.POSITIVE_INFINITY;

      for (let i = 0; i < sections.length; i += 1) {
        const dist = Math.abs(sections[i].offsetTop - y);
        if (dist < minDist) {
          minDist = dist;
          closest = i;
        }
      }
      return closest;
    };

    const handleWheel = (event: WheelEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('a, button, input, textarea, select')) return;
      if (Math.abs(event.deltaY) < 1.5) return;
      if (lockRef.current) {
        event.preventDefault();
        return;
      }

      const deltaUnit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      const normalizedDelta = event.deltaY * deltaUnit;

      if (wheelResetTimerRef.current !== null) {
        window.clearTimeout(wheelResetTimerRef.current);
      }
      if (wheelDeltaAccumRef.current !== 0 && Math.sign(wheelDeltaAccumRef.current) !== Math.sign(normalizedDelta)) {
        wheelDeltaAccumRef.current = 0;
      }
      wheelDeltaAccumRef.current += normalizedDelta;
      wheelResetTimerRef.current = window.setTimeout(() => {
        wheelDeltaAccumRef.current = 0;
      }, 320);

      const WHEEL_TRIGGER_THRESHOLD = 90;
      if (Math.abs(wheelDeltaAccumRef.current) < WHEEL_TRIGGER_THRESHOLD) return;

      const current = findClosestSection();
      const direction = wheelDeltaAccumRef.current > 0 ? 1 : -1;
      const next = Math.min(Math.max(current + direction, 0), sections.length - 1);
      if (next === current) return;

      wheelDeltaAccumRef.current = 0;
      lockRef.current = true;
      activeIndexRef.current = next;
      event.preventDefault();

      sections[next].scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => {
        lockRef.current = false;
      }, 700);
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (!['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Space'].includes(event.key)) return;
      if (lockRef.current) {
        event.preventDefault();
        return;
      }
      const current = findClosestSection();
      let next = current;
      if (event.key === 'ArrowDown' || event.key === 'PageDown' || event.key === 'Space') next = current + 1;
      if (event.key === 'ArrowUp' || event.key === 'PageUp') next = current - 1;
      next = Math.min(Math.max(next, 0), sections.length - 1);
      if (next === current) return;

      lockRef.current = true;
      activeIndexRef.current = next;
      event.preventDefault();
      sections[next].scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => {
        lockRef.current = false;
      }, 700);
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeydown);
      if (wheelResetTimerRef.current !== null) {
        window.clearTimeout(wheelResetTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-home">
      {/* 첫 화면: 로고 + 태그라인 + 무럭무럭 (100vh, 스크롤 전 보이는 영역) */}
      <section
        ref={(el) => {
          sectionRefs.current[0] = el;
        }}
        className="relative flex h-screen flex-col items-center justify-center px-4 text-center"
      >
        <div className="float-slower pointer-events-none absolute left-[8%] top-[20%] h-24 w-24 rounded-full bg-muruk-green-light/30 blur-2xl" />
        <div className="drift-slow pointer-events-none absolute right-[10%] top-[30%] h-28 w-28 rounded-full bg-muruk-green-medium/20 blur-2xl" />

        {/* 로고 */}
        <Image
          src="/logo.png"
          alt="무럭무럭 로고"
          width={697}
          height={697}
          className="float-slow mx-auto h-40 w-40 object-contain sm:h-48 sm:w-48 lg:h-60 lg:w-60"
          priority
        />

        {/* PLANT US / RAISE EARTH */}
        <h2
          className="reveal-up mt-6 text-xl font-semibold tracking-wide text-muruk-green-dark sm:mt-8 sm:text-3xl lg:text-4xl xl:text-5xl"
          style={englishFontStyle}
        >
          PLANT US
        </h2>
        <h2
          className="reveal-up delay-1 mt-1 text-xl font-semibold tracking-wide text-muruk-green-dark sm:text-3xl lg:text-4xl xl:text-5xl"
          style={englishFontStyle}
        >
          RAISE EARTH
        </h2>

        {/* 무럭무럭 */}
        <h1 className="reveal-up delay-2 mt-4 text-5xl font-bold leading-none text-muruk-green-darker sm:mt-6 sm:text-7xl lg:text-8xl xl:text-9xl">
          무럭무럭
        </h1>

        {/* 스크롤 안내 화살표 */}
        <a
          href="#home-intro"
          aria-label="홈 소개 내용으로 이동"
          className="absolute bottom-10 animate-bounce text-muruk-green-primary/50 transition-opacity hover:opacity-80"
        >
          <svg className="mx-auto h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </a>
      </section>

      {/* 스크롤 후 보이는 영역: 소개 + 요약 */}
      <section
        id="home-intro"
        ref={(el) => {
          sectionRefs.current[1] = el;
        }}
        className="flex min-h-screen items-center justify-center px-4 py-24 text-center"
      >
        <p className="reveal-up mx-auto max-w-4xl text-left text-base font-normal leading-8 text-muruk-green-deepest/95 sm:text-lg sm:leading-9 lg:text-[1.32rem] lg:leading-10">
          ‘무럭무럭’은 식물이 자라나는 모습을 뜻하는 말처럼, 작은 변화가 쌓여 결국 분명한 성장을 만들어내듯 경험과 실천을 통해
          가능성을 키워가는 동아리입니다. 한국디지털미디어고등학교의 유일한 스마트팜 동아리로서 우리는 기술과 농업을 연결하며 스마트팜을
          통해 농업의 새로운 가능성을 제시하고자 합니다. 또한 농촌과 관련된 IT 프로젝트를 기획해 농업과 기술이 함께 성장할 수 있는
          방향을 모색합니다. 기획·디자인·개발이 어우러진 협업 속에서 아이디어를 현실로 발전시키고, 이를 사회적 가치로 확장해 더 나은
          미래에 기여하는 것을 목표로 합니다.
        </p>
      </section>

      <section
        ref={(el) => {
          sectionRefs.current[2] = el;
        }}
        className="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-20 sm:px-6"
      >
        <article className="grid w-full items-center gap-8 lg:grid-cols-2 lg:gap-14">
          <div className="group relative overflow-hidden rounded-card bg-muruk-card-bg shadow-md">
            {projectsQuery.isLoading ? (
              <div className="aspect-[16/10] animate-pulse bg-muruk-green-lightest/40" />
            ) : featuredProject?.logoUrl ? (
              <img
                src={featuredProject.logoUrl}
                alt={featuredProject.name}
                className="aspect-[16/10] h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
            ) : (
              <div className="flex aspect-[16/10] items-center justify-center bg-muruk-green-lightest/40 text-5xl text-muruk-green-muted/40">
                🌱
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/5 to-transparent" />
          </div>

          <div className="reveal-up">
            <p className="text-sm font-semibold tracking-wide text-muruk-green-primary">PROJECT</p>
            <h3 className="mt-3 text-3xl font-bold text-muruk-green-darker sm:text-4xl">프로젝트</h3>
            <p className="mt-6 max-w-2xl text-base leading-8 text-muruk-green-text/90 sm:text-lg sm:leading-relaxed">
            무럭무럭은 스마트팜을 기반으로 한 {projects.length}개의 프로젝트를 진행하며 농업이 마주한 여러 사회적 문제에 주목해왔습니다. 
            농촌의 구조적 한계와 도시와의 거리감을 줄이고, 농업의 가치를 일상 속에서 다시 인식할 수 있도록 노력 하였습니다.
            </p>
            <div className="mt-8">
              <Link
                href="/projects"
                className="kakao-shortcut group inline-flex items-center gap-3 px-7 py-3.5 text-sm font-semibold"
              >
                <span className="relative z-[1]">프로젝트 바로가기</span>
                <span className="kakao-shortcut-arrow relative z-[1]">→</span>
              </Link>
            </div>
          </div>
        </article>
      </section>

      <section
        ref={(el) => {
          sectionRefs.current[3] = el;
        }}
        className="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-20 sm:px-6"
      >
        <article className="grid w-full items-center gap-8 lg:grid-cols-2 lg:gap-14">
          <div className="reveal-up order-2 lg:order-1">
            <p className="text-sm font-semibold tracking-wide text-muruk-green-primary">ACHIEVEMENT</p>
            <h3 className="mt-3 text-3xl font-bold text-muruk-green-darker sm:text-4xl">업적</h3>
            <p className="mt-6 max-w-2xl text-base leading-8 text-muruk-green-text/90 sm:text-lg sm:leading-relaxed">
              무럭무럭은 기술과 농업을 연결하는 창업 프로젝트에 꾸준히 도전해왔습니다. 2024년 교내 해커톤 1위를 포함한 다수의 수상
              성과와, 2025년 직업계고 청년 창업아아디어 공모전 대상 및 상위권 입상을 통해 기획력과 실행력을 인정받았습니다. 이러한 성과는 단순한 수상의
              결과가 아니라, 농업의 문제를 기술적 시각으로 재해석하고 그 가치를 사회적으로 확장해온 과정의 증거입니다. 무럭무럭은 매년
              새로운 도전을 통해 농업과 기술이 함께 성장할 수 있는 방향을 모색하며, 아이디어를 실천으로 증명해가고 있습니다.
            </p>
            <div className="mt-8">
              <Link
                href="/achievements"
                className="kakao-shortcut group inline-flex items-center gap-3 px-7 py-3.5 text-sm font-semibold"
              >
                <span className="relative z-[1]">업적 바로가기</span>
                <span className="kakao-shortcut-arrow relative z-[1]">→</span>
              </Link>
            </div>
          </div>

          <div className="group order-1 overflow-hidden rounded-card bg-white shadow-md lg:order-2">
            {achievementsQuery.isLoading ? (
              <div className="aspect-[16/10] animate-pulse bg-muruk-green-lightest/30" />
            ) : featuredAchievement?.thumbnailUrl ? (
              <img
                src={featuredAchievement.thumbnailUrl}
                alt={featuredAchievement.name}
                className="aspect-[16/10] h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
            ) : (
              <div className="flex aspect-[16/10] items-center justify-center bg-muruk-green-lightest/30 text-5xl text-muruk-green-muted/40">
                🏆
              </div>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
