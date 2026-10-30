import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/components/**/*.{js,ts,jsx,tsx,mdx}', './src/app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        // --font-crimson 은 layout.tsx 의 next/font 가 <html> 에 단다.
        crimson: ['var(--font-crimson)', '"Pretendard"', 'sans-serif'],
      },
      colors: {
        muruk: {
          cream: '#fffbe2',
          'green-lightest': '#e5f0c0',
          'green-light': '#a0c9a2',
          'green-medium': '#9cb67c',
          'green-sage': '#90a470',
          'green-primary': '#688a46',
          'green-darker': '#51662f',
          'green-deepest': '#394e25',
          // 인트로 배경. 하프톤 셰이더(intro/halftone-renderer.ts)의 BG 와 같은 값이다.
          'green-night': '#1c2a17',
          'green-text': '#4a5a35',
          'green-muted': '#7a9a70',
          'green-award': '#4d6f2c',
          'green-border': '#72805c',
          'card-bg': '#fdfaf0',
        },
      },
      borderRadius: {
        card: '2rem',
        btn: '1.875rem',
      },
    },
  },
  plugins: [],
};

export default config;
