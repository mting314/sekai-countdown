import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { css } from 'styled-system/css';
import { Box, Grid, HStack, Stack, Wrap } from 'styled-system/jsx';
import {
  DroughtLeaderboardRow,
  FilterAndSortBar,
  sortClocks,
  type SortMode
} from '~/components/sekai/DroughtVisuals';
import { CardCutoutRender, CharacterIcon } from '~/components/sekai/SekaiVisuals';
import { Link } from '~/components/ui/link';
import { Button } from '~/components/ui/styled/button';
import { Text } from '~/components/ui/text';
import { useCountdownData } from '~/context/CountdownDataContext';
import type { SekaiUnitId } from '~/types/countdown';
import { charDisplayName } from '~/utils/countdown/format';
import { computeCardMetrics } from '~/utils/countdown/metrics';
import { characterHref } from '~/utils/countdown/routes';

type CardSubTab = 'lim4' | 'any4' | 'fes' | 'perm4' | 'event3' | 'event2';

export function CardDroughtView() {
  const { t, i18n } = useTranslation();
  const { snapshot, now, preferTrained, charById, cardById, eventById } = useCountdownData();
  const [subTab, setSubTab] = useState<CardSubTab>('lim4');
  const [includeWorldLink, setIncludeWorldLink] = useState(false);
  const [includeCollab, setIncludeCollab] = useState(true);
  const [unitFilter, setUnitFilter] = useState<SekaiUnitId | 'all'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('days');

  const cardMetrics = useMemo(
    () => computeCardMetrics(snapshot, now, { includeWorldLink, includeCollab }),
    [snapshot, now, includeWorldLink, includeCollab]
  );

  const fesByChar = useMemo(
    () => new Map(cardMetrics.fes4Star.map((f) => [f.characterId, f])),
    [cardMetrics]
  );

  const activeClocks = useMemo(() => {
    const raw =
      subTab === 'lim4'
        ? cardMetrics.lim4Star
        : subTab === 'any4'
          ? cardMetrics.any4Star
          : subTab === 'fes'
            ? cardMetrics.fes4Star.map((f) => f.clock)
            : subTab === 'perm4'
              ? cardMetrics.perm4Star
              : subTab === 'event3'
                ? cardMetrics.event3Star
                : cardMetrics.event2Star;

    const filtered = unitFilter === 'all' ? raw : raw.filter((c) => c.unitId === unitFilter);
    return sortClocks(filtered, sortMode);
  }, [subTab, cardMetrics, unitFilter, sortMode]);

  return (
    <Stack gap="6">
      <Stack gap="1">
        <Text as="h1" fontSize="2xl" fontWeight="extrabold">
          {t('cards.title')}
        </Text>
        <Text color="fg.muted" fontSize="sm">
          {t('cards.subtitle')}
        </Text>
      </Stack>

      {/* Sub-category Tabs */}
      <Wrap gap="2">
        {(
          [
            ['lim4', t('cards.tab_lim4')],
            ['any4', t('cards.tab_any4')],
            ['fes', t('cards.tab_fes')],
            ['perm4', t('cards.tab_perm4')],
            ['event3', t('cards.tab_event3')],
            ['event2', t('cards.tab_event2')]
          ] as [CardSubTab, string][]
        ).map(([id, label]) => (
          <Button
            key={id}
            size="sm"
            variant={subTab === id ? 'solid' : 'outline'}
            onClick={() => setSubTab(id)}
          >
            {label}
          </Button>
        ))}
      </Wrap>

      {/* Lim Jail Filter Toggles */}
      {subTab === 'lim4' && (
        <Wrap
          gap="2"
          alignItems="center"
          borderColor="border.subtle"
          rounded="xl"
          borderWidth="1px"
          p="3"
          bg="bg.subtle"
        >
          <Button
            size="xs"
            variant={includeWorldLink ? 'solid' : 'outline'}
            onClick={() => setIncludeWorldLink(!includeWorldLink)}
          >
            {includeWorldLink ? '✓ ' : ''}
            {t('cards.include_wl')}
          </Button>
          <Button
            size="xs"
            variant={includeCollab ? 'solid' : 'outline'}
            onClick={() => setIncludeCollab(!includeCollab)}
          >
            {includeCollab ? '✓ ' : ''}
            {t('cards.include_collab')}
          </Button>
        </Wrap>
      )}

      {/* BloomFes Waiting Room Spotlight */}
      {subTab === 'fes' && cardMetrics.waitingForBloomFesIds.length > 0 && (
        <Stack
          style={{
            borderColor: 'rgba(6, 182, 212, 0.5)',
            background: 'rgba(6, 182, 212, 0.07)'
          }}
          gap="3"
          rounded="2xl"
          borderWidth="1px"
          p="4"
        >
          <Stack gap="0.5">
            <Text style={{ color: '#06b6d4' }} fontSize="md" fontWeight="extrabold">
              🌸 {t('cards.bloomfes_waiting_title')} ({cardMetrics.waitingForBloomFesIds.length})
            </Text>
            <Text color="fg.muted" fontSize="xs">
              {t('cards.bloomfes_waiting_subtitle')}
            </Text>
          </Stack>

          <Grid gap="2.5" columns={{ base: 2, sm: 3, md: 6 }}>
            {cardMetrics.waitingForBloomFesIds.map((cid) => {
              const ch = charById.get(cid);
              const fes = fesByChar.get(cid);
              if (!ch || !fes) return null;
              const hero = snapshot.cards.findLast(
                (c) => c.characterId === cid && c.rarity === 'rarity_4'
              );
              return (
                <Link
                  className={css({
                    display: 'flex',
                    position: 'relative',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderColor: 'border.default',
                    rounded: 'xl',
                    borderWidth: '1px',
                    minH: '130px',
                    p: '3',
                    bg: 'bg.default',
                    overflow: 'hidden',
                    _hover: { transform: 'translateY(-2px)', textDecoration: 'none' }
                  })}
                  key={cid}
                  href={characterHref(cid)}
                >
                  <Box
                    position="absolute"
                    right="-8px"
                    bottom="-8px"
                    opacity={0.85}
                    pointerEvents="none"
                  >
                    <CardCutoutRender card={hero} preferTrained={preferTrained} height={115} />
                  </Box>
                  <HStack position="relative" gap="1.5">
                    <CharacterIcon characterId={cid} size={26} />
                    <span className={css({ fontSize: 'xs', fontWeight: 'bold' })}>
                      {charDisplayName(ch, i18n.language, true)}
                    </span>
                  </HStack>
                  <Stack position="relative" gap="0">
                    <span
                      className={css({
                        fontSize: 'lg',
                        fontWeight: 'black',
                        fontVariantNumeric: 'tabular-nums'
                      })}
                      style={{ color: '#06b6d4' }}
                    >
                      {t('common.days', { count: fes.clock.daysSince })}
                    </span>
                    <span className={css({ color: 'fg.muted', fontSize: '2xs' })}>
                      ColorFes: {fes.colorFesCount} · BloomFes: 0
                    </span>
                  </Stack>
                </Link>
              );
            })}
          </Grid>
        </Stack>
      )}

      <FilterAndSortBar
        unitFilter={unitFilter}
        onUnitFilterChange={setUnitFilter}
        sortMode={sortMode}
        onSortModeChange={setSortMode}
      />

      <Stack gap="2.5">
        {activeClocks.map((clock, idx) => {
          const ch = clock.characterId ? charById.get(clock.characterId) : undefined;
          if (!ch) return null;
          const card = clock.latest?.cardId ? cardById.get(clock.latest.cardId) : undefined;
          const ev = clock.latest?.eventId ? eventById.get(clock.latest.eventId) : undefined;
          const fes = subTab === 'fes' ? fesByChar.get(ch.id) : undefined;

          return (
            <DroughtLeaderboardRow
              key={ch.id}
              rank={idx + 1}
              character={ch}
              clock={clock}
              card={card}
              event={ev}
              preferTrained={preferTrained}
              extraBadge={
                fes ? (
                  <HStack gap="1">
                    <span
                      className={css({
                        rounded: 'sm',
                        py: '0.5',
                        px: '1.5',
                        fontSize: '2xs',
                        fontWeight: 'bold'
                      })}
                      style={{ background: '#8b5cf626', color: '#8b5cf6' }}
                    >
                      ColorFes ×{fes.colorFesCount}
                    </span>
                    <span
                      className={css({
                        rounded: 'sm',
                        py: '0.5',
                        px: '1.5',
                        fontSize: '2xs',
                        fontWeight: 'bold'
                      })}
                      style={{ background: '#06b6d426', color: '#06b6d4' }}
                    >
                      BloomFes ×{fes.bloomFesCount}
                    </span>
                  </HStack>
                ) : undefined
              }
            />
          );
        })}
      </Stack>
    </Stack>
  );
}
