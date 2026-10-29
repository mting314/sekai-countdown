import { useTranslation } from 'react-i18next';
import { Stack, Wrap } from 'styled-system/jsx';
import { Link } from '../ui/link';
import { Text } from '../ui/text';
import { Version } from '../utils/Version';

export function Footer() {
  const { t } = useTranslation();
  return (
    <Stack gap="1" justifyContent="center" w="full" p="4" textAlign="center" bgColor="bg.muted">
      <Wrap gap="1" justifyContent="center" w="full" fontSize="sm">
        <Text>{t('footer.fan_made')}</Text>
      </Wrap>
      <Wrap gap="1.5" justifyContent="center" alignItems="center" w="full" fontSize="xs">
        <Link href="https://github.com/mting314/sekai-countdown" target="_blank">
          GitHub
        </Link>
        <Text color="fg.muted">·</Text>
        <Text color="fg.muted">
          {t('footer.data_from')}{' '}
          <Link href="https://sekai.best" target="_blank">
            Sekai Viewer
          </Link>{' '}
          &amp;{' '}
          <Link href="https://github.com/Sekai-World" target="_blank">
            Sekai-World
          </Link>
        </Text>
        <Text color="fg.muted">·</Text>
        <Text color="fg.muted">
          {t('footer.inspired_by')}{' '}
          <Link href="https://x.com/countdown_prsk" target="_blank">
            @countdown_prsk
          </Link>
        </Text>
        <Text color="fg.muted">·</Text>
        <Version />
      </Wrap>
    </Stack>
  );
}
