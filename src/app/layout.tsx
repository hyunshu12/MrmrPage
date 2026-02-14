import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import AppBootGate from '@/components/AppBootGate.client';
import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import QueryClientProvider from '@/providers/QueryClientProvider';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://mrmr.kr';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: '무럭무럭 | MurukMuruk',
  description: 'PLANT US RAISE EARTH — 무럭무럭 동아리 홍보 페이지',
  alternates: {
    canonical: '/',
  },
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <body className="flex min-h-screen flex-col font-crimson">
        <QueryClientProvider>
          <AppBootGate>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </AppBootGate>
        </QueryClientProvider>
      </body>
    </html>
  );
}
