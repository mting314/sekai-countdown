import React, { useEffect } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import ErrorBoundary from '~/components/utils/ErrorBoundary';
import { ColorModeProvider } from '~/context/ColorModeContext';
import { CountdownDataProvider } from '~/context/CountdownDataContext';
import { ToasterProvider } from '~/context/ToasterContext';
import i18n from '../i18n';

import '../index.css';

export function Wrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    try {
      const saved = localStorage.getItem('i18nextLng');
      const preferred = saved ?? navigator.language;
      const target = preferred?.toLowerCase().startsWith('ja') ? 'ja' : 'en';
      if (i18n.language !== target) {
        void i18n.changeLanguage(target);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  return (
    <HelmetProvider>
      <ErrorBoundary>
        <ColorModeProvider>
          <ToasterProvider>
            <CountdownDataProvider>{children}</CountdownDataProvider>
          </ToasterProvider>
        </ColorModeProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
}
