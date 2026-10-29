import { useTranslation } from 'react-i18next';
import { Metadata } from '~/components/layout/Metadata';
import { VirtualSingerView } from '~/components/views/VirtualSingerView';

export function Page() {
  const { t } = useTranslation();
  return (
    <>
      <Metadata title={`${t('vs.title')} · ${t('site_name')}`} helmet />
      <VirtualSingerView />
    </>
  );
}
