import type { Metadata } from 'next';
import Script from 'next/script';
import { inter } from './fonts';
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
    <html lang='en'>
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
      </head>
      <body className={inter.className}>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
