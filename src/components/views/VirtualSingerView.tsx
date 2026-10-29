import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { css } from 'styled-system/css';
import { Box, Flex, HStack, Stack, Wrap } from 'styled-system/jsx';
import { EmptyFilterState, InlineFilterInput } from '~/components/search/InlineFilterInput';
import {
  DroughtLeaderboardRow,
  sortClocks,
  type SortMode
} from '~/components/sekai/DroughtVisuals';
import { CardThumbTile, CharacterIcon, UnitBadge } from '~/components/sekai/SekaiVisuals';
import { Link } from '~/components/ui/link';
import { Button } from '~/components/ui/styled/button';
import { Text } from '~/components/ui/text';
import { useCountdownData } from '~/context/CountdownDataContext';
import { MAIN_UNITS } from '~/utils/countdown/constants';
import { charDisplayName, formatDateShort, SEVERITY_PALETTE } from '~/utils/countdown/format';
import { computeVirtualSingerMetrics } from '~/utils/countdown/metrics';
import { characterHref } from '~/utils/countdown/routes';
import { matchesClockQuery } from '~/utils/countdown/search';

type VsFocusMode = '4star' | 'any_card' | 'song';

export function VirtualSingerView() {
  const { t, i18n } = useTranslation();
  const { snapshot, now, preferTrained, charById, cardById, eventById, musicById } =
    useCountdownData();
  const [slotMode, setSlotMode] = useState<VsFocusMode>('4star');
  const [matrixOnly4Star, setMatrixOnly4Star] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>('days');
  const [searchQuery, setSearchQuery] = useState('');

  const lookups = useMemo(
    () => ({ charById, cardById, eventById, musicById }),
    [charById, cardById, eventById, musicById]
  );

  const vs = useMemo(() => computeVirtualSingerMetrics(snapshot, now), [snapshot, now]);

  const slotClocks = useMemo(() => {
    const raw =
      slotMode === '4star'
        ? vs.unitFocusVs4Star
        : slotMode === 'any_card'
          ? vs.unitFocusVsAnyCard
          : vs.unitFocusVsSong;
    const filtered = raw.filter((c) => matchesClockQuery(searchQuery, c, lookups));
    return sortClocks(filtered, sortMode);
  }, [vs, slotMode, sortMode, searchQuery, lookups]);

  const filteredMatrixRows = useMemo(() => {
    if (!searchQuery.trim()) return vs.subUnitMatrix;
    return vs.subUnitMatrix.filter((row) =>
      row.some((cell) =>
        matchesClockQuery(
          searchQuery,
          matrixOnly4Star ? cell.clock4Star : cell.clockAnyCard,
          lookups
        )
      )
    );
  }, [vs.subUnitMatrix, searchQuery, matrixOnly4Star, lookups]);

  const bannerClocks = useMemo(() => {
    const filtered = vs.vsBannerFocus.filter((c) => matchesClockQuery(searchQuery, c, lookups));
    return sortClocks(filtered, 'days');
  }, [vs, searchQuery, lookups]);

  return (
    <Stack gap="7">
      <Stack gap="1">
        <Text as="h1" fontSize="2xl" fontWeight="extrabold">
          {t('vs.title')}
        </Text>
        <Text color="fg.muted" fontSize="sm">
          {t('vs.subtitle')}
        </Text>
      </Stack>

      {/* 1. Unit-Focus Virtual Singer Slot Leaderboard */}
      <Stack gap="3">
        <Flex
          gap="2"
          direction={{ base: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ base: 'flex-start', md: 'center' }}
        >
          <Wrap gap="1.5">
            <Button
              size="sm"
              variant={slotMode === '4star' ? 'solid' : 'outline'}
              onClick={() => setSlotMode('4star')}
            >
              {t('vs.slot_4star')}
            </Button>
            <Button
              size="sm"
              variant={slotMode === 'any_card' ? 'solid' : 'outline'}
              onClick={() => setSlotMode('any_card')}
            >
              {t('vs.slot_any_card')}
            </Button>
            <Button
              size="sm"
              variant={slotMode === 'song' ? 'solid' : 'outline'}
              onClick={() => setSlotMode('song')}
            >
              {t('vs.slot_song')}
            </Button>
          </Wrap>

          <Wrap gap="2" alignItems="center">
            <InlineFilterInput value={searchQuery} onChange={setSearchQuery} maxW="250px" />
            <HStack gap="1">
              {(['days', 'overdue', 'character'] as SortMode[]).map((m) => (
                <Button
                  key={m}
                  size="xs"
                  variant={sortMode === m ? 'solid' : 'subtle'}
                  onClick={() => setSortMode(m)}
                >
                  {t(`common.sort_${m}`)}
                </Button>
              ))}
            </HStack>
          </Wrap>
        </Flex>

        {slotClocks.length === 0 ? (
          <EmptyFilterState query={searchQuery} onClear={() => setSearchQuery('')} />
        ) : (
          <Stack gap="2.5">
            {slotClocks.map((clock, idx) => {
              const ch = clock.characterId ? charById.get(clock.characterId) : undefined;
              if (!ch) return null;
              const ev = clock.latest?.eventId ? eventById.get(clock.latest.eventId) : undefined;
              const card = clock.latest?.cardId ? cardById.get(clock.latest.cardId) : undefined;
              const song = clock.latest?.musicId ? musicById.get(clock.latest.musicId) : undefined;
              return (
                <DroughtLeaderboardRow
                  key={ch.id}
                  rank={idx + 1}
                  character={ch}
                  clock={clock}
                  card={card}
                  event={ev}
                  music={song}
                  preferTrained={preferTrained}
                  extraBadge={ev ? <UnitBadge unit={ev.unit} short size="xs" /> : undefined}
                />
              );
            })}
          </Stack>
        )}
      </Stack>

      {/* 2. 6 x 5 SEKAI Sub-Unit Matrix */}
      <Stack gap="3">
        <Flex
          gap="2"
          direction={{ base: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ base: 'flex-start', md: 'center' }}
        >
          <Stack gap="0.5">
            <Text as="h2" fontSize="xl" fontWeight="extrabold">
              {t('vs.matrix_title')}
            </Text>
            <Text color="fg.muted" fontSize="xs">
              {t('vs.matrix_subtitle')}
            </Text>
          </Stack>

          <HStack gap="1.5">
            <Button
              size="xs"
              variant={matrixOnly4Star ? 'solid' : 'outline'}
              onClick={() => setMatrixOnly4Star(true)}
            >
              {t('vs.matrix_4star')}
            </Button>
            <Button
              size="xs"
              variant={!matrixOnly4Star ? 'solid' : 'outline'}
              onClick={() => setMatrixOnly4Star(false)}
            >
              {t('vs.matrix_any')}
            </Button>
          </HStack>
        </Flex>

        {filteredMatrixRows.length === 0 ? (
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
                      minW: '125px',
                      color: 'fg.muted',
                      fontSize: 'xs',
                      textAlign: 'left'
                    })}
                  >
                    Virtual Singer
                  </th>
                  {MAIN_UNITS.map((unit) => (
                    <th key={unit} className={css({ minW: '132px', textAlign: 'center' })}>
                      <UnitBadge unit={unit} short />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredMatrixRows.map((row) => {
                  const vsId = row[0].vsCharacterId;
                  const vsChar = charById.get(vsId);
                  if (!vsChar) return null;
                  return (
                    <tr key={vsId}>
                      <td className={css({ verticalAlign: 'middle' })}>
                        <Link
                          className={css({
                            display: 'flex',
                            gap: '2',
                            alignItems: 'center',
                            _hover: { textDecoration: 'none', opacity: 0.85 }
                          })}
                          href={characterHref(vsId)}
                        >
                          <CharacterIcon characterId={vsId} size={34} />
                          <span className={css({ fontSize: 'xs', fontWeight: 'bold' })}>
                            {charDisplayName(vsChar, i18n.language, true)}
                          </span>
                        </Link>
                      </td>

                      {row.map((cell) => {
                        const clock = matrixOnly4Star ? cell.clock4Star : cell.clockAnyCard;
                        const pal = SEVERITY_PALETTE[clock.severity];
                        const latestCard = clock.latest?.cardId
                          ? cardById.get(clock.latest.cardId)
                          : undefined;

                        return (
                          <td key={cell.supportUnit}>
                            <Box
                              style={{
                                borderColor:
                                  clock.severity === 'record' || clock.severity === 'overdue'
                                    ? pal.border
                                    : undefined,
                                background: clock.severity === 'record' ? pal.bg : undefined
                              }}
                              rounded="xl"
                              borderWidth="1px"
                              p="2.5"
                              bg="bg.default"
                            >
                              <HStack gap="2" alignItems="center">
                                {latestCard ? (
                                  <CardThumbTile
                                    card={latestCard}
                                    preferTrained={preferTrained}
                                    size={44}
                                    showSupply={false}
                                  />
                                ) : (
                                  <CharacterIcon
                                    characterId={vsId}
                                    subUnit={cell.supportUnit}
                                    size={38}
                                  />
                                )}

                                <Stack gap="0" minW="0">
                                  <span
                                    className={css({
                                      fontSize: 'md',
                                      fontWeight: 'black',
                                      fontVariantNumeric: 'tabular-nums',
                                      lineHeight: '1.1'
                                    })}
                                    style={{ color: pal.text }}
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

      {/* 3. Dedicated Virtual Singer Banner Events */}
      <Stack gap="3">
        <Text as="h2" fontSize="xl" fontWeight="extrabold">
          {t('vs.vs_banner_title')}
        </Text>
        {bannerClocks.length === 0 ? (
          <EmptyFilterState query={searchQuery} onClear={() => setSearchQuery('')} />
        ) : (
          <Stack gap="2.5">
            {bannerClocks.map((clock, idx) => {
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
