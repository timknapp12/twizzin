import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    screens: {
      sm: '480px',
      md: '768px',
      lg: '976px',
      xl: '1440px',
    },
    colors: {
      // Theme-aware colors (these will change with theme)
      primary: 'var(--color-primary)',
      secondary: 'var(--color-secondary)',
      background: 'var(--color-background)',
      primaryText: 'var(--color-primaryText)',
      secondaryText: 'var(--color-secondaryText)',
      disabledText: 'var(--color-disabledText)',
      surface: 'var(--color-surface)',
      languageIcon: 'var(--color-languageIcon)',
      languageIconHover: 'var(--color-languageIconHover)',
      tertiary: 'var(--color-tertiary)',
      error: 'var(--color-error)',
      success: 'var(--color-success)',
      // Static colors (these won't change with theme)
      lightPurple: '#8A65F9', // background for primary button on hover
      darkPurple: '#5C2FE5', // border for primary
      mediumPurple: '#744AEF', // border for primary button on hover
      black: '#1A1A1A',
      lightBlack: '#2A2A2A',
      white: '#FFFFFF',
      offWhite: '#F5F5F5',
      gray: 'rgba(189,186,186, 0.75)',
      disabled: 'rgba(189,186,186, 0.5)',
      pink: '#EF1BA3',
      red: '#FF3366',
      blue: '#4169E1',
      green: '#00CE2D',
      yellow: '#FFD700',
      orange: '#FFA500',
    },
    fontFamily: {
      sans: ['Graphik', 'sans-serif'],
      serif: ['Merriweather', 'serif'],
    },
    borderRadius: {
      none: '0',
      sm: '.125rem',
      DEFAULT: '.25rem',
      md: '.375rem',
      lg: '.5rem',
      xl: '1rem',
      '2xl': '1.5rem',
      '3xl': '2rem',
      full: '9999px',
    },
    spacing: {
      px: '1px',
      0: '0',
      0.5: '0.125rem',
      1: '0.25rem',
      1.5: '0.375rem',
      2: '0.5rem',
      4: '1rem',
      6: '1.5rem',
      7: '1.75rem',
      8: '2rem',
      9: '2.25rem',
      10: '2.5rem',
      12: '3rem',
      14: '3.5rem',
      16: '4rem',
      20: '5rem',
      24: '6rem',
      28: '7rem',
      32: '8rem',
      36: '9rem',
      40: '10rem',
      44: '11rem',
      48: '12rem',
      52: '13rem',
      56: '14rem',
      60: '15rem',
      64: '16rem',
      72: '18rem',
      80: '20rem',
      96: '24rem',
    },
    extend: {
      themes: {
        light: {
          primary: '#7041FF', // primaryPurple
          secondary: '#AA76FF', // lightPurple
          background: '#FFFFFF',
          primaryText: '#21201C',
          secondaryText: '#8D8D86',
          disabledText: '#BFBFBA',
          surface: '#F5F5F5',
          languageIcon: '#F5F5F5',
          languageIconHover: '#E5E5E5',
          tertiary: '#ECC51E', // mustard
          error: '#FF3366', // red
          success: '#00CE2D', // green
        },
        dark: {
          primary: '#7041FF', // primaryPurple
          secondary: '#680CFF', // darkPurple
          background: '#1A1A1A',
          primaryText: '#FFFFFF',
          secondaryText: '#8A8A8A',
          disabledText: '#666666',
          surface: '#2A2A2A',
          languageIcon: '#2A2A2A',
          languageIconHover: '#3A3A3A',
          tertiary: '#ECC51E', // mustard
          error: '#FF3366', // red
          success: '#00CE2D', // green
        },
      },
      maxWidth: {
        med: '520px',
        small: '370px',
      },
    },
  },
  plugins: [],
};
export default config;
