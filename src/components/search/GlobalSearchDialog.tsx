import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BiSearch, BiX } from 'react-icons/bi';
import { css } from 'styled-system/css';
import { Box, Flex, HStack, Stack, Wrap } from 'styled-system/jsx';
import { navigate } from 'vike/client/router';
import { SeverityPill } from '~/components/sekai/DroughtVisuals';
import {
  AttributeIcon,
  CardThumbTile,
  CharacterIcon,
  SongJacketTile,
  UnitBadge
} from '~/components/sekai/SekaiVisuals';
import { Dialog } from '~/components/ui/dialog';
import { Link } from '~/components/ui/link';
import { Button } from '~/components/ui/styled/button';
import { IconButton } from '~/components/ui/styled/icon-button';
import { Text } from '~/components/ui/text';
import { useCountdownData } from '~/context/CountdownDataContext';
import { eventStoryBannerUrl } from '~/utils/countdown/assets';
import {
  charDisplayName,
  formatDateShort,
  localizedTitle,
  SEVERITY_PALETTE
} from '~/utils/countdown/format';
import {
  buildGlobalSearchIndex,
  queryGlobalSearch,
  type CardSearchItem,
  type CharacterSearchItem,
  type ClockSearchItem,
  type EventSearchItem,
  type GlobalSearchItem,
  type SearchCategory,
  type SongSearchItem
} from '~/utils/countdown/search';

const QUICK_SUGGESTIONS = [
  'mizu5',
  'mizuki hakolim',
  'airi bloomfes',
  'rin mmj',
  'akito happy',
  'record'
] as const;

const CATEGORIES: SearchCategory[] = ['all', 'character', 'clock', 'event', 'card', 'song'];

const rowBaseClass = css({
  display: 'flex',
  gap: '3',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderColor: 'transparent',
  rounded: 'xl',
  borderWidth: '1px',
  w: 'full',
  py: '2',
  px: '2.5',
  textAlign: 'left',
  transition: 'background 0.1s ease',
  _hover: { textDecoration: 'none', bg: 'bg.muted/65' }
});

const rowActiveClass = css({
  display: 'flex',
  gap: '3',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderColor: 'border.default',
  rounded: 'xl',
  borderWidth: '1px',
  w: 'full',
  py: '2',
  px: '2.5',
  textAlign: 'left',
  bg: 'bg.muted',
  transition: 'background 0.1s ease',
  _hover: { textDecoration: 'none', bg: 'bg.muted' }
});

export function GlobalSearchDialog() {
  const { t, i18n } = useTranslation();
  const { snapshot, now, preferTrained, charById, cardById } = useCountdownData();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const isJa = i18n.language.startsWith('ja');

  // Build search index lazily once the dialog is opened for the first time
  const [hasOpened, setHasOpened] = useState(false);
  useEffect(() => {
    if (open) {
      setHasOpened(true);
      window.setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  // Global keyboard shortcuts: Ctrl/Cmd + K, or '/' outside text inputs
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
      if (e.key === '/' && !open && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName?.toLowerCase();
        if (
          tag === 'input' ||
          tag === 'textarea' ||
          tag === 'select' ||
          target?.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const searchIndex = useMemo(() => {
    if (!hasOpened) return null;
    return buildGlobalSearchIndex(snapshot, now);
  }, [hasOpened, snapshot, now]);

  const results = useMemo(() => {
    if (!searchIndex) {
      return {
        characters: [],
        clocks: [],
        events: [],
        cards: [],
        songs: [],
        flat: [],
        totalMatches: 0
      };
    }
    return queryGlobalSearch(searchIndex, query, category);
  }, [searchIndex, query, category]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, category]);

  const indexById = useMemo(() => {
    const map = new Map<string, number>();
    results.flat.forEach((item, idx) => map.set(item.id, idx));
    return map;
  }, [results.flat]);

  const closeAndGo = (href: string) => {
    setOpen(false);
    void navigate(href);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.flat.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.flat.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.flat.length) % results.flat.length);
    } else if (e.key === 'Enter') {
      const target = results.flat[activeIndex];
      if (target) {
        e.preventDefault();
        closeAndGo(target.href);
      }
    }
  };

  const renderCharacterRow = (item: CharacterSearchItem) => {
    const idx = indexById.get(item.id) ?? -1;
    const active = idx === activeIndex;
    const p1 = SEVERITY_PALETTE[item.primaryClock.severity];
    const p2 = SEVERITY_PALETTE[item.secondaryClock.severity];
    return (
      <Link
        className={active ? rowActiveClass : rowBaseClass}
        key={item.id}
        href={item.href}
        onClick={() => setOpen(false)}
        onMouseEnter={() => idx >= 0 && setActiveIndex(idx)}
      >
        <HStack gap="2.5" minW="0">
          <CharacterIcon characterId={item.character.id} size={34} />
          <Stack gap="0" minW="0">
            <HStack gap="1.5" alignItems="center" flexWrap="wrap">
              <span className={css({ fontSize: 'sm', fontWeight: 'bold' })}>
                {charDisplayName(item.character, i18n.language)}
              </span>
              <span
                className={css({
                  rounded: 'sm',
                  px: '1',
                  color: 'fg.muted',
                  fontFamily: 'mono',
                  fontSize: '2xs',
                  bg: 'bg.subtle'
                })}
              >
                #{item.character.abbrev}
              </span>
              <UnitBadge unit={item.character.unit} short size="xs" />
            </HStack>
            <span className={css({ color: 'fg.muted', fontSize: '2xs' })}>
              {isJa ? item.character.nameEn : item.character.nameJa}
            </span>
          </Stack>
        </HStack>

        <HStack gap="2.5" flexShrink={0}>
          <Stack gap="0" alignItems="flex-end">
            <span className={css({ color: 'fg.muted', fontSize: '9px' })}>
              {isJa ? item.primaryLabelJa : item.primaryLabelEn}
            </span>
            <span
              className={css({
                fontSize: 'xs',
                fontWeight: 'extrabold',
                fontVariantNumeric: 'tabular-nums'
              })}
              style={{ color: p1.text }}
            >
              {t('common.days', { count: item.primaryClock.daysSince })}
            </span>
          </Stack>
          <Stack gap="0" alignItems="flex-end">
            <span className={css({ color: 'fg.muted', fontSize: '9px' })}>
              {isJa ? item.secondaryLabelJa : item.secondaryLabelEn}
            </span>
            <span
              className={css({
                fontSize: 'xs',
                fontWeight: 'extrabold',
                fontVariantNumeric: 'tabular-nums'
              })}
              style={{ color: p2.text }}
            >
              {t('common.days', { count: item.secondaryClock.daysSince })}
            </span>
          </Stack>
        </HStack>
      </Link>
    );
  };

  const renderClockRow = (item: ClockSearchItem) => {
    const idx = indexById.get(item.id) ?? -1;
    const active = idx === activeIndex;
    const pal = SEVERITY_PALETTE[item.clock.severity];
    const latestCard = item.clock.latest?.cardId
      ? cardById.get(item.clock.latest.cardId)
      : undefined;

    return (
      <Link
        className={active ? rowActiveClass : rowBaseClass}
        key={item.id}
        href={characterHrefFromItem(item)}
        onClick={() => setOpen(false)}
        onMouseEnter={() => idx >= 0 && setActiveIndex(idx)}
      >
        <HStack gap="2.5" minW="0">
          {latestCard ? (
            <CardThumbTile
              card={latestCard}
              preferTrained={preferTrained}
              size={36}
              showSupply={false}
            />
          ) : (
            <CharacterIcon characterId={item.character.id} subUnit={item.subUnit} size={34} />
          )}
          <Stack gap="0" minW="0">
            <HStack gap="1.5" alignItems="center" flexWrap="wrap">
              <span className={css({ fontSize: 'xs', fontWeight: 'bold' })}>
                {charDisplayName(item.character, i18n.language, true)}
              </span>
              <span className={css({ color: 'fg.muted', fontSize: 'xs' })}>·</span>
              {item.attr && <AttributeIcon attr={item.attr} size={13} />}
              {item.subUnit && <UnitBadge unit={item.subUnit} short size="xs" />}
              <span className={css({ fontSize: 'xs', fontWeight: 'semibold' })}>
                {isJa ? item.categoryJa : item.categoryEn}
              </span>
            </HStack>
            <span
              className={css({
                color: 'fg.muted',
                fontSize: '2xs',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap'
              })}
            >
              {item.clock.latest
                ? `${localizedTitle(item.clock.latest.labelJa, item.clock.latest.labelEn, i18n.language)} · ${formatDateShort(item.clock.lastTimestamp, i18n.language)}`
                : t('common.never')}
            </span>
          </Stack>
        </HStack>

        <HStack gap="2" flexShrink={0}>
          <SeverityPill clock={item.clock} />
          <span
            className={css({
              fontSize: 'md',
              fontWeight: 'black',
              fontVariantNumeric: 'tabular-nums'
            })}
            style={{ color: pal.text }}
          >
            {t('common.days', { count: item.clock.daysSince })}
          </span>
        </HStack>
      </Link>
    );
  };

  const renderEventRow = (item: EventSearchItem) => {
    const idx = indexById.get(item.id) ?? -1;
    const active = idx === activeIndex;
    const banner = eventStoryBannerUrl(item.event);

    return (
      <Link
        className={active ? rowActiveClass : rowBaseClass}
        key={item.id}
        href={item.href}
        onClick={() => setOpen(false)}
        onMouseEnter={() => idx >= 0 && setActiveIndex(idx)}
      >
        <HStack gap="2.5" minW="0">
          {banner && (
            <img
              src={banner}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              style={{
                width: 68,
                height: 34,
                objectFit: 'cover',
                borderRadius: 6,
                flexShrink: 0
              }}
            />
          )}
          <Stack gap="0" minW="0">
            <HStack gap="1.5" alignItems="center" flexWrap="wrap">
              <span
                className={css({
                  color: 'fg.muted',
                  fontFamily: 'mono',
                  fontSize: '2xs'
                })}
              >
                #{item.event.id}
              </span>
              {item.event.nickname && (
                <span
                  className={css({
                    rounded: 'sm',
                    py: '0.5',
                    px: '1.5',
                    fontSize: '2xs',
                    fontWeight: 'extrabold',
                    bg: 'bg.subtle'
                  })}
                >
                  {item.event.nickname}
                </span>
              )}
              <span
                className={css({
                  fontSize: 'xs',
                  fontWeight: 'bold',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                })}
              >
                {localizedTitle(item.event.nameJa, item.event.nameEn, i18n.language)}
              </span>
            </HStack>
            <HStack gap="1.5" color="fg.muted" fontSize="2xs">
              <UnitBadge unit={item.event.unit} short size="xs" />
              {item.focusCharacter && (
                <span>{charDisplayName(item.focusCharacter, i18n.language, true)}</span>
              )}
              <span>· {formatDateShort(item.event.startAt, i18n.language)}</span>
            </HStack>
          </Stack>
        </HStack>

        <Box flexShrink={0}>
          {item.status === 'live' ? (
            <span
              className={css({
                rounded: 'full',
                py: '0.5',
                px: '2',
                color: '#ffffff',
                fontSize: '2xs',
                fontWeight: 'extrabold'
              })}
              style={{ background: '#10b981' }}
            >
              {t('search.live_now')}
            </span>
          ) : item.status === 'upcoming' ? (
            <span
              className={css({
                color: '#f59e0b',
                fontSize: 'xs',
                fontWeight: 'bold',
                fontVariantNumeric: 'tabular-nums'
              })}
            >
              {t('search.in_days', { count: item.daysDelta })}
            </span>
          ) : (
            <span
              className={css({
                color: 'fg.muted',
                fontSize: 'xs',
                fontWeight: 'bold',
                fontVariantNumeric: 'tabular-nums'
              })}
            >
              {t('search.days_ago', { count: item.daysDelta })}
            </span>
          )}
        </Box>
      </Link>
    );
  };

  const renderCardRow = (item: CardSearchItem) => {
    const idx = indexById.get(item.id) ?? -1;
    const active = idx === activeIndex;

    return (
      <Link
        className={active ? rowActiveClass : rowBaseClass}
        key={item.id}
        href={item.href}
        onClick={() => setOpen(false)}
        onMouseEnter={() => idx >= 0 && setActiveIndex(idx)}
      >
        <HStack gap="2.5" minW="0">
          <CardThumbTile card={item.card} preferTrained={preferTrained} size={40} />
          <Stack gap="0" minW="0">
            <HStack gap="1.5" alignItems="center" flexWrap="wrap">
              <span className={css({ fontSize: 'xs', fontWeight: 'bold' })}>
                {localizedTitle(item.card.prefixJa, item.card.prefixEn, i18n.language)}
              </span>
              {item.event?.nickname && (
                <span
                  className={css({
                    rounded: 'sm',
                    px: '1',
                    color: 'fg.muted',
                    fontSize: '2xs',
                    bg: 'bg.subtle'
                  })}
                >
                  {item.event.nickname}
                </span>
              )}
            </HStack>
            <span className={css({ color: 'fg.muted', fontSize: '2xs' })}>
              {charDisplayName(item.character, i18n.language)} ·{' '}
              {formatDateShort(item.card.releaseAt, i18n.language)}
            </span>
          </Stack>
        </HStack>

        <span
          className={css({
            flexShrink: 0,
            color: 'fg.muted',
            fontSize: 'xs',
            fontWeight: 'bold',
            fontVariantNumeric: 'tabular-nums'
          })}
        >
          {t('search.days_ago', { count: item.daysAgo })}
        </span>
      </Link>
    );
  };

  const renderSongRow = (item: SongSearchItem) => {
    const idx = indexById.get(item.id) ?? -1;
    const active = idx === activeIndex;
    const altSingers = item.altSingerIds
      .slice(0, 4)
      .map((cid) => charById.get(cid))
      .filter(Boolean);

    return (
      <Link
        className={active ? rowActiveClass : rowBaseClass}
        key={item.id}
        href={item.href}
        onClick={() => setOpen(false)}
        onMouseEnter={() => idx >= 0 && setActiveIndex(idx)}
      >
        <HStack gap="2.5" minW="0">
          <SongJacketTile music={item.music} size={38} />
          <Stack gap="0" minW="0">
            <HStack gap="1.5" alignItems="center" flexWrap="wrap">
              <span
                className={css({
                  fontSize: 'xs',
                  fontWeight: 'bold',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                })}
              >
                {localizedTitle(item.music.titleJa, item.music.titleEn, i18n.language)}
              </span>
              {item.music.units[0] && <UnitBadge unit={item.music.units[0]} short size="xs" />}
            </HStack>
            <HStack gap="1.5" color="fg.muted" fontSize="2xs">
              <span>{formatDateShort(item.music.publishedAt, i18n.language)}</span>
              {altSingers.length > 0 && (
                <HStack gap="0.5">
                  <span>· Alt:</span>
                  {altSingers.map((ch) => (
                    <CharacterIcon key={ch!.id} characterId={ch!.id} size={15} />
                  ))}
                  {item.altSingerIds.length > 4 && <span>+{item.altSingerIds.length - 4}</span>}
                </HStack>
              )}
            </HStack>
          </Stack>
        </HStack>

        <span
          className={css({
            flexShrink: 0,
            color: 'fg.muted',
            fontSize: 'xs',
            fontWeight: 'bold',
            fontVariantNumeric: 'tabular-nums'
          })}
        >
          {t('search.days_ago', { count: item.daysAgo })}
        </span>
      </Link>
    );
  };

  const isEmptyQuery = query.trim().length === 0;

  return (
    <>
      <Button
        size="xs"
        variant="outline"
        onClick={() => setOpen(true)}
        aria-label={t('search.button')}
        title={`${t('search.button')} (Ctrl+K)`}
      >
        <BiSearch />
        <Box as="span" hideBelow="sm">
          {t('search.button')}
        </Box>
        <Box
          as="kbd"
          className={css({
            borderColor: 'border.subtle',
            rounded: 'sm',
            borderWidth: '1px',
            ml: '0.5',
            px: '1',
            color: 'fg.muted',
            fontFamily: 'mono',
            fontSize: '9px',
            bg: 'bg.subtle'
          })}
          hideBelow="xl"
        >
          Ctrl K
        </Box>
      </Button>

      <Dialog.Root
        open={open}
        onOpenChange={(e) => setOpen(e.open)}
        initialFocusEl={() => inputRef.current}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner
          className={css({
            alignItems: 'flex-start',
            px: '3',
            pt: { base: '3', md: '12' }
          })}
        >
          <Dialog.Content
            className={css({
              display: 'flex',
              flexDirection: 'column',
              borderColor: 'border.default',
              rounded: '2xl',
              borderWidth: '1px',
              w: 'full',
              maxW: '680px',
              maxH: { base: '88dvh', md: '80dvh' },
              bg: 'bg.default',
              boxShadow: '2xl',
              overflow: 'hidden'
            })}
          >
            {/* Top Search Input Row */}
            <HStack gap="2.5" borderColor="border.subtle" borderBottomWidth="1px" py="3" px="3.5">
              <Box flexShrink={0} color="fg.muted">
                <BiSearch size={20} />
              </Box>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={t('search.placeholder')}
                aria-label={t('search.placeholder')}
                className={css({
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  minW: '0',
                  color: 'fg.default',
                  fontSize: 'sm',
                  bg: 'transparent',
                  _placeholder: { color: 'fg.muted' }
                })}
              />
              {query.length > 0 && (
                <IconButton
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  aria-label={t('search.clear')}
                >
                  <BiX size={18} />
                </IconButton>
              )}
              <Dialog.CloseTrigger asChild>
                <Button
                  className={css({ px: '2', fontFamily: 'mono', fontSize: '2xs' })}
                  size="xs"
                  variant="subtle"
                  aria-label="Close Search"
                >
                  Esc
                </Button>
              </Dialog.CloseTrigger>
            </HStack>

            {/* Category Filter Tabs + Quick Query Pills */}
            <Stack
              gap="2"
              borderColor="border.subtle"
              borderBottomWidth="1px"
              py="2"
              px="3.5"
              bg="bg.subtle/60"
            >
              <Wrap gap="1.5">
                {CATEGORIES.map((cat) => (
                  <Button
                    key={cat}
                    size="xs"
                    variant={category === cat ? 'solid' : 'outline'}
                    onClick={() => setCategory(cat)}
                  >
                    {t(`search.cat_${cat}`)}
                  </Button>
                ))}
              </Wrap>

              {isEmptyQuery && (
                <Wrap gap="1.5" alignItems="center">
                  <span className={css({ color: 'fg.muted', fontSize: '2xs' })}>
                    {t('search.try_queries')}
                  </span>
                  {QUICK_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setQuery(s);
                        inputRef.current?.focus();
                      }}
                      className={css({
                        cursor: 'pointer',
                        borderColor: 'border.subtle',
                        rounded: 'full',
                        borderWidth: '1px',
                        py: '0.5',
                        px: '2',
                        color: 'fg.muted',
                        fontFamily: 'mono',
                        fontSize: '2xs',
                        bg: 'bg.default',
                        _hover: { borderColor: 'border.default', color: 'fg.default' }
                      })}
                    >
                      {s}
                    </button>
                  ))}
                </Wrap>
              )}
            </Stack>

            {/* Scrollable Grouped Results */}
            <Box flex={1} p="3" overflowY="auto">
              {results.flat.length === 0 ? (
                <Stack gap="2.5" alignItems="center" py="10">
                  <Text color="fg.muted" fontSize="sm">
                    {t('search.no_results', { query })}
                  </Text>
                  <Button size="xs" variant="outline" onClick={() => setQuery('')}>
                    {t('search.clear')}
                  </Button>
                </Stack>
              ) : (
                <Stack gap="4">
                  {/* If an exact event nickname matched first (e.g. mizu5), render Events at top */}
                  {results.flat[0]?.kind === 'event' && results.events.length > 0 && (
                    <ResultSection
                      title={isEmptyQuery ? t('search.sec_events_recent') : t('search.sec_events')}
                    >
                      {results.events.map(renderEventRow)}
                    </ResultSection>
                  )}

                  {results.characters.length > 0 && (
                    <ResultSection title={t('search.sec_characters')}>
                      {results.characters.map(renderCharacterRow)}
                    </ResultSection>
                  )}

                  {results.clocks.length > 0 && (
                    <ResultSection
                      title={
                        isEmptyQuery && category === 'all'
                          ? t('search.sec_clocks_record')
                          : t('search.sec_clocks')
                      }
                    >
                      {results.clocks.map(renderClockRow)}
                    </ResultSection>
                  )}

                  {results.flat[0]?.kind !== 'event' && results.events.length > 0 && (
                    <ResultSection
                      title={isEmptyQuery ? t('search.sec_events_recent') : t('search.sec_events')}
                    >
                      {results.events.map(renderEventRow)}
                    </ResultSection>
                  )}

                  {results.cards.length > 0 && (
                    <ResultSection title={t('search.sec_cards')}>
                      {results.cards.map(renderCardRow)}
                    </ResultSection>
                  )}

                  {results.songs.length > 0 && (
                    <ResultSection title={t('search.sec_songs')}>
                      {results.songs.map(renderSongRow)}
                    </ResultSection>
                  )}
                </Stack>
              )}
            </Box>

            {/* Footer Keyboard Hint */}
            <Flex
              hideBelow="sm"
              justifyContent="space-between"
              alignItems="center"
              borderColor="border.subtle"
              borderTopWidth="1px"
              py="2"
              px="3.5"
              bg="bg.subtle/60"
            >
              <span className={css({ color: 'fg.muted', fontSize: '2xs' })}>
                {t('search.hint_nav')}
              </span>
              <span className={css({ color: 'fg.muted', fontFamily: 'mono', fontSize: '2xs' })}>
                / · Ctrl+K
              </span>
            </Flex>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </>
  );
}

function characterHrefFromItem(item: GlobalSearchItem): string {
  if (item.kind === 'clock') {
    return item.href;
  }
  return item.href;
}

function ResultSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Stack gap="1">
      <Text
        px="2"
        color="fg.muted"
        fontSize="2xs"
        fontWeight="extrabold"
        letterSpacing="wider"
        textTransform="uppercase"
      >
        {title}
      </Text>
      <Stack gap="0.5">{children}</Stack>
    </Stack>
  );
}
