import { Fragment } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { VERSION } from '../../version';

export function Metadata(props: { title?: string; helmet?: boolean }) {
  const { t } = useTranslation();
  const siteName = t('site_name', { defaultValue: 'Sekai Countdown' });
  const title =
    props.title ??
    t('title', { defaultValue: 'Project Sekai Countdown — Focus, Lim & Rotation Tracker' });
  const description = t('description', {
    defaultValue:
      'Live "days since" drought clocks, focus event rotation matrices, limited 4★ trackers, and Virtual Singer sub-unit breakdowns for Project SEKAI.'
  });
  const url = 'https://mting314.github.io/sekai-countdown/';
  const Wrapper = props.helmet ? Helmet : Fragment;

  return (
    <Wrapper>
      <meta data-rh="true" name="viewport" content="width=device-width, initial-scale=1.0" />

      <title>{title}</title>
      <meta data-rh="true" property="og:title" content={title} />
      <meta data-rh="true" name="twitter:title" content={title} />

      <meta data-rh="true" property="og:site_name" content={siteName} />

      <link data-rh="true" rel="canonical" href={url} />
      <meta data-rh="true" property="og:url" content={url} />

      <meta data-rh="true" property="og:description" content={description} />
      <meta data-rh="true" name="description" content={description} />
      <meta data-rh="true" name="twitter:description" content={description} />

      <meta data-rh="true" name="version" content={VERSION} />
    </Wrapper>
  );
}
