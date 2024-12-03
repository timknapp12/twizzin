import localFont from 'next/font/local';

export const openRunde = localFont({
  src: [
    {
      path: '../assets/fonts/OpenRunde-Medium.otf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../assets/fonts/OpenRunde-Bold.otf',
      weight: '700',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-open-runde', // Optional: useful for CSS variable usage
});
