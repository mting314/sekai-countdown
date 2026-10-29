import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { css } from 'styled-system/css';
import { Box, Flex, Grid, HStack, Stack, Wrap } from 'styled-system/jsx';
import { EmptyFilterState, InlineFilterInput } from '~/components/search/InlineFilterInput';
import {
  DroughtMeter,
  SeverityPill,
  sortClocks,
  type SortMode
} from '~/components/sekai/DroughtVisuals';
import {
  CardCutoutRender,
  CardThumbTile,
  CharacterIcon,
  EventLogoImage,
  SongJacketTile,
  StampTile,
  UnitBadge
} from '~/components/sekai/SekaiVisuals';
import { Link } from '~/components/ui/link';
import { Button } from '~/components/ui/styled/button';
import { Text } from '~/components/ui/text';
import { useCountdownData } from '~/context/CountdownDataContext';
import type { CompactCard, CompactEvent, DroughtClock } from '~/types/countdown';
import { eventBgUrl, eventCharacterRenderUrl, eventStoryBannerUrl } from '~/utils/countdown/assets';
import {
  charDisplayName,
  formatDateShort,
  formatDurationCountdown,
  localizedTitle,
  SEVERITY_PALETTE
} from '~/utils/countdown/format';
import {
  computeCardMetrics,
  computeExtrasMetrics,
  computeFocusMetrics,
  computeMixedAndAttributeMetrics,
  computeVirtualSingerMetrics,
  getBannerTimelineState
} from '~/utils/countdown/metrics';
import {
  cardsHref,
  characterHref,
  extrasHref,
  focusHref,
  mixedAttrsHref,
  virtualSingersHref
} from '~/utils/countdown/routes';
import { matchesClockQuery } from '~/utils/countdown/search';

type QuickMetricKey = 'focus' | 'lim4' | 'any4' | 'perm4' | 'mixed_banner' | 'alt_vocal' | 'stamp';

function HeroEventBanner({
  event,
  mode,
  preferTrained
}: {
  event: CompactEvent;
  mode: 'live' | 'upcoming' | 'ended';
  preferTrained: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { now, cardById, musicById, charById } = useCountdownData();
  const [tickNow, setTickNow] = useState(now);
  const [noBanner, setNoBanner] = useState(false);
  const [noCharRender, setNoCharRender] = useState(false);

  useEffect(() => {
    setTickNow(Date.now());
    const id = window.setInterval(() => setTickNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const bannerUrl = noBanner
    ? undefined
    : (eventBgUrl(event.assetbundleName) ?? eventStoryBannerUrl(event));
  const charRenderUrl = noCharRender ? undefined : eventCharacterRenderUrl(event.assetbundleName);
  const cards = event.cardIds
    .map((id) => cardById.get(id))
    .filter((c): c is CompactCard => Boolean(c));
  const song = event.songId ? musicById.get(event.songId) : undefined;
  const focusChar = event.focusCharacterId ? charById.get(event.focusCharacterId) : undefined;

  const badgeLabel =
    mode === 'live'
      ? t('overview.hero_live')
      : mode === 'upcoming'
        ? t('overview.hero_upcoming')
        : t('overview.hero_ended');

  const badgeBg = mode === 'live' ? '#10b981' : mode === 'upcoming' ? '#f59e0b' : '#64748b';
  const countdownText =
    mode === 'live'
      ? t('overview.ends_in', { time: formatDurationCountdown(event.aggregateAt - tickNow) })
      : mode === 'upcoming'
        ? t('overview.starts_in', { time: formatDurationCountdown(event.startAt - tickNow) })
        : formatDateShort(event.startAt, i18n.language);

  return (
    <Box
      position="relative"
      borderColor="border.default"
      rounded="2xl"
      borderWidth="1px"
      minH={{ base: '190px', md: '215px' }}
      bg="bg.subtle"
      overflow="hidden"
    >
      {bannerUrl && (
        <img
          src={bannerUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setNoBanner(true)}
          className={css({
            inset: '0',
            position: 'absolute',
            objectFit: 'cover',
            w: 'full',
            h: 'full',
            opacity: { base: 0.28, _dark: 0.36 },
            pointerEvents: 'none'
          })}
        />
      )}
      <Box
        className={css({
          bgGradient: 'to-r',
          gradientFrom: 'bg.subtle',
          gradientVia: 'bg.subtle/85',
          gradientTo: 'bg.subtle/35'
        })}
        inset="0"
        position="absolute"
        pointerEvents="none"
      />

      {charRenderUrl && (
        <img
          src={charRenderUrl}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setNoCharRender(true)}
          className={css({
            position: 'absolute',
            right: { base: '-16px', md: '16px' },
            bottom: '0',
            objectFit: 'contain',
            w: 'auto',
            h: { base: '155px', md: '210px' },
            opacity: { base: 0.4, sm: 0.85 },
            pointerEvents: 'none'
          })}
        />
      )}

      <Flex
        position="relative"
        gap="3"
        direction="column"
        justifyContent="space-between"
        maxW={{ base: '100%', md: '72%' }}
        p={{ base: '4', md: '6' }}
      >
        <HStack gap="2" alignItems="center" flexWrap="wrap">
          <span
            className={css({
              rounded: 'full',
              py: '0.5',
              px: '2.5',
              color: '#ffffff',
              fontSize: '2xs',
              fontWeight: 'extrabold',
              letterSpacing: 'wider'
            })}
            style={{ background: badgeBg }}
          >
            {badgeLabel}
          </span>
          <UnitBadge unit={event.unit} />
          {event.nickname && (
            <span
              className={css({
                rounded: 'md',
                py: '0.5',
                px: '2',
                fontSize: 'xs',
                fontWeight: 'bold',
                bg: 'bg.muted'
              })}
            >
              {event.nickname}
            </span>
          )}
          <span
            className={css({
              rounded: 'md',
              py: '0.5',
              px: '2',
              fontSize: 'xs',
              fontWeight: 'bold',
              fontVariantNumeric: 'tabular-nums',
              bg: 'bg.default/80'
            })}
          >
            ⏱ {countdownText}
          </span>
        </HStack>

        <HStack gap="4" alignItems="center" flexWrap="wrap">
          <EventLogoImage assetbundleName={event.assetbundleName} height={54} />
          <Stack gap="0.5">
            <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="extrabold">
              {localizedTitle(event.nameJa, event.nameEn, i18n.language)}
            </Text>
            {focusChar && (
              <HStack gap="1.5">
                <CharacterIcon characterId={focusChar.id} size={22} />
                <Text color="fg.muted" fontSize="xs">
                  {charDisplayName(focusChar, i18n.language)}
                  {event.isHakolim ? ' · Hakolim' : ''}
                </Text>
              </HStack>
            )}
          </Stack>
        </HStack>

        {(cards.length > 0 || song) && (
          <HStack gap="2" alignItems="center" pt="1" flexWrap="wrap">
            {cards.slice(0, 6).map((c) => (
              <Link key={c.id} href={characterHref(c.characterId)}>
                <CardThumbTile card={c} preferTrained={preferTrained} size={46} />
              </Link>
            ))}
            {song && (
              <HStack
                gap="2"
                borderColor="border.subtle"
                rounded="lg"
                borderWidth="1px"
                py="1"
                px="2.5"
                bg="bg.default/80"
              >
                <SongJacketTile music={song} size={36} />
                <Stack gap="0">
                  <span className={css({ color: 'fg.muted', fontSize: '2xs' })}>Commissioned</span>
                  <span className={css({ fontSize: 'xs', fontWeight: 'bold' })}>
                    {localizedTitle(song.titleJa, song.titleEn, i18n.language)}
                  </span>
                </Stack>
              </HStack>
            )}
          </HStack>
        )}
      </Flex>
    </Box>
  );
}

function PodiumCategoryCard({
  title,
  href,
  clocks,
  preferTrained
}: {
  title: string;
  href: string;
  clocks: DroughtClock[];
  preferTrained: boolean;
}) {
  const { t, i18n } = useTranslation();
  const { charById, cardById, snapshot } = useCountdownData();

  const ranked = useMemo(() => sortClocks(clocks, 'days').slice(0, 3), [clocks]);
  const top = ranked[0];
  if (!top || !top.characterId) return null;

  const topChar = charById.get(top.characterId);
  if (!topChar) return null;

  // Prefer the category's latest 4★ card for cutout, falling back to the character's latest 4★ card
  const latestCatCard = top.latest?.cardId ? cardById.get(top.latest.cardId) : undefined;
  const fallbackHero4Star = snapshot.cards.findLast(
    (c) => c.characterId === topChar.id && c.rarity === 'rarity_4'
  );
  const cutoutCard =
    latestCatCard && latestCatCard.rarity === 'rarity_4'
      ? latestCatCard
      : (fallbackHero4Star ?? latestCatCard);

  const pal = SEVERITY_PALETTE[top.severity];

  return (
    <Box
      display="flex"
      position="relative"
      flexDirection="column"
      justifyContent="space-between"
      borderColor="border.default"
      rounded="2xl"
      borderWidth="1px"
      bg="bg.subtle"
      overflow="hidden"
    >
      {/* Top #1 Spotlight with Full-Bleed Card Art Fade */}
      <Box
        style={{
          background: `radial-gradient(circle at 48% 45%, ${topChar.color}30, transparent 65%)`
        }}
        position="relative"
        minH="188px"
        p="4"
        overflow="hidden"
      >
        <Box
          position="absolute"
          top="0"
          right="0"
          bottom="0"
          w="66%"
          opacity={0.92}
          pointerEvents="none"
        >
          <CardCutoutRender card={cutoutCard} preferTrained={preferTrained} />
        </Box>

        <Stack position="relative" gap="2" maxW="62%">
          <HStack justifyContent="space-between" alignItems="center">
            <Link
              className={css({
                color: 'fg.muted',
                fontSize: 'xs',
                fontWeight: 'bold',
                letterSpacing: 'wider',
                textTransform: 'uppercase',
                _hover: { color: 'fg.default', textDecoration: 'none' }
              })}
              href={href}
            >
              {title} →
            </Link>
          </HStack>

          <Link
            className={css({
              display: 'inline-flex',
              gap: '2',
              alignItems: 'center',
              _hover: { textDecoration: 'none', opacity: 0.9 }
            })}
            href={characterHref(topChar.id)}
          >
            <CharacterIcon characterId={topChar.id} size={34} />
            <Stack gap="0">
              <span
                className={css({ fontSize: 'md', fontWeight: 'extrabold', lineHeight: 'tight' })}
              >
                {charDisplayName(topChar, i18n.language, true)}
              </span>
              <span className={css({ color: 'fg.muted', fontSize: '2xs' })}>
                {formatDateShort(top.lastTimestamp, i18n.language)}
              </span>
            </Stack>
          </Link>

          <HStack gap="2" alignItems="baseline" flexWrap="wrap">
            <span
              className={css({
                fontSize: '3xl',
                fontWeight: 'black',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: '1'
              })}
              style={{ color: pal.text }}
            >
              {t('common.days', { count: top.daysSince })}
            </span>
            {top.eventsSince !== undefined && (
              <span
                className={css({
                  color: 'fg.muted',
                  fontSize: '2xs',
                  fontVariantNumeric: 'tabular-nums'
                })}
              >
                {t('common.events_ago', { count: top.eventsSince })}
              </span>
            )}
          </HStack>

          <SeverityPill clock={top} />
          <DroughtMeter clock={top} compact />
        </Stack>
      </Box>

      {/* #2 & #3 Runners-up */}
      <Stack gap="0" borderColor="border.subtle" borderTopWidth="1px" bg="bg.default/55">
        {ranked.slice(1, 3).map((runner, idx) => {
          const ch = runner.characterId ? charById.get(runner.characterId) : undefined;
          if (!ch) return null;
          const rPal = SEVERITY_PALETTE[runner.severity];
          const rCard = runner.latest?.cardId ? cardById.get(runner.latest.cardId) : undefined;
          return (
            <Link
              className={css({
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderColor: 'border.subtle',
                py: '2',
                px: '3.5',
                _hover: { textDecoration: 'none', bg: 'bg.muted/50' }
              })}
              style={{ borderTopWidth: idx > 0 ? 1 : 0 }}
              key={ch.id}
              href={characterHref(ch.id)}
            >
              <HStack gap="2">
                <span
                  className={css({ w: '5', color: 'fg.muted', fontSize: 'xs', fontWeight: 'bold' })}
                >
                  #{idx + 2}
                </span>
                <CharacterIcon characterId={ch.id} size={26} />
                {rCard && (
                  <CardThumbTile
                    card={rCard}
                    preferTrained={preferTrained}
                    size={28}
                    showSupply={false}
                  />
                )}
                <span className={css({ fontSize: 'xs', fontWeight: 'semibold' })}>
                  {charDisplayName(ch, i18n.language, true)}
                </span>
              </HStack>
              <HStack gap="2">
                <span
                  className={css({
                    color: 'fg.muted',
                    fontSize: '2xs',
                    fontVariantNumeric: 'tabular-nums'
                  })}
                >
                  {runner.overdueRatio.toFixed(1)}×
                </span>
                <span
                  className={css({
                    fontSize: 'sm',
                    fontWeight: 'extrabold',
                    fontVariantNumeric: 'tabular-nums'
                  })}
                  style={{ color: rPal.text }}
                >
                  {t('common.days', { count: runner.daysSince })}
                </span>
              </HStack>
            </Link>
          );
        })}
      </Stack>
    </Box>
  );
}

export function OverviewHub() {
  const { t, i18n } = useTranslation();
  const { snapshot, now, preferTrained, charById, cardById, eventById, musicById, stampById } =
    useCountdownData();
  const [quickMetric, setQuickMetric] = useState<QuickMetricKey>('focus');
  const [sortMode, setSortMode] = useState<SortMode>('days');
  const [quickQuery, setQuickQuery] = useState('');

  const bannerState = useMemo(() => getBannerTimelineState(snapshot, now), [snapshot, now]);
  const focus = useMemo(() => computeFocusMetrics(snapshot, now), [snapshot, now]);
  const cards = useMemo(
    () => computeCardMetrics(snapshot, now, { includeWorldLink: false, includeCollab: true }),
    [snapshot, now]
  );
  const vs = useMemo(() => computeVirtualSingerMetrics(snapshot, now), [snapshot, now]);
  const mixed = useMemo(() => computeMixedAndAttributeMetrics(snapshot, now), [snapshot, now]);
  const extras = useMemo(() => computeExtrasMetrics(snapshot, now), [snapshot, now]);

  const recordBreakers = useMemo(() => {
    const pools: { label: string; href: string; clocks: DroughtClock[] }[] = [
      { label: t('clocks.solo_focus'), href: focusHref(), clocks: focus.characterFocus },
      { label: t('clocks.lim_4star'), href: cardsHref(), clocks: cards.lim4Star },
      { label: t('clocks.any_4star'), href: cardsHref(), clocks: cards.any4Star },
      { label: t('clocks.vs_unit_4star'), href: virtualSingersHref(), clocks: vs.unitFocusVs4Star },
      { label: t('clocks.mixed_banner'), href: mixedAttrsHref(), clocks: mixed.mixedBanner },
      { label: t('clocks.alt_vocal'), href: extrasHref(), clocks: extras.altVocals }
    ];
    const items: { label: string; href: string; clock: DroughtClock }[] = [];
    for (const p of pools) {
      for (const c of p.clocks) {
        if (c.isRecordWait && c.count >= 2) {
          items.push({ label: p.label, href: p.href, clock: c });
        }
      }
    }
    return items.toSorted((a, b) => b.clock.overdueRatio - a.clock.overdueRatio).slice(0, 12);
  }, [t, focus, cards, vs, mixed, extras]);

  const quickClocks = useMemo(() => {
    const raw =
      quickMetric === 'focus'
        ? focus.characterFocus
        : quickMetric === 'lim4'
          ? cards.lim4Star
          : quickMetric === 'any4'
            ? cards.any4Star
            : quickMetric === 'perm4'
              ? cards.perm4Star
              : quickMetric === 'mixed_banner'
                ? mixed.mixedBanner
                : quickMetric === 'alt_vocal'
                  ? extras.altVocals
                  : extras.stamps;
    const sorted = sortClocks(raw, sortMode);
    if (!quickQuery.trim()) return sorted;
    return sorted.filter((clock) =>
      matchesClockQuery(quickQuery, clock, {
        charById,
        cardById,
        eventById,
        musicById,
        stampById
      })
    );
  }, [
    quickMetric,
    sortMode,
    quickQuery,
    focus,
    cards,
    mixed,
    extras,
    charById,
    cardById,
    eventById,
    musicById,
    stampById
  ]);

  const heroPrimary = bannerState.activeEvent ?? bannerState.latestPastEvent;
  const heroPrimaryMode = bannerState.activeEvent ? 'live' : 'ended';
  const nextUpcoming = bannerState.upcomingEvents[0];

  return (
    <Stack gap="7">
      {/* 1. Live / Latest + Preloaded Upcoming JP Event Hero */}
      <Stack gap="3">
        {heroPrimary && (
          <HeroEventBanner
            event={heroPrimary}
            mode={heroPrimaryMode}
            preferTrained={preferTrained}
          />
        )}
        {nextUpcoming && (
          <HeroEventBanner event={nextUpcoming} mode="upcoming" preferTrained={preferTrained} />
        )}
      </Stack>

      {/* 2. Active All-Time Record Breakers Strip */}
      {recordBreakers.length > 0 && (
        <Stack
          style={{
            borderColor: 'rgba(244, 63, 94, 0.45)',
            background: 'rgba(244, 63, 94, 0.06)'
          }}
          gap="2.5"
          rounded="2xl"
          borderWidth="1px"
          p="4"
        >
          <HStack gap="1" justifyContent="space-between" flexWrap="wrap">
            <Text style={{ color: '#e11d48' }} fontSize="sm" fontWeight="extrabold">
              🔥 {t('overview.record_strip_title')}
            </Text>
            <Text color="fg.muted" fontSize="xs">
              {t('overview.record_strip_subtitle')}
            </Text>
          </HStack>
          <Wrap gap="2">
            {recordBreakers.map(({ label, clock }) => {
              const ch = clock.characterId ? charById.get(clock.characterId) : undefined;
              if (!ch) return null;
              return (
                <Link
                  className={css({
                    display: 'inline-flex',
                    gap: '2',
                    alignItems: 'center',
                    borderColor: 'border.default',
                    rounded: 'xl',
                    borderWidth: '1px',
                    py: '1.5',
                    px: '2.5',
                    bg: 'bg.default',
                    _hover: { transform: 'translateY(-1px)', textDecoration: 'none' }
                  })}
                  key={`${label}:${ch.id}`}
                  href={characterHref(ch.id)}
                >
                  <CharacterIcon characterId={ch.id} size={26} />
                  <Stack gap="0">
                    <span
                      className={css({ fontSize: 'xs', fontWeight: 'bold', lineHeight: 'tight' })}
                    >
                      {charDisplayName(ch, i18n.language, true)} ·{' '}
                      <span style={{ color: '#e11d48' }}>
                        {t('common.days', { count: clock.daysSince })}
                      </span>
                    </span>
                    <span className={css({ color: 'fg.muted', fontSize: '2xs' })}>
                      {label} ({t('common.max_gap', { days: clock.maxGapDays })})
                    </span>
                  </Stack>
                </Link>
              );
            })}
          </Wrap>
        </Stack>
      )}

      {/* 3. Six Headline "Most Overdue" Cutout Podiums */}
      <Stack gap="3">
        <Stack gap="0.5">
          <Text as="h2" fontSize="xl" fontWeight="extrabold">
            {t('overview.podium_title')}
          </Text>
          <Text color="fg.muted" fontSize="sm">
            {t('overview.podium_subtitle')}
          </Text>
        </Stack>

        <Grid gap="4" columns={{ base: 1, md: 2, xl: 3 }}>
          <PodiumCategoryCard
            title={t('clocks.solo_focus')}
            href={focusHref()}
            clocks={focus.characterFocus}
            preferTrained={preferTrained}
          />
          <PodiumCategoryCard
            title={t('clocks.lim_4star')}
            href={cardsHref()}
            clocks={cards.lim4Star}
            preferTrained={preferTrained}
          />
          <PodiumCategoryCard
            title={t('clocks.any_4star')}
            href={cardsHref()}
            clocks={cards.any4Star}
            preferTrained={preferTrained}
          />
          <PodiumCategoryCard
            title={t('clocks.vs_unit_4star')}
            href={virtualSingersHref()}
            clocks={vs.unitFocusVs4Star}
            preferTrained={preferTrained}
          />
          <PodiumCategoryCard
            title={t('clocks.mixed_banner')}
            href={mixedAttrsHref()}
            clocks={mixed.mixedBanner}
            preferTrained={preferTrained}
          />
          <PodiumCategoryCard
            title={t('clocks.alt_vocal')}
            href={extrasHref()}
            clocks={extras.altVocals}
            preferTrained={preferTrained}
          />
        </Grid>
      </Stack>

      {/* 4. @countdown_prsk Style All-Character Infographic Grid */}
      <Stack gap="3.5">
        <Flex
          gap="2"
          direction={{ base: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ base: 'flex-start', md: 'flex-end' }}
        >
          <Stack gap="0.5">
            <Text as="h2" fontSize="xl" fontWeight="extrabold">
              {t('overview.quick_grid_title')}
            </Text>
            <Text color="fg.muted" fontSize="sm">
              {t('overview.quick_grid_subtitle')}
            </Text>
          </Stack>

          <HStack gap="2" flexWrap="wrap">
            <InlineFilterInput value={quickQuery} onChange={setQuickQuery} maxW="240px" />
            <HStack gap="1" flexWrap="wrap">
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
          </HStack>
        </Flex>

        <Wrap gap="1.5">
          {(
            [
              ['focus', t('clocks.solo_focus')],
              ['lim4', t('clocks.lim_4star')],
              ['any4', t('clocks.any_4star')],
              ['perm4', t('clocks.perm_4star')],
              ['mixed_banner', t('clocks.mixed_banner')],
              ['alt_vocal', t('clocks.alt_vocal')],
              ['stamp', t('clocks.stamp')]
            ] as [QuickMetricKey, string][]
          ).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={quickMetric === key ? 'solid' : 'outline'}
              onClick={() => setQuickMetric(key)}
            >
              {label}
            </Button>
          ))}
        </Wrap>

        {quickClocks.length === 0 ? (
          <EmptyFilterState query={quickQuery} onClear={() => setQuickQuery('')} />
        ) : (
          <Grid gap="2.5" columns={{ base: 2, sm: 3, md: 4, lg: 5, xl: 6 }}>
            {quickClocks.map((clock, idx) => {
              const ch = clock.characterId ? charById.get(clock.characterId) : undefined;
              if (!ch) return null;
              const pal = SEVERITY_PALETTE[clock.severity];
              const card = clock.latest?.cardId ? cardById.get(clock.latest.cardId) : undefined;
              const music = clock.latest?.musicId ? musicById.get(clock.latest.musicId) : undefined;
              const stamp = clock.latest?.stampId ? stampById.get(clock.latest.stampId) : undefined;

              return (
                <Link
                  className={css({
                    display: 'flex',
                    position: 'relative',
                    gap: '2',
                    flexDirection: 'column',
                    rounded: 'xl',
                    borderWidth: '1px',
                    p: '2.5',
                    bg: 'bg.subtle',
                    transition: 'transform 0.12s ease',
                    _hover: { transform: 'translateY(-2px)', textDecoration: 'none' }
                  })}
                  key={ch.id}
                  href={characterHref(ch.id)}
                  style={{
                    borderColor:
                      clock.severity === 'record' || clock.severity === 'overdue'
                        ? pal.border
                        : undefined
                  }}
                >
                  <HStack justifyContent="space-between" alignItems="center">
                    <HStack gap="1.5" minW="0">
                      <CharacterIcon characterId={ch.id} size={26} />
                      <span
                        className={css({
                          fontSize: 'xs',
                          fontWeight: 'bold',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap'
                        })}
                      >
                        {charDisplayName(ch, i18n.language, true)}
                      </span>
                    </HStack>
                    <span
                      className={css({
                        color: 'fg.muted',
                        fontSize: '2xs',
                        fontVariantNumeric: 'tabular-nums'
                      })}
                    >
                      #{idx + 1}
                    </span>
                  </HStack>

                  <HStack gap="2.5" alignItems="center">
                    {stamp ? (
                      <StampTile stamp={stamp} size={46} />
                    ) : card ? (
                      <CardThumbTile card={card} preferTrained={preferTrained} size={46} />
                    ) : music ? (
                      <SongJacketTile music={music} size={46} />
                    ) : (
                      <Box flexShrink={0} rounded="lg" w="46px" h="46px" bg="bg.muted" />
                    )}

                    <Stack gap="0" minW="0">
                      <span
                        className={css({
                          fontSize: 'xl',
                          fontWeight: 'black',
                          fontVariantNumeric: 'tabular-nums',
                          lineHeight: '1.05'
                        })}
                        style={{ color: pal.text }}
                      >
                        {t('common.days', { count: clock.daysSince })}
                      </span>
                      <span
                        className={css({
                          color: 'fg.muted',
                          fontSize: '2xs',
                          fontVariantNumeric: 'tabular-nums'
                        })}
                      >
                        {clock.count > 0
                          ? formatDateShort(clock.lastTimestamp, i18n.language)
                          : t('common.never')}
                      </span>
                    </Stack>
                  </HStack>

                  <DroughtMeter clock={clock} compact />
                </Link>
              );
            })}
          </Grid>
        )}
      </Stack>
    </Stack>
  );
}
