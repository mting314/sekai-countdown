import { useTranslation } from 'react-i18next';
import { usePageContext } from 'vike-react/usePageContext';
import { Metadata } from '~/components/layout/Metadata';
import { CardDossierView } from '~/components/views/CardDossierView';
import { useCountdownData } from '~/context/CountdownDataContext';
import { charDisplayName, localizedTitle } from '~/utils/countdown/format';

export function Page() {
  const { t, i18n } = useTranslation();
  const { cardById, charById } = useCountdownData();
  const id = Number(usePageContext().routeParams.id ?? '0');
  const card = cardById.get(id);
  const ch = card ? charById.get(card.characterId) : undefined;

  const cardTitle = card ? localizedTitle(card.prefixJa, card.prefixEn, i18n.language) : undefined;
  const charName = ch ? charDisplayName(ch, i18n.language) : undefined;

  const title =
    cardTitle && charName ? `${cardTitle} · ${charName} · ${t('site_name')}` : t('site_name');

  return (
    <>
      <Metadata title={title} helmet />
      <CardDossierView cardId={id} />
    </>
  );
}
