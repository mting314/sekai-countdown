import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { css } from 'styled-system/css';
import { Box, Flex, Grid, HStack, Stack, Wrap } from 'styled-system/jsx';
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
  EventLogoImage,
  SongJacketTile,
  UnitBadge
} from '~/components/sekai/SekaiVisuals';
import { Link } from '~/components/ui/link';
import { Button } from '~/components/ui/styled/button';
import { Text } from '~/components/ui/text';
import { useCountdownData } from '~/context/CountdownDataContext';
import type { SekaiUnitId } from '~/types/countdown';
import { eventStoryBannerUrl } from '~/utils/countdown/assets';
import { MAIN_UNITS, UNIT_META } from '~/utils/countdown/constants';
import { charDisplayName, formatDateShort, SEVERITY_PALETTE } from '~/utils/countdown/format';
import { computeFocusMetrics } from '~/utils/countdown/metrics';
import { characterHref } from '~/utils/countdown/routes';

export function FocusRotationView() {
  const { t, i18n } = useTranslation();
  const { snapshot, now, preferTrained, charById, cardById, eventById, musicById } =
    useCountdownData();
  const [unitFilter, setUnitFilter] = useState<SekaiUnitId | 'all'>('all');
  const [hakolimOnly, setHakolimOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('days');

  const focus = useMemo(() => computeFocusMetrics(snapshot, now), [snapshot, now]);

  const unitClocksSorted = useMemo(
    () => sortClocks(hakolimOnly ? focus.unitHakolim : focus.unitFocus, 'days'),
    [focus, hakolimOnly]
  );

  const visibleUnits = useMemo(
    () => (unitFilter === 'all' ? MAIN_UNITS : MAIN_UNITS.filter((u) => u === unitFilter)),
    [unitFilter]
  );

  const leaderboardClocks = useMemo(() => {
    const base = hakolimOnly ? focus.characterHakolim : focus.characterFocus;
    const filtered = unitFilter === 'all' ? base : base.filter((c) => c.unitId === unitFilter);
    return sortClocks(filtered, sortMode);
  }, [focus, hakolimOnly, unitFilter, sortMode]);

  return (
    <Stack gap="7">
      <Stack gap="1">
        <Text as="h1" fontSize="2xl" fontWeight="extrabold">
          {t('focus.title')}
        </Text>
        <Text color="fg.muted" fontSize="sm">
          {t('focus.subtitle')}
        </Text>
      </Stack>

      {/* 1. 5-Unit Focus Pacing Strip */}
      <Stack gap="2.5">
        <Text as="h2" fontSize="lg" fontWeight="bold">
          {t('focus.unit_strip_title')}
        </Text>
        <Grid gap="3" columns={{ base: 1, sm: 2, lg: 5 }}>
          {unitClocksSorted.map((uClock) => {
            const unit = uClock.unitId!;
            const meta = UNIT_META[unit];
            const rot = focus.rotationByUnit[unit];
            const latestEv = uClock.latest?.eventId
              ? eventById.get(uClock.latest.eventId)
              : undefined;
            const banner = eventStoryBannerUrl(latestEv);
            const pal = SEVERITY_PALETTE[uClock.severity];

            return (
              <Box
                key={unit}
                onClick={() => setUnitFilter(unitFilter === unit ? 'all' : unit)}
                style={{
                  borderColor: unitFilter === unit ? meta.color : `${meta.color}55`
                }}
                cursor="pointer"
                position="relative"
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
                  <HStack justifyContent="space-between" alignItems="center">
                    <UnitBadge unit={unit} short />
                    <span
                      className={css({
                        fontSize: 'xl',
                        fontWeight: 'black',
                        fontVariantNumeric: 'tabular-nums'
                      })}
                      style={{ color: pal.text }}
                    >
                      {t('common.days', { count: uClock.daysSince })}
                    </span>
                  </HStack>

                  <HStack justifyContent="space-between" color="fg.muted" fontSize="2xs">
                    <span>
                      {uClock.eventsSince !== undefined
                        ? t('common.events_ago', { count: uClock.eventsSince })
                        : ''}
                    </span>
                    <span>{latestEv?.nickname ?? ''}</span>
                  </HStack>

                  <DroughtMeter clock={uClock} compact />

                  {rot.waitingCharacterIds.length > 0 && (
                    <HStack gap="1" alignItems="center" pt="0.5" flexWrap="wrap">
                      <span className={css({ color: 'fg.muted', fontSize: '2xs' })}>
                        Due #{rot.maxCycle}:
                      </span>
                      {rot.waitingCharacterIds.map((cid) => (
                        <CharacterIcon key={cid} characterId={cid} size={20} />
                      ))}
                    </HStack>
                  )}
                </Stack>
              </Box>
            );
          })}
        </Grid>
      </Stack>

      {/* Filter & Mode Controls */}
      <FilterAndSortBar
        unitFilter={unitFilter}
        onUnitFilterChange={setUnitFilter}
        includeVirtualSingers={false}
        sortMode={sortMode}
        onSortModeChange={setSortMode}
        extraControls={
          <HStack gap="1">
            <Button
              size="xs"
              variant={!hakolimOnly ? 'solid' : 'outline'}
              onClick={() => setHakolimOnly(false)}
            >
              {t('focus.mode_all')}
            </Button>
            <Button
              size="xs"
              variant={hakolimOnly ? 'solid' : 'outline'}
              onClick={() => setHakolimOnly(true)}
            >
              {t('focus.mode_hakolim')}
            </Button>
          </HStack>
        }
      />

      {/* 2. Per-Unit Rotation Cycle Matrix & Rotation Jumps */}
      <Stack gap="4">
        <Stack gap="0.5">
          <Text as="h2" fontSize="lg" fontWeight="bold">
            {t('focus.rotation_matrix_title')}
          </Text>
          <Text color="fg.muted" fontSize="xs">
            {t('focus.rotation_matrix_subtitle')}
          </Text>
        </Stack>

        {visibleUnits.map((unit) => {
          const rot = focus.rotationByUnit[unit];
          const meta = UNIT_META[unit];
          return (
            <Box
              key={unit}
              borderColor="border.default"
              rounded="2xl"
              borderWidth="1px"
              p={{ base: '3', md: '4' }}
              bg="bg.subtle"
            >
              <Stack gap="3">
                <Flex
                  gap="2"
                  direction={{ base: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  alignItems={{ base: 'flex-start', sm: 'center' }}
                >
                  <HStack gap="2.5" flexWrap="wrap">
                    <UnitBadge unit={unit} />
                    <span className={css({ color: 'fg.muted', fontSize: 'xs' })}>
                      Cycle{' '}
                      {rot.minCycle === rot.maxCycle
                        ? rot.maxCycle
                        : `${rot.minCycle} → ${rot.maxCycle}`}
                    </span>
                  </HStack>

                  {rot.waitingCharacterIds.length > 0 && (
                    <HStack gap="1.5" flexWrap="wrap">
                      <span
                        className={css({
                          color: '#f59e0b',
                          fontSize: 'xs',
                          fontWeight: 'semibold'
                        })}
                      >
                        Waiting on #{rot.maxCycle}:
                      </span>
                      {rot.waitingCharacterIds.map((cid) => {
                        const ch = charById.get(cid);
                        if (!ch) return null;
                        return (
                          <Link
                            className={css({
                              display: 'inline-flex',
                              gap: '1',
                              alignItems: 'center',
                              rounded: 'full',
                              py: '0.5',
                              px: '2',
                              fontSize: 'xs',
                              fontWeight: 'bold',
                              bg: 'bg.default'
                            })}
                            key={cid}
                            href={characterHref(cid)}
                            style={{ border: `1px solid ${ch.color}` }}
                          >
                            <CharacterIcon characterId={cid} size={18} />
                            {charDisplayName(ch, i18n.language, true)}
                          </Link>
                        );
                      })}
                    </HStack>
                  )}
                </Flex>

                {/* Scrollable Cycle Grid */}
                <Box pb="1" overflowX="auto">
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
                            minW: '135px',
                            color: 'fg.muted',
                            fontSize: 'xs',
                            textAlign: 'left'
                          })}
                        >
                          Member
                        </th>
                        {rot.rows[0]?.cells.map((cell) => (
                          <th
                            key={cell.cycle}
                            className={css({
                              minW: '112px',
                              color: 'fg.muted',
                              fontSize: 'xs',
                              fontWeight: 'bold',
                              textAlign: 'center'
                            })}
                          >
                            Focus #{cell.cycle}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rot.rows.map((row) => {
                        const isWaitingInCycle = rot.waitingCharacterIds.includes(row.character.id);
                        const pal = SEVERITY_PALETTE[row.clock.severity];
                        return (
                          <tr key={row.character.id}>
                            <td className={css({ pr: '2', verticalAlign: 'middle' })}>
                              <Link
                                className={css({
                                  display: 'flex',
                                  gap: '2',
                                  alignItems: 'center',
                                  _hover: { textDecoration: 'none', opacity: 0.85 }
                                })}
                                href={characterHref(row.character.id)}
                              >
                                <CharacterIcon characterId={row.character.id} size={32} />
                                <Stack gap="0">
                                  <span className={css({ fontSize: 'xs', fontWeight: 'bold' })}>
                                    {charDisplayName(row.character, i18n.language, true)}
                                  </span>
                                  <span
                                    className={css({
                                      fontSize: '2xs',
                                      fontWeight: 'bold',
                                      fontVariantNumeric: 'tabular-nums'
                                    })}
                                    style={{ color: pal.text }}
                                  >
                                    {t('common.days', { count: row.clock.daysSince })}
                                  </span>
                                </Stack>
                              </Link>
                            </td>

                            {row.cells.map((cell) => {
                              if (!cell.event) {
                                return (
                                  <td key={cell.cycle}>
                                    <Box
                                      style={{
                                        border: `1.5px dashed ${isWaitingInCycle ? row.character.color : 'rgba(148,163,184,0.35)'}`,
                                        background: isWaitingInCycle
                                          ? `${row.character.color}14`
                                          : 'transparent'
                                      }}
                                      display="flex"
                                      flexDirection="column"
                                      justifyContent="center"
                                      alignItems="center"
                                      rounded="xl"
                                      minH="74px"
                                      p="2"
                                      textAlign="center"
                                    >
                                      <span
                                        className={css({ fontSize: '2xs', fontWeight: 'bold' })}
                                      >
                                        {t('focus.waiting_slot', { cycle: cell.cycle })}
                                      </span>
                                      <span
                                        className={css({
                                          fontSize: 'xs',
                                          fontWeight: 'extrabold',
                                          fontVariantNumeric: 'tabular-nums'
                                        })}
                                        style={{ color: pal.text }}
                                      >
                                        {t('common.days', { count: row.clock.daysSince })}
                                      </span>
                                    </Box>
                                  </td>
                                );
                              }

                              const skippedNames = cell.queueJumpedIds
                                .map((id) => charById.get(id))
                                .filter(Boolean)
                                .map((c) => charDisplayName(c!, i18n.language, true))
                                .join(', ');

                              return (
                                <td key={cell.cycle}>
                                  <Box
                                    style={{
                                      borderColor: cell.isCycleJump
                                        ? '#f43f5e'
                                        : cell.event.isHakolim
                                          ? '#f59e0b'
                                          : `${meta.color}44`
                                    }}
                                    rounded="xl"
                                    borderWidth="1px"
                                    minH="74px"
                                    p="2"
                                    bg="bg.default"
                                  >
                                    <HStack gap="2" alignItems="center">
                                      {cell.focusCard ? (
                                        <CardThumbTile
                                          card={cell.focusCard}
                                          preferTrained={preferTrained}
                                          size={42}
                                          showSupply={false}
                                        />
                                      ) : cell.song ? (
                                        <SongJacketTile music={cell.song} size={42} />
                                      ) : null}

                                      <Stack gap="0.5" minW="0">
                                        <HStack gap="1" flexWrap="wrap">
                                          <span
                                            className={css({
                                              fontSize: 'xs',
                                              fontWeight: 'extrabold'
                                            })}
                                          >
                                            {cell.event.nickname}
                                          </span>
                                          {cell.event.isHakolim && (
                                            <span
                                              className={css({
                                                rounded: 'sm',
                                                px: '1',
                                                fontSize: '9px',
                                                fontWeight: 'bold'
                                              })}
                                              style={{ background: '#f59e0b', color: '#1e1b4b' }}
                                            >
                                              Lim
                                            </span>
                                          )}
                                        </HStack>

                                        <span
                                          className={css({
                                            color: 'fg.muted',
                                            fontSize: '10px',
                                            fontVariantNumeric: 'tabular-nums'
                                          })}
                                        >
                                          {formatDateShort(cell.event.startAt, i18n.language)}
                                        </span>

                                        {cell.isCycleJump ? (
                                          <span
                                            className={css({
                                              rounded: 'sm',
                                              w: 'fit-content',
                                              px: '1',
                                              fontSize: '9px',
                                              fontWeight: 'bold'
                                            })}
                                            style={{ background: '#f43f5e', color: '#ffffff' }}
                                          >
                                            ⚡ {t('focus.cycle_jump_badge')}
                                          </span>
                                        ) : cell.queueJumpedIds.length > 0 ? (
                                          <span
                                            title={`Ahead of ${skippedNames}`}
                                            className={css({
                                              rounded: 'sm',
                                              w: 'fit-content',
                                              px: '1',
                                              fontSize: '9px',
                                              fontWeight: 'semibold'
                                            })}
                                            style={{
                                              background: 'rgba(249, 115, 22, 0.18)',
                                              color: '#ea580c'
                                            }}
                                          >
                                            ↗ {t('focus.queue_jump_badge')}
                                          </span>
                                        ) : null}
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

                {/* Recent Jump Notes */}
                {rot.recentJumps.length > 0 && (
                  <Wrap gap="1.5" pt="1">
                    {rot.recentJumps.slice(0, 4).map((j) => {
                      const jumper = charById.get(j.characterId);
                      const skipped = j.skippedCharacterIds
                        .map((id) => charById.get(id))
                        .filter(Boolean)
                        .map((c) => charDisplayName(c!, i18n.language, true))
                        .join(', ');
                      if (!jumper) return null;
                      return (
                        <HStack
                          key={j.event.id}
                          gap="1.5"
                          rounded="lg"
                          py="1"
                          px="2.5"
                          color="fg.muted"
                          fontSize="2xs"
                          bg="bg.default"
                        >
                          <EventLogoImage assetbundleName={j.event.assetbundleName} height={18} />
                          <span>
                            <strong>{j.event.nickname}</strong> (
                            {charDisplayName(jumper, i18n.language, true)}) went ahead of{' '}
                            <strong>{skipped}</strong>
                          </span>
                        </HStack>
                      );
                    })}
                  </Wrap>
                )}
              </Stack>
            </Box>
          );
        })}
      </Stack>

      {/* 3. 20-Character Solo Focus Leaderboard */}
      <Stack gap="3">
        <Text as="h2" fontSize="lg" fontWeight="bold">
          {t('focus.leaderboard_title')}
        </Text>
        <Stack gap="2.5">
          {leaderboardClocks.map((clock, idx) => {
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
              />
            );
          })}
        </Stack>
      </Stack>
    </Stack>
  );
}
