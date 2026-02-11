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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-muruk-cream/60 backdrop-blur-md shadow-sm'
          : 'bg-transparent'
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
            className="h-12 w-12 object-contain"
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
                    isActive
                      ? 'text-muruk-green-darker'
                      : 'text-muruk-green-text/50 hover:text-muruk-green-darker'
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
