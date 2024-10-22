'use client';
import React, { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import WalletContextProvider from '../../contexts/WalletContext';

export default function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = React.use(params);

  useEffect(() => {
    i18n.changeLanguage(lang);
  }, [lang]);

  return (
    <I18nextProvider i18n={i18n} defaultNS='common'>
      <WalletContextProvider>{children}</WalletContextProvider>
    </I18nextProvider>
  );
}
