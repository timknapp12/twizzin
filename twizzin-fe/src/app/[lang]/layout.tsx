'use client';

import React, { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';

export default function Layout({
  children,
  params: { lang },
}: {
  children: React.ReactNode;
  params: { lang: string };
}) {
  useEffect(() => {
    i18n.changeLanguage(lang);
  }, [lang]);

  return (
    <I18nextProvider i18n={i18n} defaultNS='common'>
      {children}
    </I18nextProvider>
  );
}
