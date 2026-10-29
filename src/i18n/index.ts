import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import ja from './locales/ja.json';

export const resources = {
  en: { translation: en },
  ja: { translation: ja }
};

// Always initialize with 'en' so SSR/prerendered HTML and initial client hydration match 100%.
// Client locale preference (localStorage / navigator.language) is applied post-hydration in +Wrapper.tsx.
void i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  debug: false,
  resources,
  interpolation: {
    escapeValue: false
  }
});

if (typeof window !== 'undefined') {
  i18n.on('languageChanged', (lng) => {
    try {
      localStorage.setItem('i18nextLng', lng);
    } catch {
      // ignore storage errors
    }
  });
}

export type Locale = 'en' | 'ja' | string;

export default i18n;
