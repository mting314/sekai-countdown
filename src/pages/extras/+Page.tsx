import { useTranslation } from 'react-i18next';
import { Metadata } from '~/components/layout/Metadata';
import { ExtrasDroughtView } from '~/components/views/ExtrasDroughtView';

export function Page() {
  const { t } = useTranslation();
  return (
    <>
      <Metadata title={`${t('extras.title')} · ${t('site_name')}`} helmet />
      <ExtrasDroughtView />
    </>
  );
}
