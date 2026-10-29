import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { css } from 'styled-system/css';
import { Box, Grid, HStack, Stack, Wrap } from 'styled-system/jsx';
import { EmptyFilterState, InlineFilterInput } from '~/components/search/InlineFilterInput';
import {
  DroughtLeaderboardRow,
  DroughtMeter,
  FilterAndSortBar,
  sortClocks,
  type SortMode
} from '~/components/sekai/DroughtVisuals';
import {
  CardThumbTile,
  CharacterIcon,
  SongJacketTile,
  UnitBadge
} from '~/components/sekai/SekaiVisuals';
import { Link } from '~/components/ui/link';
import { Button } from '~/components/ui/styled/button';
import { Text } from '~/components/ui/text';
import { useCountdownData } from '~/context/CountdownDataContext';
import type { DroughtClock, SekaiUnitId } from '~/types/countdown';
import { eventStoryBannerUrl } from '~/utils/countdown/assets';
import { ALL_UNITS } from '~/utils/countdown/constants';
import {
  charDisplayName,
  formatDateShort,
  localizedTitle,
  SEVERITY_PALETTE
} from '~/utils/countdown/format';
import { computeExtrasMetrics } from '~/utils/countdown/metrics';
import { characterHref } from '~/utils/countdown/routes';
import {
  characterSearchHaystack,
  matchesClockQuery,
  matchesTokens,
  normalizeSearchText,
  tokenizeQuery
} from '~/utils/countdown/search';

type ExtrasTab = 'alt_vocal' | 'unit_songs' | 'duos' | 'stamps';

function UnitMusicClockCell({
  label,
  clock,
  musicById,
  locale
}: {
  label: string;
  clock: DroughtClock;
  musicById: ReturnType<typeof useCountdownData>['musicById'];
  locale: string;
}) {
  const { t } = useTranslation();
  const pal = SEVERITY_PALETTE[clock.severity];
  const song = clock.latest?.musicId ? musicById.get(clock.latest.musicId) : undefined;

  return (
    <Box borderColor="border.subtle" rounded="xl" borderWidth="1px" p="3" bg="bg.default">
      <Stack gap="2">
        <HStack justifyContent="space-between">
          <span className={css({ color: 'fg.muted', fontSize: 'xs', fontWeight: 'bold' })}>
            {label}
          </span>
          <span
            className={css({
              fontSize: 'lg',
              fontWeight: 'black',
              fontVariantNumeric: 'tabular-nums'
            })}
            style={{ color: pal.text }}
          >
            {t('common.days', { count: clock.daysSince })}
          </span>
        </HStack>

        <HStack gap="2" alignItems="center">
          <SongJacketTile music={song} size={40} />
          <Stack gap="0" minW="0">
            <span
              className={css({
                fontSize: 'xs',
                fontWeight: 'semibold',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap'
              })}
            >
              {song ? localizedTitle(song.titleJa, song.titleEn, locale) : '—'}
            </span>
            <span className={css({ color: 'fg.muted', fontSize: '2xs' })}>
              {formatDateShort(clock.lastTimestamp, locale)}
            </span>
          </Stack>
        </HStack>

        <DroughtMeter clock={clock} compact />
      </Stack>
    </Box>
  );
}

export function ExtrasDroughtView() {
  const { t, i18n } = useTranslation();
  const { snapshot, now, preferTrained, charById, cardById, eventById, musicById, stampById } =
    useCountdownData();
  const [tab, setTab] = useState<ExtrasTab>('alt_vocal');
  const [unitFilter, setUnitFilter] = useState<SekaiUnitId | 'all'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('days');
  const [selectedDuoCharId, setSelectedDuoCharId] = useState<number>(20);
  const [sameUnitDuosOnly, setSameUnitDuosOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const lookups = useMemo(
    () => ({ charById, cardById, eventById, musicById, stampById }),
    [charById, cardById, eventById, musicById, stampById]
  );

  const extras = useMemo(() => computeExtrasMetrics(snapshot, now), [snapshot, now]);

  const altVocalClocks = useMemo(() => {
    const filtered = extras.altVocals.filter(
      (c) =>
        (unitFilter === 'all' || c.unitId === unitFilter) &&
        matchesClockQuery(searchQuery, c, lookups)
    );
    return sortClocks(filtered, sortMode);
  }, [extras, unitFilter, sortMode, searchQuery, lookups]);

  const stampClocks = useMemo(() => {
    const filtered = extras.stamps.filter(
      (c) =>
        (unitFilter === 'all' || c.unitId === unitFilter) &&
        matchesClockQuery(searchQuery, c, lookups)
    );
    return sortClocks(filtered, sortMode);
  }, [extras, unitFilter, sortMode, searchQuery, lookups]);

  const filteredUnitSongs = useMemo(() => {
    if (!searchQuery.trim()) return extras.unitSongs;
    return extras.unitSongs.filter((u) =>
      [u.commissioned, u.cover, u.mv3d, u.mv2d].some((clock) =>
        matchesClockQuery(searchQuery, clock, lookups)
      )
    );
  }, [extras.unitSongs, searchQuery, lookups]);

  const duoList = useMemo(() => {
    const base = extras.duoPairingsForCharacter(selectedDuoCharId);
    const list = sameUnitDuosOnly ? base.filter((p) => p.sameUnit) : base;
    const tokens = tokenizeQuery(searchQuery);
    if (tokens.length === 0) return list;
    return list.filter((duo) => {
      const partnerId = duo.charA === selectedDuoCharId ? duo.charB : duo.charA;
      const partner = charById.get(partnerId);
      if (!partner) return false;
      const hay = normalizeSearchText(
        [
          characterSearchHaystack(partner),
          duo.sharedCount === 0 ? 'never 未共演' : '',
          duo.latestEvent?.nickname ?? '',
          duo.latestEvent?.nameEn ?? '',
          duo.latestEvent?.nameJa ?? ''
        ].join(' ')
      );
      return matchesTokens(hay, tokens);
    });
  }, [extras, selectedDuoCharId, sameUnitDuosOnly, searchQuery, charById]);

  return (
    <Stack gap="6">
      <Stack gap="1">
        <Text as="h1" fontSize="2xl" fontWeight="extrabold">
          {t('extras.title')}
        </Text>
        <Text color="fg.muted" fontSize="sm">
          {t('extras.subtitle')}
        </Text>
      </Stack>

      <Wrap gap="2">
        {(
          [
            ['alt_vocal', t('extras.tab_alt_vocal')],
            ['unit_songs', t('extras.tab_unit_songs')],
            ['duos', t('extras.tab_duos')],
            ['stamps', t('extras.tab_stamps')]
          ] as [ExtrasTab, string][]
        ).map(([id, label]) => (
          <Button
            key={id}
            size="sm"
            variant={tab === id ? 'solid' : 'outline'}
            onClick={() => setTab(id)}
          >
            {label}
          </Button>
        ))}
      </Wrap>

      {tab === 'alt_vocal' && (
        <Stack gap="4">
          <FilterAndSortBar
            unitFilter={unitFilter}
            onUnitFilterChange={setUnitFilter}
            sortMode={sortMode}
            onSortModeChange={setSortMode}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
          />
          {altVocalClocks.length === 0 ? (
            <EmptyFilterState query={searchQuery} onClear={() => setSearchQuery('')} />
          ) : (
            <Stack gap="2.5">
              {altVocalClocks.map((clock, idx) => {
                const ch = clock.characterId ? charById.get(clock.characterId) : undefined;
                if (!ch) return null;
                const song = clock.latest?.musicId
                  ? musicById.get(clock.latest.musicId)
                  : undefined;
                return (
                  <DroughtLeaderboardRow
                    key={ch.id}
                    rank={idx + 1}
                    character={ch}
                    clock={clock}
                    music={song}
                    preferTrained={preferTrained}
                    extraBadge={
                      clock.latest?.sublabel ? (
                        <span className={css({ color: 'fg.muted', fontSize: '2xs' })}>
                          ({clock.latest.sublabel})
                        </span>
                      ) : undefined
                    }
                  />
                );
              })}
            </Stack>
          )}
        </Stack>
      )}

      {tab === 'unit_songs' && (
        <Stack gap="4">
          <InlineFilterInput value={searchQuery} onChange={setSearchQuery} maxW="300px" />
          {filteredUnitSongs.length === 0 ? (
            <EmptyFilterState query={searchQuery} onClear={() => setSearchQuery('')} />
          ) : (
            filteredUnitSongs.map((u) => (
              <Box
                key={u.unit}
                borderColor="border.default"
                rounded="2xl"
                borderWidth="1px"
                p="4"
                bg="bg.subtle"
              >
                <Stack gap="3">
                  <UnitBadge unit={u.unit} />
                  <Grid gap="3" columns={{ base: 1, sm: 2, lg: 4 }}>
                    <UnitMusicClockCell
                      label="Commissioned Song"
                      clock={u.commissioned}
                      musicById={musicById}
                      locale={i18n.language}
                    />
                    <UnitMusicClockCell
                      label="Cover Song"
                      clock={u.cover}
                      musicById={musicById}
                      locale={i18n.language}
                    />
                    <UnitMusicClockCell
                      label="3DMV"
                      clock={u.mv3d}
                      musicById={musicById}
                      locale={i18n.language}
                    />
                    <UnitMusicClockCell
                      label="2DMV"
                      clock={u.mv2d}
                      musicById={musicById}
                      locale={i18n.language}
                    />
                  </Grid>
                </Stack>
              </Box>
            ))
          )}
        </Stack>
      )}

      {tab === 'duos' && (
        <Stack gap="6">
          {/* Top Overdue Same-Unit Duos */}
          <Stack gap="3">
            <Text as="h2" fontSize="lg" fontWeight="bold">
              {t('extras.duo_same_unit_top')}
            </Text>
            <Grid gap="3" columns={{ base: 1, md: 2, lg: 3 }}>
              {extras.topOverdueSameUnitDuos.slice(0, 9).map((duo) => {
                const ca = charById.get(duo.charA);
                const cb = charById.get(duo.charB);
                if (!ca || !cb) return null;
                const cardA = duo.cardAId ? cardById.get(duo.cardAId) : undefined;
                const cardB = duo.cardBId ? cardById.get(duo.cardBId) : undefined;
                const banner = eventStoryBannerUrl(duo.latestEvent);
                return (
                  <Box
                    key={`${duo.charA}:${duo.charB}`}
                    position="relative"
                    borderColor="border.default"
                    rounded="xl"
                    borderWidth="1px"
                    p="3.5"
                    bg="bg.subtle"
                    overflow="hidden"
                  >
                    {banner && (
                      <img
                        src={banner}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className={css({
                          inset: '0',
                          position: 'absolute',
                          objectFit: 'cover',
                          w: 'full',
                          h: 'full',
                          opacity: 0.16,
                          pointerEvents: 'none'
                        })}
                      />
                    )}
                    <Stack position="relative" gap="2">
                      <HStack justifyContent="space-between">
                        <HStack gap="1.5">
                          <CharacterIcon characterId={ca.id} size={28} />
                          <CharacterIcon characterId={cb.id} size={28} />
                          <span className={css({ fontSize: 'xs', fontWeight: 'bold' })}>
                            {charDisplayName(ca, i18n.language, true)} &amp;{' '}
                            {charDisplayName(cb, i18n.language, true)}
                          </span>
                        </HStack>
                        <span
                          className={css({
                            color: '#f97316',
                            fontSize: 'lg',
                            fontWeight: 'black',
                            fontVariantNumeric: 'tabular-nums'
                          })}
                        >
                          {t('common.days', { count: duo.daysSince })}
                        </span>
                      </HStack>

                      <HStack justifyContent="space-between" alignItems="center">
                        <HStack gap="1.5">
                          {cardA && (
                            <CardThumbTile
                              card={cardA}
                              preferTrained={preferTrained}
                              size={38}
                              showSupply={false}
                            />
                          )}
                          {cardB && (
                            <CardThumbTile
                              card={cardB}
                              preferTrained={preferTrained}
                              size={38}
                              showSupply={false}
                            />
                          )}
                        </HStack>
                        <Stack gap="0" alignItems="flex-end">
                          <span className={css({ color: 'fg.muted', fontSize: '2xs' })}>
                            {duo.sharedCount > 0
                              ? `${formatDateShort(duo.lastTimestamp, i18n.language)} (${duo.sharedCount}×)`
                              : t('common.never')}
                          </span>
                          {duo.latestEvent && (
                            <span
                              className={css({
                                maxW: '160px',
                                fontSize: '2xs',
                                fontWeight: 'semibold',
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap'
                              })}
                            >
                              {localizedTitle(
                                duo.latestEvent.nameJa,
                                duo.latestEvent.nameEn,
                                i18n.language
                              )}
                            </span>
                          )}
                        </Stack>
                      </HStack>
                    </Stack>
                  </Box>
                );
              })}
            </Grid>
          </Stack>

          {/* Character Duo Picker */}
          <Stack gap="3">
            <HStack gap="2" justifyContent="space-between" flexWrap="wrap">
              <Text fontSize="md" fontWeight="bold">
                {t('extras.duo_pick_char')}
              </Text>
              <Wrap gap="2" alignItems="center">
                <InlineFilterInput value={searchQuery} onChange={setSearchQuery} maxW="240px" />
                <Button
                  size="xs"
                  variant={sameUnitDuosOnly ? 'solid' : 'outline'}
                  onClick={() => setSameUnitDuosOnly(!sameUnitDuosOnly)}
                >
                  {sameUnitDuosOnly ? '✓ Same Unit Only' : 'Same Unit Only'}
                </Button>
              </Wrap>
            </HStack>

            <Grid gap="2" columns={{ base: 1, md: 2, xl: 3 }}>
              {ALL_UNITS.map((unit) => {
                const members = snapshot.characters.filter((c) => c.unit === unit);
                return (
                  <HStack
                    key={unit}
                    gap="1.5"
                    alignItems="center"
                    borderColor="border.subtle"
                    rounded="xl"
                    borderWidth="1px"
                    py="1.5"
                    px="2.5"
                    bg="bg.subtle"
                    flexWrap="wrap"
                  >
                    <UnitBadge unit={unit} short size="xs" />
                    {members.map((ch) => (
                      <Button
                        key={ch.id}
                        size="xs"
                        variant={selectedDuoCharId === ch.id ? 'solid' : 'outline'}
                        onClick={() => setSelectedDuoCharId(ch.id)}
                      >
                        <CharacterIcon characterId={ch.id} size={16} />
                        {charDisplayName(ch, i18n.language, true)}
                      </Button>
                    ))}
                  </HStack>
                );
              })}
            </Grid>

            {duoList.length === 0 ? (
              <EmptyFilterState query={searchQuery} onClear={() => setSearchQuery('')} />
            ) : (
              <Grid gap="2.5" columns={{ base: 1, sm: 2, md: 3, lg: 4 }}>
                {duoList.map((duo) => {
                  const partnerId = duo.charA === selectedDuoCharId ? duo.charB : duo.charA;
                  const partner = charById.get(partnerId);
                  if (!partner) return null;
                  return (
                    <Link
                      className={css({
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderColor: 'border.subtle',
                        rounded: 'xl',
                        borderWidth: '1px',
                        p: '3',
                        bg: 'bg.subtle',
                        _hover: { textDecoration: 'none', bg: 'bg.muted/40' }
                      })}
                      style={
                        duo.sharedCount === 0 ? { borderColor: 'rgba(244,63,94,0.5)' } : undefined
                      }
                      key={partnerId}
                      href={characterHref(partnerId)}
                    >
                      <HStack gap="2">
                        <CharacterIcon characterId={partnerId} size={32} />
                        <Stack gap="0">
                          <span className={css({ fontSize: 'xs', fontWeight: 'bold' })}>
                            {charDisplayName(partner, i18n.language, true)}
                          </span>
                          <span className={css({ color: 'fg.muted', fontSize: '2xs' })}>
                            {duo.sharedCount > 0
                              ? `${formatDateShort(duo.lastTimestamp, i18n.language)} · ${duo.sharedCount}×`
                              : t('common.never')}
                          </span>
                        </Stack>
                      </HStack>
                      <span
                        className={css({
                          fontSize: 'md',
                          fontWeight: 'black',
                          fontVariantNumeric: 'tabular-nums'
                        })}
                        style={{ color: duo.sharedCount === 0 ? '#e11d48' : '#f59e0b' }}
                      >
                        {duo.sharedCount === 0
                          ? t('common.never')
                          : t('common.days', { count: duo.daysSince })}
                      </span>
                    </Link>
                  );
                })}
              </Grid>
            )}
          </Stack>
        </Stack>
      )}

      {tab === 'stamps' && (
        <Stack gap="4">
          <FilterAndSortBar
            unitFilter={unitFilter}
            onUnitFilterChange={setUnitFilter}
            sortMode={sortMode}
            onSortModeChange={setSortMode}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
          />
          {stampClocks.length === 0 ? (
            <EmptyFilterState query={searchQuery} onClear={() => setSearchQuery('')} />
          ) : (
            <Stack gap="2.5">
              {stampClocks.map((clock, idx) => {
                const ch = clock.characterId ? charById.get(clock.characterId) : undefined;
                if (!ch) return null;
                const stamp = clock.latest?.stampId
                  ? stampById.get(clock.latest.stampId)
                  : undefined;
                return (
                  <DroughtLeaderboardRow
                    key={ch.id}
                    rank={idx + 1}
                    character={ch}
                    clock={clock}
                    stamp={stamp}
                    preferTrained={preferTrained}
                  />
                );
              })}
            </Stack>
          )}
        </Stack>
      )}
    </Stack>
  );
}
