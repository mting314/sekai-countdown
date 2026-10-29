import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { css } from 'styled-system/css';
import { Box, Flex, HStack, Stack, Wrap } from 'styled-system/jsx';
import { EmptyFilterState } from '~/components/search/InlineFilterInput';
import {
  DroughtLeaderboardRow,
  FilterAndSortBar,
  sortClocks,
  type SortMode
} from '~/components/sekai/DroughtVisuals';
import { AttributeIcon, CardThumbTile, CharacterIcon } from '~/components/sekai/SekaiVisuals';
import { Link } from '~/components/ui/link';
import { Button } from '~/components/ui/styled/button';
import { Text } from '~/components/ui/text';
import { useCountdownData } from '~/context/CountdownDataContext';
import type { SekaiUnitId } from '~/types/countdown';
import { ATTRIBUTE_META, CARD_ATTRIBUTES } from '~/utils/countdown/constants';
import { charDisplayName, formatDateShort, SEVERITY_PALETTE } from '~/utils/countdown/format';
import { computeMixedAndAttributeMetrics } from '~/utils/countdown/metrics';
import { characterHref } from '~/utils/countdown/routes';
import { matchesClockQuery } from '~/utils/countdown/search';

type MixedMode = 'banner' | '4star' | 'any';

export function MixedAndAttributesView() {
  const { t, i18n } = useTranslation();
  const { snapshot, now, preferTrained, charById, cardById, eventById, musicById } =
    useCountdownData();
  const [mixedMode, setMixedMode] = useState<MixedMode>('banner');
  const [attrLimOnly, setAttrLimOnly] = useState(false);
  const [unitFilter, setUnitFilter] = useState<SekaiUnitId | 'all'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('days');
  const [searchQuery, setSearchQuery] = useState('');

  const lookups = useMemo(
    () => ({ charById, cardById, eventById, musicById }),
    [charById, cardById, eventById, musicById]
  );

  const data = useMemo(() => computeMixedAndAttributeMetrics(snapshot, now), [snapshot, now]);

  const mixedClocks = useMemo(() => {
    const base =
      mixedMode === 'banner'
        ? data.mixedBanner
        : mixedMode === '4star'
          ? data.mixedLineup4Star
          : data.mixedLineupAny;
    const filtered = base.filter(
      (c) =>
        (unitFilter === 'all' || c.unitId === unitFilter) &&
        matchesClockQuery(searchQuery, c, lookups)
    );
    return sortClocks(filtered, sortMode);
  }, [data, mixedMode, unitFilter, sortMode, searchQuery, lookups]);

  const filteredAttrRows = useMemo(() => {
    return data.attributeMatrix.filter((row) => {
      const ch = charById.get(row[0].characterId);
      if (unitFilter !== 'all' && ch?.unit !== unitFilter) return false;
      if (!searchQuery.trim()) return true;
      return row.some((cell) => {
        const clock = attrLimOnly ? cell.clockLim4Star : cell.clockAll4Star;
        const aMeta = ATTRIBUTE_META[cell.attr];
        return matchesClockQuery(searchQuery, clock, lookups, `${aMeta.labelEn} ${aMeta.labelJa}`);
      });
    });
  }, [data, unitFilter, charById, searchQuery, attrLimOnly, lookups]);

  return (
    <Stack gap="7">
      <Stack gap="1">
        <Text as="h1" fontSize="2xl" fontWeight="extrabold">
          {t('mixed.title')}
        </Text>
        <Text color="fg.muted" fontSize="sm">
          {t('mixed.subtitle')}
        </Text>
      </Stack>

      <FilterAndSortBar
        unitFilter={unitFilter}
        onUnitFilterChange={setUnitFilter}
        sortMode={sortMode}
        onSortModeChange={setSortMode}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />

      {/* 1. 26 x 5 Card Attribute Starvation Heatmap */}
      <Stack gap="3">
        <Flex
          gap="2"
          direction={{ base: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ base: 'flex-start', md: 'center' }}
        >
          <Stack gap="0.5">
            <Text as="h2" fontSize="xl" fontWeight="extrabold">
              {t('mixed.attr_title')}
            </Text>
            <Text color="fg.muted" fontSize="xs">
              {t('mixed.attr_subtitle')}
            </Text>
          </Stack>

          <HStack gap="1.5">
            <Button
              size="xs"
              variant={!attrLimOnly ? 'solid' : 'outline'}
              onClick={() => setAttrLimOnly(false)}
            >
              {t('mixed.attr_all4')}
            </Button>
            <Button
              size="xs"
              variant={attrLimOnly ? 'solid' : 'outline'}
              onClick={() => setAttrLimOnly(true)}
            >
              {t('mixed.attr_lim4')}
            </Button>
          </HStack>
        </Flex>

        {filteredAttrRows.length === 0 ? (
          <EmptyFilterState query={searchQuery} onClear={() => setSearchQuery('')} />
        ) : (
          <Box
            borderColor="border.default"
            rounded="2xl"
            borderWidth="1px"
            p="3"
            bg="bg.subtle"
            overflowX="auto"
          >
            <table
              className={css({
                w: 'full',
                borderCollapse: 'separate',
                borderSpacing: '6px'
              })}
            >
              <thead>
                <tr>
                  <th
                    className={css({
                      minW: '130px',
                      color: 'fg.muted',
                      fontSize: 'xs',
                      textAlign: 'left'
                    })}
                  >
                    Character
                  </th>
                  {CARD_ATTRIBUTES.map((attr) => {
                    const meta = ATTRIBUTE_META[attr];
                    return (
                      <th key={attr} className={css({ minW: '128px', textAlign: 'center' })}>
                        <HStack gap="1.5" justifyContent="center">
                          <AttributeIcon attr={attr} size={16} />
                          <span className={css({ fontSize: 'xs', fontWeight: 'bold' })}>
                            {i18n.language.startsWith('ja') ? meta.labelJa : meta.labelEn}
                          </span>
                        </HStack>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredAttrRows.map((row) => {
                  const cid = row[0].characterId;
                  const ch = charById.get(cid);
                  if (!ch) return null;
                  return (
                    <tr key={cid}>
                      <td className={css({ verticalAlign: 'middle' })}>
                        <Link
                          className={css({
                            display: 'flex',
                            gap: '2',
                            alignItems: 'center',
                            _hover: { textDecoration: 'none', opacity: 0.85 }
                          })}
                          href={characterHref(cid)}
                        >
                          <CharacterIcon characterId={cid} size={30} />
                          <span className={css({ fontSize: 'xs', fontWeight: 'bold' })}>
                            {charDisplayName(ch, i18n.language, true)}
                          </span>
                        </Link>
                      </td>

                      {row.map((cell) => {
                        const clock = attrLimOnly ? cell.clockLim4Star : cell.clockAll4Star;
                        const pal = SEVERITY_PALETTE[clock.severity];
                        const card = clock.latest?.cardId
                          ? cardById.get(clock.latest.cardId)
                          : undefined;

                        return (
                          <td key={cell.attr}>
                            <Box
                              style={{
                                borderColor:
                                  clock.count === 0
                                    ? '#f43f5e'
                                    : clock.severity === 'record' || clock.severity === 'overdue'
                                      ? pal.border
                                      : undefined,
                                background:
                                  clock.count === 0 || clock.severity === 'record'
                                    ? SEVERITY_PALETTE.record.bg
                                    : undefined
                              }}
                              rounded="xl"
                              borderWidth="1px"
                              p="2"
                              bg="bg.default"
                            >
                              <HStack gap="2" alignItems="center">
                                {card ? (
                                  <CardThumbTile
                                    card={card}
                                    preferTrained={preferTrained}
                                    size={40}
                                    showSupply={false}
                                  />
                                ) : (
                                  <Box
                                    display="flex"
                                    flexShrink={0}
                                    justifyContent="center"
                                    alignItems="center"
                                    rounded="lg"
                                    w="40px"
                                    h="40px"
                                    bg="bg.muted"
                                  >
                                    <AttributeIcon attr={cell.attr} size={18} />
                                  </Box>
                                )}

                                <Stack gap="0" minW="0">
                                  <span
                                    className={css({
                                      fontSize: 'sm',
                                      fontWeight: 'black',
                                      fontVariantNumeric: 'tabular-nums',
                                      lineHeight: '1.1'
                                    })}
                                    style={{ color: clock.count === 0 ? '#e11d48' : pal.text }}
                                  >
                                    {t('common.days', { count: clock.daysSince })}
                                  </span>
                                  <span className={css({ color: 'fg.muted', fontSize: '10px' })}>
                                    {clock.count > 0
                                      ? `${formatDateShort(clock.lastTimestamp, i18n.language)} (${clock.count})`
                                      : t('common.never')}
                                  </span>
                                </Stack>
                              </HStack>
                            </Box>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
        )}
      </Stack>

      {/* 2. Mixed Event Drought Leaderboard */}
      <Stack gap="3">
        <Wrap gap="2">
          <Button
            size="sm"
            variant={mixedMode === 'banner' ? 'solid' : 'outline'}
            onClick={() => setMixedMode('banner')}
          >
            {t('mixed.mode_banner')}
          </Button>
          <Button
            size="sm"
            variant={mixedMode === '4star' ? 'solid' : 'outline'}
            onClick={() => setMixedMode('4star')}
          >
            {t('mixed.mode_4star')}
          </Button>
          <Button
            size="sm"
            variant={mixedMode === 'any' ? 'solid' : 'outline'}
            onClick={() => setMixedMode('any')}
          >
            {t('mixed.mode_any')}
          </Button>
        </Wrap>

        {mixedClocks.length === 0 ? (
          <EmptyFilterState query={searchQuery} onClear={() => setSearchQuery('')} />
        ) : (
          <Stack gap="2.5">
            {mixedClocks.map((clock, idx) => {
              const ch = clock.characterId ? charById.get(clock.characterId) : undefined;
              if (!ch) return null;
              const ev = clock.latest?.eventId ? eventById.get(clock.latest.eventId) : undefined;
              const card = clock.latest?.cardId ? cardById.get(clock.latest.cardId) : undefined;
              return (
                <DroughtLeaderboardRow
                  key={ch.id}
                  rank={idx + 1}
                  character={ch}
                  clock={clock}
                  card={card}
                  event={ev}
                  preferTrained={preferTrained}
                />
              );
            })}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
