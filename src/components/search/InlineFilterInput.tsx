import { useTranslation } from 'react-i18next';
import { BiSearch, BiX } from 'react-icons/bi';
import { css } from 'styled-system/css';
import { Box, HStack, Stack } from 'styled-system/jsx';
import { Button } from '~/components/ui/styled/button';
import { Text } from '~/components/ui/text';

export function InlineFilterInput({
  value,
  onChange,
  placeholder,
  maxW = '300px'
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  maxW?: string;
}) {
  const { t } = useTranslation();

  return (
    <Box style={{ maxWidth: maxW }} position="relative" w="full">
      <Box
        style={{ transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}
        position="absolute"
        top="50%"
        left="2.5"
        color="fg.muted"
        pointerEvents="none"
      >
        <BiSearch size={15} />
      </Box>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t('search.inline_placeholder')}
        aria-label={placeholder ?? t('search.inline_placeholder')}
        className={css({
          outline: 'none',
          borderColor: 'border.default',
          rounded: 'lg',
          borderWidth: '1px',
          w: 'full',
          h: '8',
          pl: '8',
          pr: '7',
          color: 'fg.default',
          fontSize: 'xs',
          bg: 'bg.subtle',
          _placeholder: { color: 'fg.muted' },
          _focus: { borderColor: 'colorPalette.default' }
        })}
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={t('search.clear')}
          className={css({
            cursor: 'pointer',
            display: 'flex',
            position: 'absolute',
            top: '50%',
            right: '1.5',
            justifyContent: 'center',
            alignItems: 'center',
            rounded: 'full',
            w: '5',
            h: '5',
            color: 'fg.muted',
            _hover: { color: 'fg.default', bg: 'bg.muted' }
          })}
          style={{ transform: 'translateY(-50%)' }}
        >
          <BiX size={15} />
        </button>
      )}
    </Box>
  );
}

export function EmptyFilterState({ query, onClear }: { query: string; onClear: () => void }) {
  const { t } = useTranslation();
  return (
    <Stack
      gap="2.5"
      alignItems="center"
      borderColor="border.subtle"
      rounded="xl"
      borderWidth="1px"
      py="8"
      px="4"
      bg="bg.subtle"
    >
      <Text color="fg.muted" fontSize="sm">
        {t('search.no_results', { query })}
      </Text>
      <HStack>
        <Button size="xs" variant="outline" onClick={onClear}>
          {t('search.clear')}
        </Button>
      </HStack>
    </Stack>
  );
}
