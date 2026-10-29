import { useTranslation } from 'react-i18next';
import { Metadata } from '~/components/layout/Metadata';
import { CardDroughtView } from '~/components/views/CardDroughtView';

export function Page() {
  const { t } = useTranslation();
  return (
    <>
      <Metadata title={`${t('cards.title')} · ${t('site_name')}`} helmet />
      <CardDroughtView />
    </>
  );
}
