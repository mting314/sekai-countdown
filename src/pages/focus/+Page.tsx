import { useTranslation } from 'react-i18next';
import { Metadata } from '~/components/layout/Metadata';
import { FocusRotationView } from '~/components/views/FocusRotationView';

export function Page() {
  const { t } = useTranslation();
  return (
    <>
      <Metadata title={`${t('focus.title')} · ${t('site_name')}`} helmet />
      <FocusRotationView />
    </>
  );
}
