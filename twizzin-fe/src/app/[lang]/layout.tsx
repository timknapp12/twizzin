import LayoutClient from './LayoutClient';
import { use } from 'react';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    lang: string;
  }>;
};

export default function Layout({ children, params }: LayoutProps) {
  const { lang } = use(params);

  return <LayoutClient lang={lang}>{children}</LayoutClient>;
}
