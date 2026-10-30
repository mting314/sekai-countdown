import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { css } from 'styled-system/css';
import { Box, Flex, HStack, Stack, Wrap } from 'styled-system/jsx';
import { InlineFilterInput } from '~/components/search/InlineFilterInput';
import { Link } from '~/components/ui/link';
import { Button } from '~/components/ui/styled/button';
import { Text } from '~/components/ui/text';
import type {
  CompactCard,
  CompactEvent,
  CompactMusic,
  CompactStamp,
  CountdownCharacter,
  DroughtClock,
  SekaiUnitId
} from '~/types/countdown';
import { cardArtUrl, eventStoryBannerUrl, unitIconUrl } from '~/utils/countdown/assets';
import { ALL_UNITS, UNIT_META } from '~/utils/countdown/constants';
import {
  charDisplayName,
  formatDateShort,
  localizedTitle,
  SEVERITY_PALETTE
} from '~/utils/countdown/format';
import { characterHref } from '~/utils/countdown/routes';
import {
  CardThumbTile,
  CharacterIcon,
  EventLogoImage,
  SongJacketTile,
  StampTile
} from './SekaiVisuals';

export type SortMode = 'days' | 'overdue' | 'character';

export function SeverityPill({ clock }: { clock: DroughtClock }) {
  const { t, i18n } = useTranslation();
  const isJa = i18n.language.startsWith('ja');
  const pal = SEVERITY_PALETTE[clock.severity];

  return (
    <HStack gap="1" flexWrap="wrap">
      {clock.upcoming && (
        <span
          className={css({
            rounded: 'full',
            py: '0.5',
            px: '1.5',
            fontSize: '2xs',
            fontWeight: 'bold',
            letterSpacing: 'wide',
            textTransform: 'uppercase'
          })}
          style={{ background: '#22c55e', color: '#052e16' }}
        >
          {t('common.upcoming_reset')}
        </span>
      )}
      {clock.isRecordWait ? (
        <span
          className={css({
            rounded: 'full',
            py: '0.5',
            px: '2',
            fontSize: '2xs',
            fontWeight: 'extrabold',
            letterSpacing: 'wider',
            textTransform: 'uppercase'
          })}
          style={{
            background: '#f43f5e',
            color: '#ffffff'
          }}
        >
          {t('common.record_wait')}
        </span>
      ) : (
        <span
          className={css({
            rounded: 'full',
            py: '0.5',
            px: '2',
            fontSize: '2xs',
            fontWeight: 'bold'
          })}
          style={{
            background: pal.bg,
            border: `1px solid ${pal.border}`,
            color: pal.text
          }}
        >
          {isJa ? pal.labelJa : pal.labelEn}
        </span>
      )}
    </HStack>
  );
}

/**
 * Progress meter showing current `daysSince` relative to historical `avgGapDays` and `maxGapDays`.
 */
export function DroughtMeter({
  clock,
  compact = false
}: {
  clock: DroughtClock;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const pal = SEVERITY_PALETTE[clock.severity];
  const scaleMax = Math.max(clock.daysSince, clock.maxGapDays, clock.avgGapDays * 1.6, 30) * 1.08;
  const fillPct = Math.min(100, Math.max(3, (clock.daysSince / scaleMax) * 100));
  const avgPct = Math.min(98, (clock.avgGapDays / scaleMax) * 100);
  const maxPct = Math.min(99, (clock.maxGapDays / scaleMax) * 100);

  return (
    <Stack gap="1" w="full">
      <Box
        style={{ height: compact ? 6 : 10 }}
        position="relative"
        rounded="full"
        w="full"
        bg="bg.muted"
        overflow="hidden"
      >
        <Box
          style={{
            width: `${fillPct}%`,
            background: pal.bar,
            transition: 'width 0.25s ease'
          }}
          rounded="full"
          h="full"
        />
        {/* Historical average tick */}
        <Box
          title={t('common.avg_gap', { days: clock.avgGapDays })}
          style={{
            left: `${avgPct}%`,
            background: 'rgba(148, 163, 184, 0.85)'
          }}
          position="absolute"
          top="0"
          bottom="0"
          w="2px"
        />
        {/* Historical max tick */}
        {clock.count >= 2 && (
          <Box
            title={t('common.max_gap', { days: clock.maxGapDays })}
            style={{
              left: `${maxPct}%`,
              background: 'rgba(244, 63, 94, 0.85)'
            }}
            position="absolute"
            top="0"
            bottom="0"
            w="2px"
          />
        )}
      </Box>
      {!compact && (
        <HStack
          justifyContent="space-between"
          color="fg.muted"
          fontSize="xs"
          fontWeight="medium"
          flexWrap="wrap"
        >
          <span className={css({ fontVariantNumeric: 'tabular-nums' })}>
            {t('common.avg_gap', { days: clock.avgGapDays })} · {clock.overdueRatio.toFixed(2)}×
          </span>
          <span className={css({ fontVariantNumeric: 'tabular-nums' })}>
            {clock.count > 0
              ? `${t('common.max_gap', { days: clock.maxGapDays })} · ${t('common.total_count', { count: clock.count })}`
              : t('common.never')}
          </span>
        </HStack>
      )}
    </Stack>
  );
}

/**
 * Rich visual leaderboard card combining faded Sekai card/event wide artwork,
 * character icon, square card/jacket/stamp thumbnail, event logo, and DroughtMeter.
 */
export function DroughtLeaderboardRow({
  rank,
  character,
  clock,
  card,
  event,
  music,
  stamp,
  preferTrained,
  extraBadge
}: {
  rank: number;
  character: CountdownCharacter;
  clock: DroughtClock;
  card?: CompactCard;
  event?: CompactEvent;
  music?: CompactMusic;
  stamp?: CompactStamp;
  preferTrained: boolean;
  extraBadge?: React.ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const [hideBackdrop, setHideBackdrop] = useState(false);

  const backdropUrl = hideBackdrop
    ? undefined
    : eventStoryBannerUrl(event) || cardArtUrl(card, preferTrained);
  const pal = SEVERITY_PALETTE[clock.severity];
  const latestLabel = clock.latest
    ? localizedTitle(clock.latest.labelJa, clock.latest.labelEn, locale)
    : t('common.never');

  return (
    <Box
      style={{
        borderColor:
          clock.severity === 'record' || clock.severity === 'overdue' ? pal.border : undefined
      }}
      position="relative"
      rounded="xl"
      borderWidth="1px"
      bg="bg.subtle"
      overflow="hidden"
    >
      {backdropUrl && (
        <img
          src={backdropUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setHideBackdrop(true)}
          className={css({
            position: 'absolute',
            top: '0',
            right: '0',
            objectFit: 'cover',
            w: { base: '55%', md: '44%' },
            h: 'full',
            opacity: { base: 0.16, _dark: 0.24 },
            pointerEvents: 'none'
          })}
        />
      )}
      <Box
        className={css({
          bgGradient: 'to-r',
          gradientFrom: 'bg.subtle',
          gradientVia: 'bg.subtle/90',
          gradientTo: 'transparent'
        })}
        inset="0"
        position="absolute"
        pointerEvents="none"
      />

      <Flex
        position="relative"
        gap={{ base: '2.5', md: '4' }}
        alignItems="center"
        p={{ base: '3', md: '3.5' }}
        flexWrap={{ base: 'wrap', md: 'nowrap' }}
      >
        {/* Left: Rank + Character + Latest Thumbnail */}
        <HStack gap="2.5" flexShrink={0} minW={{ base: 'auto', md: '220px' }}>
          <span
            className={css({
              w: '7',
              color: 'fg.muted',
              fontSize: 'sm',
              fontWeight: 'bold',
              fontVariantNumeric: 'tabular-nums',
              textAlign: 'center'
            })}
          >
            #{rank}
          </span>

          <Link
            className={css({
              display: 'flex',
              gap: '2.5',
              alignItems: 'center',
              _hover: { textDecoration: 'none', opacity: 0.88 }
            })}
            href={characterHref(character.id)}
          >
            <CharacterIcon characterId={character.id} size={40} />
            <Stack gap="0">
              <span className={css({ fontSize: 'sm', fontWeight: 'bold', lineHeight: 'tight' })}>
                {charDisplayName(character, locale)}
              </span>
              <span className={css({ color: 'fg.muted', fontSize: '2xs' })}>
                {UNIT_META[character.unit].shortEn}
              </span>
            </Stack>
          </Link>
        </HStack>

        {/* Middle: Latest Asset + Event/Card Metadata + Meter */}
        <HStack flex="1" gap="3" minW={{ base: '100%', md: '260px' }} order={{ base: 3, md: 2 }}>
          {stamp ? (
            <StampTile stamp={stamp} size={52} />
          ) : card ? (
            <CardThumbTile card={card} preferTrained={preferTrained} size={54} />
          ) : music ? (
            <SongJacketTile music={music} size={52} />
          ) : null}

          <Stack flex="1" gap="1" minW="0">
            <HStack gap="2" alignItems="center" flexWrap="wrap">
              {event?.nickname && (
                <span
                  className={css({
                    rounded: 'md',
                    py: '0.5',
                    px: '1.5',
                    fontSize: '2xs',
                    fontWeight: 'bold',
                    bg: 'bg.muted'
                  })}
                >
                  {event.nickname}
                </span>
              )}
              <Text
                className={css({
                  maxW: { base: '210px', sm: '320px', lg: '420px' },
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap'
                })}
                fontSize="xs"
                fontWeight="semibold"
              >
                {latestLabel}
              </Text>
              <span
                className={css({
                  color: 'fg.muted',
                  fontSize: '2xs',
                  fontVariantNumeric: 'tabular-nums'
                })}
              >
                {formatDateShort(clock.lastTimestamp, locale)}
              </span>
              {extraBadge}
            </HStack>
            <DroughtMeter clock={clock} />
          </Stack>

          {event?.assetbundleName && (
            <Box hideBelow="lg" flexShrink={0}>
              <EventLogoImage assetbundleName={event.assetbundleName} height={34} />
            </Box>
          )}
        </HStack>

        {/* Right: Days Counter + Severity */}
        <Stack
          gap="0.5"
          flexShrink={0}
          justifyContent="center"
          alignItems="flex-end"
          ml="auto"
          order={{ base: 2, md: 3 }}
        >
          <HStack gap="1.5" alignItems="baseline">
            <span
              className={css({
                fontSize: { base: 'xl', md: '2xl' },
                fontWeight: 'extrabold',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: '1'
              })}
              style={{ color: pal.text }}
            >
              {t('common.days', { count: clock.daysSince })}
            </span>
          </HStack>
          {clock.eventsSince !== undefined && (
            <span
              className={css({
                color: 'fg.muted',
                fontSize: '2xs',
                fontVariantNumeric: 'tabular-nums'
              })}
            >
              {t('common.events_ago', { count: clock.eventsSince })}
            </span>
          )}
          <SeverityPill clock={clock} />
        </Stack>
      </Flex>
    </Box>
  );
}

export function FilterAndSortBar({
  unitFilter,
  onUnitFilterChange,
  includeVirtualSingers = true,
  sortMode,
  onSortModeChange,
  searchQuery,
  onSearchQueryChange,
  searchPlaceholder,
  extraControls
}: {
  unitFilter: SekaiUnitId | 'all';
  onUnitFilterChange: (next: SekaiUnitId | 'all') => void;
  includeVirtualSingers?: boolean;
  sortMode?: SortMode;
  onSortModeChange?: (next: SortMode) => void;
  searchQuery?: string;
  onSearchQueryChange?: (next: string) => void;
  searchPlaceholder?: string;
  extraControls?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const units = includeVirtualSingers ? ALL_UNITS : ALL_UNITS.filter((u) => u !== 'virtual_singer');

  return (
    <Flex
      gap="3"
      direction={{ base: 'column', md: 'row' }}
      justifyContent="space-between"
      alignItems={{ base: 'stretch', md: 'center' }}
      flexWrap="wrap"
    >
      <Wrap gap="1.5" alignItems="center">
        <Button
          size="xs"
          variant={unitFilter === 'all' ? 'solid' : 'outline'}
          onClick={() => onUnitFilterChange('all')}
        >
          {t('common.all_units')}
        </Button>
        {units.map((u) => {
          const active = unitFilter === u;
          const meta = UNIT_META[u];
          return (
            <Button
              key={u}
              size="xs"
              variant={active ? 'solid' : 'outline'}
              onClick={() => onUnitFilterChange(active ? 'all' : u)}
              style={
                active
                  ? undefined
                  : {
                      borderColor: `${meta.color}66`
                    }
              }
            >
              <img src={unitIconUrl(u)} alt="" width={14} height={14} loading="lazy" />
              {meta.shortEn}
            </Button>
          );
        })}
      </Wrap>

      <Wrap gap="2" alignItems="center">
        {searchQuery !== undefined && onSearchQueryChange && (
          <InlineFilterInput
            value={searchQuery}
            onChange={onSearchQueryChange}
            placeholder={searchPlaceholder}
            maxW="250px"
          />
        )}
        {extraControls}
        {sortMode && onSortModeChange && (
          <HStack gap="1">
            {(['days', 'overdue', 'character'] as SortMode[]).map((mode) => (
              <Button
                key={mode}
                size="xs"
                variant={sortMode === mode ? 'solid' : 'subtle'}
                onClick={() => onSortModeChange(mode)}
              >
                {t(`common.sort_${mode}`)}
              </Button>
            ))}
          </HStack>
        )}
      </Wrap>
    </Flex>
  );
}

export function sortClocks(clocks: DroughtClock[], mode: SortMode): DroughtClock[] {
  return clocks.toSorted((a, b) => {
    if (mode === 'character') {
      return Number(a.characterId ?? a.entityId) - Number(b.characterId ?? b.entityId);
    }
    if (mode === 'overdue') {
      return b.overdueRatio - a.overdueRatio || b.daysSince - a.daysSince;
    }
    return b.daysSince - a.daysSince || b.overdueRatio - a.overdueRatio;
  });
}
