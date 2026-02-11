import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        crimson: ['"Crimson Text"', '"Pretendard"', 'sans-serif'],
        pretendard: ['"Pretendard"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        muruk: {
          cream: '#fffbe2',
          'cream-light': '#fffde3',
          'cream-dark': '#fff9d2',
          'green-lightest': '#e5f0c0',
          'green-light': '#a0c9a2',
          'green-medium': '#9cb67c',
          'green-sage': '#90a470',
          'green-primary': '#688a46',
          'green-dark': '#62783e',
          'green-darker': '#51662f',
          'green-deepest': '#394e25',
          'green-text': '#4a5a35',
          'green-muted': '#7a9a70',
          'green-award': '#4d6f2c',
          'green-border': '#72805c',
          'card-bg': '#fdfaf0',
          'card-light': '#fffff8',
          'nav-inactive': '#a1a1a1',
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
