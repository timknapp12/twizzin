import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import enTranslations from '../public/locales/en/common.json';
import esTranslations from '../public/locales/es/common.json';
import deTranslations from '../public/locales/de/common.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { common: enTranslations },
    es: { common: esTranslations },
    de: { common: deTranslations },
  },
  lng: 'en', // default language
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // react already safes from xss
  },
});

export default i18n;
