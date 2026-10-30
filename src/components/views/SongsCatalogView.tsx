import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BiChevronDown, BiSearch } from 'react-icons/bi';
import { css } from 'styled-system/css';
import { Box, Flex, Grid, HStack, Stack, Wrap } from 'styled-system/jsx';
import { CharacterIcon, SongJacketTile, UnitBadge } from '~/components/sekai/SekaiVisuals';
import { Link } from '~/components/ui/link';
import { Button } from '~/components/ui/styled/button';
import { Input } from '~/components/ui/styled/input';
import { Text } from '~/components/ui/text';
import { useCountdownData } from '~/context/CountdownDataContext';
import type { SekaiUnitId } from '~/types/countdown';
import { ALL_UNITS, UNIT_META } from '~/utils/countdown/constants';
import { formatDateShort, localizedTitle } from '~/utils/countdown/format';
import { eventHref, songHref } from '~/utils/countdown/routes';
import { normalizeSearchText, tokenizeQuery } from '~/utils/countdown/search';

type SongCategoryFilter = 'all' | 'commissioned' | 'cover' | 'other';
type SongSortMode = 'newest' | 'oldest' | 'title' | 'alt_vocals';

const PAGE_SIZE = 48;

export function SongsCatalogView() {
  const { t, i18n } = useTranslation();
  const { snapshot, charById, anotherVocalsByMusicId, eventBySongId } = useCountdownData();

  const [query, setQuery] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<SekaiUnitId | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<SongCategoryFilter>('all');
  const [sortMode, setSortMode] = useState<SongSortMode>('newest');
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);

  const filteredSongs = useMemo(() => {
    const tokens = tokenizeQuery(query);

    return snapshot.musics
      .filter((m) => {
        // Unit filter
        if (selectedUnit !== 'all') {
          if (!m.units.includes(selectedUnit)) {
            return false;
          }
        }

        // Category filter
        if (categoryFilter === 'commissioned' && !m.commissioned) return false;
        if (categoryFilter === 'cover') {
          if (m.commissioned) return false;
          if (m.units.length === 1 && m.units[0] === 'virtual_singer') return false;
        }
        if (categoryFilter === 'other') {
          if (m.commissioned) return false;
        }

        // Search tokens
        if (tokens.length > 0) {
          const vocalNames = m.sekaiVocalCharacterIds
            .map((id) => {
              const ch = charById.get(id);
              return ch ? `${ch.nameJa} ${ch.nameEn} ${ch.abbrev}` : '';
            })
            .join(' ');

          const haystack = normalizeSearchText(
            `${m.titleJa} ${m.titleEn ?? ''} ${m.assetbundleName} ${vocalNames}`
          );

          const matchesAll = tokens.every((token) => haystack.includes(token));
          if (!matchesAll) return false;
        }

        return true;
      })
      .toSorted((a, b) => {
        if (sortMode === 'newest') return b.publishedAt - a.publishedAt;
        if (sortMode === 'oldest') return a.publishedAt - b.publishedAt;
        if (sortMode === 'alt_vocals') {
          const aCount = anotherVocalsByMusicId.get(a.id)?.length ?? 0;
          const bCount = anotherVocalsByMusicId.get(b.id)?.length ?? 0;
          if (bCount !== aCount) return bCount - aCount;
          return b.publishedAt - a.publishedAt;
        }
        if (sortMode === 'title') {
          const aTitle = a.titleEn || a.titleJa;
          const bTitle = b.titleEn || b.titleJa;
          return aTitle.localeCompare(bTitle);
        }
        return 0;
      });
  }, [
    snapshot.musics,
    query,
    selectedUnit,
    categoryFilter,
    sortMode,
    charById,
    anotherVocalsByMusicId
  ]);

  const displayedSongs = useMemo(() => {
    return filteredSongs.slice(0, visibleLimit);
  }, [filteredSongs, visibleLimit]);

  return (
    <Stack gap="6" py="4">
      {/* Title & Description Header */}
      <Stack gap="2">
        <HStack gap="2" justifyContent="space-between" alignItems="baseline" flexWrap="wrap">
          <Text as="h1" fontSize={{ base: '2xl', md: '3xl' }} fontWeight="black">
            {t('songs_page.title')}
          </Text>
          <span
            className={css({
              borderColor: 'border.default',
              rounded: 'full',
              borderWidth: '1px',
              py: '1',
              px: '3',
              color: 'fg.muted',
              fontSize: 'xs',
              fontWeight: 'bold',
              bg: 'bg.subtle'
            })}
          >
            {t('songs_page.count_total', { count: filteredSongs.length })}
          </span>
        </HStack>
        <Text maxW="3xl" color="fg.muted" fontSize="sm">
          {t('songs_page.subtitle')}
        </Text>
      </Stack>

      {/* Search & Filter Controls */}
      <Stack
        gap="3"
        borderColor="border.subtle"
        rounded="2xl"
        borderWidth="1px"
        p="4"
        bg="bg.subtle/60"
      >
        <Flex gap="3" alignItems="center" flexWrap="wrap">
          {/* Search Box */}
          <Box position="relative" flex="1" minW="260px">
            <Box
              position="absolute"
              top="50%"
              left="3"
              transform="translateY(-50%)"
              color="fg.muted"
              pointerEvents="none"
            >
              <BiSearch size={18} />
            </Box>
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVisibleLimit(PAGE_SIZE);
              }}
              placeholder={t('songs_page.search_placeholder')}
              size="sm"
              rounded="xl"
              pl="9"
            />
          </Box>

          {/* Sort Selector */}
          <HStack gap="1.5">
            <Button
              size="xs"
              variant={sortMode === 'newest' ? 'solid' : 'outline'}
              onClick={() => setSortMode('newest')}
            >
              Newest
            </Button>
            <Button
              size="xs"
              variant={sortMode === 'alt_vocals' ? 'solid' : 'outline'}
              onClick={() => setSortMode('alt_vocals')}
            >
              Alt Vocals
            </Button>
            <Button
              size="xs"
              variant={sortMode === 'title' ? 'solid' : 'outline'}
              onClick={() => setSortMode('title')}
            >
              Title
            </Button>
            <Button
              size="xs"
              variant={sortMode === 'oldest' ? 'solid' : 'outline'}
              onClick={() => setSortMode('oldest')}
            >
              Oldest
            </Button>
          </HStack>
        </Flex>

        {/* Unit Filter Pills */}
        <Wrap gap="2" alignItems="center">
          <Button
            size="xs"
            variant={selectedUnit === 'all' ? 'solid' : 'subtle'}
            onClick={() => {
              setSelectedUnit('all');
              setVisibleLimit(PAGE_SIZE);
            }}
          >
            All Units
          </Button>
          {ALL_UNITS.map((unit) => {
            const meta = UNIT_META[unit];
            const isSelected = selectedUnit === unit;
            return (
              <Button
                key={unit}
                size="xs"
                variant={isSelected ? 'solid' : 'subtle'}
                style={
                  isSelected
                    ? { backgroundColor: meta.color, color: '#fff', borderColor: meta.color }
                    : { borderColor: `${meta.color}40` }
                }
                onClick={() => {
                  setSelectedUnit(isSelected ? 'all' : unit);
                  setVisibleLimit(PAGE_SIZE);
                }}
              >
                {i18n.language.startsWith('ja') ? meta.shortJa : meta.shortEn}
              </Button>
            );
          })}
        </Wrap>

        {/* Category Filter Pills */}
        <Wrap gap="2" alignItems="center" pt="1">
          <Button
            size="xs"
            variant={categoryFilter === 'all' ? 'solid' : 'ghost'}
            onClick={() => {
              setCategoryFilter('all');
              setVisibleLimit(PAGE_SIZE);
            }}
          >
            {t('songs_page.filter_all')}
          </Button>
          <Button
            size="xs"
            variant={categoryFilter === 'commissioned' ? 'solid' : 'ghost'}
            onClick={() => {
              setCategoryFilter('commissioned');
              setVisibleLimit(PAGE_SIZE);
            }}
          >
            {t('songs_page.filter_commissioned')}
          </Button>
          <Button
            size="xs"
            variant={categoryFilter === 'cover' ? 'solid' : 'ghost'}
            onClick={() => {
              setCategoryFilter('cover');
              setVisibleLimit(PAGE_SIZE);
            }}
          >
            {t('songs_page.filter_cover')}
          </Button>
        </Wrap>
      </Stack>

      {/* Songs Grid */}
      {displayedSongs.length === 0 ? (
        <Box py="16" color="fg.muted" textAlign="center">
          No songs found matching your search.
        </Box>
      ) : (
        <Grid gap="4" columns={{ base: 1, sm: 2, md: 3, lg: 4 }}>
          {displayedSongs.map((song) => {
            const altVocals = anotherVocalsByMusicId.get(song.id) ?? [];
            const ev = eventBySongId.get(song.id);
            const mainUnit = song.units[0];
            const unitColor = mainUnit ? (UNIT_META[mainUnit]?.color ?? '#33ccbb') : '#33ccbb';

            return (
              <Box
                key={song.id}
                position="relative"
                borderColor="border.subtle"
                rounded="xl"
                borderWidth="1px"
                p="3.5"
                bg="bg.subtle"
                transition="all 0.15s ease"
                _hover={{
                  borderColor: `${unitColor}88`,
                  transform: 'translateY(-2px)',
                  boxShadow: 'sm'
                }}
              >
                <Stack gap="3">
                  <HStack gap="3" alignItems="center">
                    <Link className={css({ flexShrink: 0 })} href={songHref(song.id)}>
                      <SongJacketTile music={song} size={68} />
                    </Link>
                    <Stack flex="1" gap="1" minW="0">
                      <Link
                        className={css({
                          fontSize: 'sm',
                          fontWeight: 'extrabold',
                          lineHeight: '1.25',
                          lineClamp: 2,
                          _hover: { textDecoration: 'underline' }
                        })}
                        href={songHref(song.id)}
                      >
                        {localizedTitle(song.titleJa, song.titleEn, i18n.language)}
                      </Link>
                      {song.titleEn && i18n.language.startsWith('ja') && (
                        <Text color="fg.muted" fontSize="2xs" truncate>
                          {song.titleEn}
                        </Text>
                      )}
                      {!i18n.language.startsWith('ja') && (
                        <Text color="fg.muted" fontSize="2xs" truncate>
                          {song.titleJa}
                        </Text>
                      )}
                    </Stack>
                  </HStack>

                  {/* Badges row */}
                  <HStack gap="1.5" flexWrap="wrap">
                    {song.commissioned && (
                      <span
                        className={css({
                          borderColor: 'amber.500/50',
                          rounded: 'sm',
                          borderWidth: '1px',
                          py: '0.2',
                          px: '1.5',
                          color: 'amber.400',
                          fontSize: '2xs',
                          fontWeight: 'extrabold',
                          bg: 'amber.950/40'
                        })}
                      >
                        {t('songs_page.commissioned_badge')}
                      </span>
                    )}
                    {song.units.map((u) => (
                      <UnitBadge key={u} unit={u} size="xs" />
                    ))}
                    {altVocals.length > 0 && (
                      <span
                        className={css({
                          rounded: 'sm',
                          py: '0.2',
                          px: '1.5',
                          color: 'fg.muted',
                          fontSize: '2xs',
                          fontWeight: 'bold',
                          bg: 'bg.muted'
                        })}
                      >
                        {t('songs_page.alt_vocals_count', { count: altVocals.length })}
                      </span>
                    )}
                  </HStack>

                  {/* Commissioned Event link if present */}
                  {ev && (
                    <Box
                      borderColor="border.subtle"
                      rounded="md"
                      borderWidth="1px"
                      p="1.5"
                      fontSize="2xs"
                      bg="bg.default"
                    >
                      <HStack gap="1.5" alignItems="center">
                        <span className={css({ color: 'fg.muted' })}>Event:</span>
                        {ev.nickname && (
                          <span
                            className={css({
                              borderColor: `${unitColor}66`,
                              rounded: 'sm',
                              borderWidth: '1px',
                              py: '0.1',
                              px: '1',
                              color: unitColor,
                              fontSize: '2xs',
                              fontWeight: 'bold',
                              bg: `${unitColor}12`
                            })}
                          >
                            {ev.nickname}
                          </span>
                        )}
                        <Link
                          className={css({
                            fontWeight: 'bold',
                            truncate: true,
                            _hover: { textDecoration: 'underline' }
                          })}
                          href={eventHref(ev.id)}
                        >
                          {localizedTitle(ev.nameJa, ev.nameEn, i18n.language)}
                        </Link>
                      </HStack>
                    </Box>
                  )}

                  {/* Sekai Vocalists */}
                  {song.sekaiVocalCharacterIds.length > 0 && (
                    <HStack gap="1" alignItems="center">
                      <span className={css({ color: 'fg.muted', fontSize: '2xs' })}>Vocals:</span>
                      <HStack gap="1" flexWrap="wrap">
                        {song.sekaiVocalCharacterIds.map((charId) => (
                          <CharacterIcon key={charId} characterId={charId} size={22} />
                        ))}
                      </HStack>
                    </HStack>
                  )}

                  {/* Footer & Detail link */}
                  <HStack justifyContent="space-between" alignItems="center" pt="1">
                    <span className={css({ color: 'fg.muted', fontSize: '2xs' })}>
                      {formatDateShort(song.publishedAt, i18n.language)}
                    </span>
                    <Link
                      className={css({
                        borderColor: 'border.default',
                        rounded: 'md',
                        borderWidth: '1px',
                        py: '1',
                        px: '2.5',
                        fontSize: 'xs',
                        fontWeight: 'bold',
                        bg: 'bg.default',
                        _hover: { textDecoration: 'none', bg: 'bg.muted' }
                      })}
                      href={songHref(song.id)}
                    >
                      {t('common.read_more')} →
                    </Link>
                  </HStack>
                </Stack>
              </Box>
            );
          })}
        </Grid>
      )}

      {/* Show More Button */}
      {visibleLimit < filteredSongs.length && (
        <Flex justifyContent="center" pt="4">
          <Button size="sm" variant="outline" onClick={() => setVisibleLimit((v) => v + PAGE_SIZE)}>
            <BiChevronDown />
            Show More Songs ({displayedSongs.length} / {filteredSongs.length})
          </Button>
        </Flex>
      )}
    </Stack>
  );
}
