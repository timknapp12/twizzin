import type { Metadata } from 'next';
import Script from 'next/script';
import { openRunde } from './fonts';
import './globals.css';
import AppProvider from '@/contexts/AppContext';

export const metadata: Metadata = {
  title: 'Twizzin',
  description: 'A game for trivia wizzes',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' className={openRunde.variable}>
      <head>
        <Script
          src='https://www.googletagmanager.com/gtag/js?id=G-1SM9WJYQXX'
          strategy='afterInteractive'
        />
        <Script id='google-analytics' strategy='afterInteractive'>
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-1SM9WJYQXX');
          `}
        </Script>
        <Script id='theme-init' strategy='beforeInteractive'>
          {`
            if (!localStorage.getItem('theme')) {
              localStorage.setItem('theme', 'light');
              document.documentElement.setAttribute('data-theme', 'light');
            }
          `}
        </Script>
      </head>
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
