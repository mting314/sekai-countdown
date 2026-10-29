import { useTranslation } from 'react-i18next';
import { usePageContext } from 'vike-react/usePageContext';
import { Metadata } from '~/components/layout/Metadata';
import { CharacterDossierView } from '~/components/views/CharacterDossierView';
import { useCountdownData } from '~/context/CountdownDataContext';
import { charDisplayName } from '~/utils/countdown/format';

export function Page() {
  const { t, i18n } = useTranslation();
  const { charById } = useCountdownData();
  const id = Number(usePageContext().routeParams.id ?? '0');
  const ch = charById.get(id);

  return (
    <>
      <Metadata
        title={ch ? `${charDisplayName(ch, i18n.language)} · ${t('site_name')}` : t('site_name')}
        helmet
      />
      <CharacterDossierView characterId={id} />
    </>
  );
}
