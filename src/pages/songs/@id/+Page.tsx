import { useTranslation } from 'react-i18next';
import { usePageContext } from 'vike-react/usePageContext';
import { Metadata } from '~/components/layout/Metadata';
import { SongDossierView } from '~/components/views/SongDossierView';
import { useCountdownData } from '~/context/CountdownDataContext';
import { localizedTitle } from '~/utils/countdown/format';

export function Page() {
  const { t, i18n } = useTranslation();
  const { musicById } = useCountdownData();
  const id = Number(usePageContext().routeParams.id ?? '0');
  const song = musicById.get(id);

  const songTitle = song ? localizedTitle(song.titleJa, song.titleEn, i18n.language) : undefined;
  const title = songTitle
    ? `${songTitle} · ${t('navigation.songs')} · ${t('site_name')}`
    : t('site_name');

  return (
    <>
      <Metadata title={title} helmet />
      <SongDossierView songId={id} />
    </>
  );
}
