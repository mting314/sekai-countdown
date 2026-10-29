import { useTranslation } from 'react-i18next';
import { usePageContext } from 'vike-react/usePageContext';
import { Metadata } from '~/components/layout/Metadata';
import { resolveUnitId, UnitDossierView } from '~/components/views/UnitDossierView';
import { UNIT_META } from '~/utils/countdown/constants';

export function Page() {
  const { t, i18n } = useTranslation();
  const rawId = String(usePageContext().routeParams.id ?? '');
  const unitId = resolveUnitId(rawId);
  const meta = unitId ? UNIT_META[unitId] : undefined;

  const title = meta
    ? `${i18n.language.startsWith('ja') ? meta.nameJa : meta.nameEn} · ${t('site_name')}`
    : t('site_name');

  return (
    <>
      <Metadata title={title} helmet />
      <UnitDossierView unitId={rawId} />
    </>
  );
}
