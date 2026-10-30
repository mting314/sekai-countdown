import { useTranslation } from 'react-i18next';
import { Metadata } from '~/components/layout/Metadata';
import { SongsCatalogView } from '~/components/views/SongsCatalogView';

export function Page() {
  const { t } = useTranslation();
  return (
    <>
      <Metadata title={`${t('songs_page.title')} · ${t('site_name')}`} helmet />
      <SongsCatalogView />
    </>
  );
}
