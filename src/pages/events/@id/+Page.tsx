import { useTranslation } from 'react-i18next';
import { usePageContext } from 'vike-react/usePageContext';
import { Metadata } from '~/components/layout/Metadata';
import { EventDossierView } from '~/components/views/EventDossierView';
import { useCountdownData } from '~/context/CountdownDataContext';
import { localizedTitle } from '~/utils/countdown/format';

export function Page() {
  const { t, i18n } = useTranslation();
  const { eventById } = useCountdownData();
  const id = Number(usePageContext().routeParams.id ?? '0');
  const ev = eventById.get(id);

  const eventTitle = ev ? localizedTitle(ev.nameJa, ev.nameEn, i18n.language) : undefined;

  const title = eventTitle
    ? `${ev?.nickname ? `[${ev.nickname}] ` : ''}${eventTitle} · ${t('site_name')}`
    : t('site_name');

  return (
    <>
      <Metadata title={title} helmet />
      <EventDossierView eventId={id} />
    </>
  );
}
