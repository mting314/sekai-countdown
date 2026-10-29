import { useTranslation } from 'react-i18next';
import { Metadata } from '~/components/layout/Metadata';
import { MixedAndAttributesView } from '~/components/views/MixedAndAttributesView';

export function Page() {
  const { t } = useTranslation();
  return (
    <>
      <Metadata title={`${t('mixed.title')} · ${t('site_name')}`} helmet />
      <MixedAndAttributesView />
    </>
  );
}
