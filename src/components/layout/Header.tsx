'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const navItems = [
  { href: '/', label: '홈' },
  { href: '/projects', label: '프로젝트' },
  { href: '/achievements', label: '업적' },
  { href: '/members', label: '멤버소개' },
  { href: '/qna', label: 'Q&A' },
];

export default function Header() {
  const pathname = usePathname();
  const isHeroOverlayPage = pathname === '/members' || pathname === '/projects' || pathname === '/achievements';
  const [hasPassedHero, setHasPassedHero] = useState(false);
  const isHeroZone = isHeroOverlayPage && !hasPassedHero;

  useEffect(() => {
    if (!isHeroOverlayPage) {
      setHasPassedHero(false);
      return;
    }

    const updateState = () => {
      const heroBottomOffset = window.innerHeight - 120;
      setHasPassedHero(window.scrollY > heroBottomOffset);
    };

    updateState();
    window.addEventListener('scroll', updateState, { passive: true });
    window.addEventListener('resize', updateState);
    return () => {
      window.removeEventListener('scroll', updateState);
      window.removeEventListener('resize', updateState);
    };
  }, [isHeroOverlayPage]);

  const activeLinkClass = isHeroZone
    ? 'text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)]'
    : 'text-muruk-green-darker';
  const inactiveLinkClass = isHeroZone
    ? 'text-white/85 hover:text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)]'
    : 'text-muruk-green-text/70 hover:text-muruk-green-darker';

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 border-b backdrop-blur-md transition-all ${
        isHeroZone
          ? 'border-white/1 bg-white/1 shadow-[0_8px_22px_rgba(0,0,0,0.14)]'
          : 'border-white/45 bg-white/32 shadow-[0_10px_24px_rgba(0,0,0,0.08)]'
      }`}
    >
      <nav className="mx-auto flex max-w-[1920px] items-center justify-between px-10 py-4 sm:px-16">
        {/* 무럭무럭 로고 */}
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.png"
            alt="무럭무럭 로고"
            width={48}
            height={48}
            className={`h-12 w-12 object-contain ${isHeroZone ? 'drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]' : ''}`}
            priority
          />
        </Link>

        {/* Navigation */}
        <ul className="flex items-center gap-4 sm:gap-8">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`text-base font-semibold transition-colors sm:text-lg ${
                    isActive ? activeLinkClass : inactiveLinkClass
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
