import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BiChevronLeft, BiChevronRight, BiLinkExternal } from 'react-icons/bi';
import { css } from 'styled-system/css';
import { Box, Flex, Grid, HStack, Stack, Wrap } from 'styled-system/jsx';
import { SeverityPill } from '~/components/sekai/DroughtVisuals';
import {
  CardThumbTile,
  CharacterIcon,
  SongJacketTile,
  UnitBadge
} from '~/components/sekai/SekaiVisuals';
import { Link } from '~/components/ui/link';
import { Text } from '~/components/ui/text';
import { useCountdownData } from '~/context/CountdownDataContext';
import { eventBgUrl, eventLogoUrl, eventStoryBannerUrl } from '~/utils/countdown/assets';
import { computeEventDossier } from '~/utils/countdown/drought-break';
import {
  charDisplayName,
  formatDateShort,
  localizedTitle,
  SEVERITY_PALETTE
} from '~/utils/countdown/format';
import { cardHref, characterHref, eventHref, homeHref } from '~/utils/countdown/routes';

export function EventDossierView({ eventId }: { eventId: number }) {
  const { t, i18n } = useTranslation();
  const { snapshot, now, preferTrained, charById } = useCountdownData();

  const dossier = useMemo(
    () => computeEventDossier(snapshot, eventId, now),
    [snapshot, eventId, now]
  );

  if (!dossier) {
    return (
      <Stack gap="4" alignItems="center" py="12">
        <Text>{t('error_page.not_found')}</Text>
        <Link href={homeHref()}>{t('error_page.home')}</Link>
      </Stack>
    );
  }

  const {
    event,
    status,
    daysDelta,
    focusCharacter,
    bannerCharacter,
    song,
    altVocalCharacterIds,
    prevEvent,
    nextEvent,
    rotationContext,
    eventBreaks,
    duoBreaks,
    lineupCards
  } = dossier;

  const leadChar = focusCharacter ?? bannerCharacter;
  const leadColor = leadChar?.color ?? '#ff6090';
  const bannerUrl = eventBgUrl(event.assetbundleName) ?? eventStoryBannerUrl(event);
  const logoUrl = eventLogoUrl(event.assetbundleName);

  return (
    <Stack gap="7">
      {/* 1. Event Hero Header with Full-Bleed Artwork */}
      <Box
        style={{
          borderColor: `${leadColor}88`,
          background: `radial-gradient(circle at 18% 45%, ${leadColor}28, transparent 65%)`
        }}
        position="relative"
        rounded="2xl"
        borderWidth="1px"
        bg="bg.subtle"
        overflow="hidden"
      >
        {/* Full-bleed banner background */}
        {bannerUrl && (
          <>
            <Box
              position="absolute"
              top="0"
              right="0"
              bottom="0"
              w={{ base: '100%', sm: '76%', md: '68%' }}
              opacity={{ base: 0.38, sm: 0.95 }}
              pointerEvents="none"
            >
              <img
                src={bannerUrl}
                alt=""
                referrerPolicy="no-referrer"
                style={{
                  maskImage:
                    'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.06) 14%, rgba(0,0,0,0.28) 30%, rgba(0,0,0,0.66) 50%, rgba(0,0,0,0.92) 70%, rgba(0,0,0,1) 88%)',
                  WebkitMaskImage:
                    'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.06) 14%, rgba(0,0,0,0.28) 30%, rgba(0,0,0,0.66) 50%, rgba(0,0,0,0.92) 70%, rgba(0,0,0,1) 88%)'
                }}
                className={css({
                  objectPosition: 'center 20%',
                  objectFit: 'cover',
                  w: 'full',
                  h: 'full'
                })}
              />
            </Box>
            <Box
              className={css({
                bgGradient: 'to-r',
                gradientFrom: 'bg.subtle',
                gradientVia: 'bg.subtle/82',
                gradientTo: 'transparent'
              })}
              position="absolute"
              top="0"
              left="0"
              bottom="0"
              w={{ base: '85%', sm: '52%', md: '46%' }}
              pointerEvents="none"
            />
          </>
        )}

        <Stack
          position="relative"
          gap="4"
          maxW={{ base: '100%', sm: '65%', md: '58%' }}
          p={{ base: '5', md: '7' }}
        >
          {/* Top Badges */}
          <Wrap gap="2" alignItems="center">
            <UnitBadge unit={event.unit} />
            {event.nickname && (
              <span
                className={css({
                  rounded: 'md',
                  borderWidth: '1px',
                  py: '0.5',
                  px: '2',
                  fontSize: 'xs',
                  fontWeight: 'black'
                })}
                style={{
                  borderColor: `${leadColor}99`,
                  color: leadColor,
                  backgroundColor: `${leadColor}22`
                }}
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
                bg: 'bg.muted'
              })}
            >
              Event #{event.id}
            </span>
            {event.isHakolim && (
              <span
                className={css({
                  borderColor: 'purple.500/50',
                  rounded: 'full',
                  borderWidth: '1px',
                  py: '0.5',
                  px: '2.5',
                  color: 'purple.200',
                  fontSize: '2xs',
                  fontWeight: 'extrabold',
                  bg: 'purple.900/40'
                })}
              >
                Hakolim (箱限定)
              </span>
            )}
            {status === 'live' && (
              <span
                className={css({
                  rounded: 'full',
                  py: '0.5',
                  px: '2.5',
                  color: 'black',
                  fontSize: '2xs',
                  fontWeight: 'extrabold',
                  bg: 'emerald.500'
                })}
              >
                ● {t('search.live_now')}
              </span>
            )}
          </Wrap>

          {/* Logo & Event Title */}
          <HStack gap="3.5" alignItems="center">
            {logoUrl && (
              <img
                src={logoUrl}
                alt=""
                referrerPolicy="no-referrer"
                className={css({
                  flexShrink: 0,
                  objectFit: 'contain',
                  w: 'auto',
                  h: { base: '42px', sm: '56px' }
                })}
              />
            )}
            <Stack gap="0">
              <Text
                as="h1"
                fontSize={{ base: 'xl', md: '2xl' }}
                fontWeight="black"
                lineHeight="1.2"
              >
                {localizedTitle(event.nameJa, event.nameEn, i18n.language)}
              </Text>
              <Text color="fg.muted" fontSize="sm">
                {i18n.language.startsWith('ja') ? event.nameEn : event.nameJa}
              </Text>
            </Stack>
          </HStack>

          {/* Dates & Status */}
          <HStack gap="2" color="fg.muted" fontSize="xs" flexWrap="wrap">
            <span>
              {formatDateShort(event.startAt, i18n.language)} –{' '}
              {formatDateShort(event.aggregateAt, i18n.language)}
            </span>
            <span>·</span>
            <span>
              {status === 'live'
                ? t('search.live_now')
                : status === 'upcoming'
                  ? t('search.in_days', { count: daysDelta })
                  : t('search.days_ago', { count: daysDelta })}
            </span>
          </HStack>

          {/* External Links */}
          <HStack gap="2" pt="0.5" flexWrap="wrap">
            <a
              href={`https://sekai.best/event/${event.id}`}
              target="_blank"
              rel="noreferrer"
              className={css({
                display: 'inline-flex',
                gap: '1',
                alignItems: 'center',
                borderColor: 'border.default',
                rounded: 'lg',
                borderWidth: '1px',
                py: '1.2',
                px: '2.5',
                fontSize: 'xs',
                fontWeight: 'bold',
                bg: 'bg.default/80',
                _hover: { textDecoration: 'none', bg: 'bg.muted' }
              })}
              title="View on Sekai Viewer (sekai.best)"
            >
              <BiLinkExternal size={14} />
              <span>sekai.best</span>
            </a>
          </HStack>

          {/* Prev / Next Event Switcher */}
          <Flex
            gap="2"
            justifyContent="space-between"
            borderColor="border.subtle"
            borderTopWidth="1px"
            pt="2"
          >
            {prevEvent ? (
              <Link
                className={css({
                  display: 'inline-flex',
                  gap: '1',
                  alignItems: 'center',
                  color: 'fg.muted',
                  fontSize: 'xs',
                  _hover: { color: 'fg.default', textDecoration: 'underline' }
                })}
                href={eventHref(prevEvent.id)}
              >
                <BiChevronLeft size={16} />
                <span>{t('event_page.prev_event')}:</span>
                <span
                  className={css({
                    maxW: '160px',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap'
                  })}
                >
                  {prevEvent.nickname ? `[${prevEvent.nickname}] ` : ''}
                  {localizedTitle(prevEvent.nameJa, prevEvent.nameEn, i18n.language)}
                </span>
              </Link>
            ) : (
              <span />
            )}

            {nextEvent ? (
              <Link
                className={css({
                  display: 'inline-flex',
                  gap: '1',
                  alignItems: 'center',
                  color: 'fg.muted',
                  fontSize: 'xs',
                  _hover: { color: 'fg.default', textDecoration: 'underline' }
                })}
                href={eventHref(nextEvent.id)}
              >
                <span>{t('event_page.next_event')}:</span>
                <span
                  className={css({
                    maxW: '160px',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap'
                  })}
                >
                  {nextEvent.nickname ? `[${nextEvent.nickname}] ` : ''}
                  {localizedTitle(nextEvent.nameJa, nextEvent.nameEn, i18n.language)}
                </span>
                <BiChevronRight size={16} />
              </Link>
            ) : (
              <span className={css({ color: 'fg.muted', fontSize: '2xs', fontStyle: 'italic' })}>
                {t('card_page.still_latest', { count: daysDelta })}
              </span>
            )}
          </Flex>
        </Stack>
      </Box>

      {/* 2. Focus Rotation Context & Cycle Jump Status */}
      {rotationContext && (
        <Box
          style={{
            borderColor: rotationContext.isCycleJump
              ? '#f59e0b88'
              : rotationContext.queueSkippedIds.length > 0
                ? '#8b5cf688'
                : undefined
          }}
          rounded="xl"
          borderWidth="1px"
          p="4"
          bg="bg.subtle"
        >
          <Stack gap="3">
            <HStack justifyContent="space-between" alignItems="center" flexWrap="wrap">
              <HStack gap="2">
                <span
                  className={css({
                    borderColor: 'border.default',
                    rounded: 'full',
                    borderWidth: '1px',
                    py: '0.5',
                    px: '2.5',
                    fontSize: 'xs',
                    fontWeight: 'black',
                    bg: 'bg.default'
                  })}
                >
                  {t('event_page.cycle_label', { cycle: rotationContext.cycle })}
                </span>
                <Text as="h2" fontSize="base" fontWeight="extrabold">
                  {t('event_page.rotation_context')}
                </Text>
              </HStack>

              {rotationContext.isCycleJump ? (
                <span
                  className={css({
                    borderColor: 'amber.500/60',
                    rounded: 'full',
                    borderWidth: '1px',
                    py: '0.5',
                    px: '2.5',
                    color: 'amber.200',
                    fontSize: 'xs',
                    fontWeight: 'black',
                    bg: 'amber.900/40'
                  })}
                >
                  ⚡ Cycle Jump
                </span>
              ) : rotationContext.queueSkippedIds.length > 0 ? (
                <span
                  className={css({
                    borderColor: 'violet.500/60',
                    rounded: 'full',
                    borderWidth: '1px',
                    py: '0.5',
                    px: '2.5',
                    color: 'violet.200',
                    fontSize: 'xs',
                    fontWeight: 'black',
                    bg: 'violet.900/40'
                  })}
                >
                  🔀 Queue Jump
                </span>
              ) : (
                <span
                  className={css({
                    rounded: 'full',
                    py: '0.5',
                    px: '2.5',
                    color: 'emerald.200',
                    fontSize: 'xs',
                    fontWeight: 'bold',
                    bg: 'emerald.900/40'
                  })}
                >
                  ✓ On Schedule
                </span>
              )}
            </HStack>

            {/* Explanation */}
            {rotationContext.isCycleJump && (
              <Stack gap="1.5" fontSize="xs">
                <Text color="amber.300" fontWeight="bold">
                  {t('event_page.cycle_jump_desc', {
                    cycle: rotationContext.cycle,
                    prev: rotationContext.cycle - 1
                  })}
                </Text>
                <Wrap gap="2">
                  {rotationContext.cycleSkippedIds.map((cid) => {
                    const c = charById.get(cid);
                    if (!c) return null;
                    return (
                      <Link
                        className={css({
                          display: 'inline-flex',
                          gap: '1.5',
                          alignItems: 'center',
                          borderColor: 'border.default',
                          rounded: 'full',
                          borderWidth: '1px',
                          py: '0.5',
                          px: '2',
                          fontSize: 'xs',
                          fontWeight: 'bold',
                          bg: 'bg.default'
                        })}
                        key={cid}
                        href={characterHref(c.id)}
                      >
                        <CharacterIcon characterId={c.id} size={18} />
                        <span>{charDisplayName(c, i18n.language, true)}</span>
                      </Link>
                    );
                  })}
                </Wrap>
              </Stack>
            )}

            {rotationContext.queueSkippedIds.length > 0 && !rotationContext.isCycleJump && (
              <Stack gap="1.5" fontSize="xs">
                <Text color="violet.300" fontWeight="bold">
                  {t('event_page.queue_jump_desc', {
                    cycle: rotationContext.cycle,
                    prev: rotationContext.cycle - 1
                  })}
                </Text>
                <Wrap gap="2">
                  {rotationContext.queueSkippedIds.map((cid) => {
                    const c = charById.get(cid);
                    if (!c) return null;
                    return (
                      <Link
                        className={css({
                          display: 'inline-flex',
                          gap: '1.5',
                          alignItems: 'center',
                          borderColor: 'border.default',
                          rounded: 'full',
                          borderWidth: '1px',
                          py: '0.5',
                          px: '2',
                          fontSize: 'xs',
                          fontWeight: 'bold',
                          bg: 'bg.default'
                        })}
                        key={cid}
                        href={characterHref(c.id)}
                      >
                        <CharacterIcon characterId={c.id} size={18} />
                        <span>{charDisplayName(c, i18n.language, true)}</span>
                      </Link>
                    );
                  })}
                </Wrap>
              </Stack>
            )}

            {!rotationContext.isCycleJump && rotationContext.queueSkippedIds.length === 0 && (
              <Text color="fg.muted" fontSize="xs">
                {t('event_page.on_schedule_desc')}
              </Text>
            )}

            {/* Waiting after this event */}
            <HStack gap="2" pt="1" color="fg.muted" fontSize="xs" flexWrap="wrap">
              <span>{t('event_page.waiting_after')}</span>
              {rotationContext.waitingAfterEventIds.length > 0 ? (
                <Wrap gap="1.5">
                  {rotationContext.waitingAfterEventIds.map((cid) => {
                    const c = charById.get(cid);
                    if (!c) return null;
                    return (
                      <Link
                        className={css({
                          display: 'inline-flex',
                          gap: '1',
                          alignItems: 'center',
                          color: 'fg.default',
                          fontWeight: 'bold',
                          _hover: { textDecoration: 'underline' }
                        })}
                        key={cid}
                        href={characterHref(c.id)}
                      >
                        <CharacterIcon characterId={c.id} size={16} />
                        <span>{charDisplayName(c, i18n.language, true)}</span>
                      </Link>
                    );
                  })}
                </Wrap>
              ) : (
                <span className={css({ color: 'emerald.400', fontWeight: 'bold' })}>
                  {t('event_page.all_caught_up', { cycle: rotationContext.cycle })}
                </span>
              )}
            </HStack>
          </Stack>
        </Box>
      )}

      {/* 3. Event & Rotation Droughts Broken */}
      <Stack gap="3">
        <Stack gap="0.5">
          <Text as="h2" fontSize="xl" fontWeight="extrabold">
            {t('event_page.event_droughts')} ({eventBreaks.length})
          </Text>
          <Text color="fg.muted" fontSize="xs">
            {t('event_page.event_droughts_sub')}
          </Text>
        </Stack>

        <Grid gap="4" columns={{ base: 1, md: 2, lg: 3 }}>
          {eventBreaks.map((rec) => {
            const pal = SEVERITY_PALETTE[rec.severityAtRelease];
            const char = rec.characterId ? charById.get(rec.characterId) : undefined;

            return (
              <Box
                key={rec.key}
                style={{
                  borderColor:
                    rec.isAllTimeMaxGap ||
                    rec.brokePriorRecord ||
                    rec.severityAtRelease === 'record'
                      ? pal.border
                      : undefined
                }}
                rounded="xl"
                borderWidth="1px"
                p="4"
                bg="bg.subtle"
              >
                <Stack gap="3">
                  <HStack justifyContent="space-between" alignItems="flex-start">
                    <HStack gap="2">
                      {char && <CharacterIcon characterId={char.id} size={28} />}
                      <Stack gap="0">
                        <span className={css({ fontSize: 'xs', fontWeight: 'bold' })}>
                          {i18n.language.startsWith('ja') ? rec.labelJa : rec.labelEn}
                        </span>
                        <span className={css({ color: 'fg.muted', fontSize: '2xs' })}>
                          #{rec.ordinal} of {rec.totalCount}
                        </span>
                      </Stack>
                    </HStack>
                    <SeverityPill
                      clock={{
                        entityId: rec.key,
                        severity: rec.severityAtRelease,
                        daysSince: rec.daysBroken,
                        avgGapDays: rec.avgGapDays,
                        maxGapDays: rec.priorMaxGapDays ?? rec.daysBroken,
                        lastTimestamp: rec.previous?.timestamp ?? event.startAt,
                        overdueRatio: rec.ratioVsAvg,
                        count: rec.totalCount,
                        isRecordWait: rec.brokePriorRecord,
                        history: []
                      }}
                    />
                  </HStack>

                  <HStack gap="3" alignItems="baseline">
                    <span
                      className={css({
                        fontSize: '3xl',
                        fontWeight: 'black',
                        fontVariantNumeric: 'tabular-nums',
                        lineHeight: '1'
                      })}
                      style={{ color: pal.text }}
                    >
                      {t('common.days', { count: rec.daysBroken })}
                    </span>
                    {!rec.isFirstEver && rec.eventsBetween > 0 && (
                      <span
                        className={css({ color: 'fg.muted', fontSize: 'xs', fontWeight: 'bold' })}
                      >
                        {rec.eventsBetween} events
                      </span>
                    )}
                  </HStack>

                  <Wrap gap="1.5">
                    {rec.isFirstEver && (
                      <span
                        className={css({
                          borderColor: 'blue.500/50',
                          rounded: 'full',
                          borderWidth: '1px',
                          py: '0.5',
                          px: '2',
                          color: 'blue.200',
                          fontSize: '2xs',
                          fontWeight: 'extrabold',
                          bg: 'blue.900/40'
                        })}
                      >
                        {t('card_page.first_ever')} ·{' '}
                        {t('card_page.since_launch', { count: rec.daysBroken })}
                      </span>
                    )}
                    {rec.isAllTimeMaxGap && !rec.isFirstEver && (
                      <span
                        className={css({
                          borderColor: 'amber.500/50',
                          rounded: 'full',
                          borderWidth: '1px',
                          py: '0.5',
                          px: '2',
                          color: 'amber.200',
                          fontSize: '2xs',
                          fontWeight: 'extrabold',
                          bg: 'amber.900/40'
                        })}
                      >
                        🏆 {t('card_page.all_time_max')}
                      </span>
                    )}
                    {rec.brokePriorRecord && !rec.isAllTimeMaxGap && !rec.isFirstEver && (
                      <span
                        className={css({
                          borderColor: 'rose.500/50',
                          rounded: 'full',
                          borderWidth: '1px',
                          py: '0.5',
                          px: '2',
                          color: 'rose.200',
                          fontSize: '2xs',
                          fontWeight: 'extrabold',
                          bg: 'rose.900/40'
                        })}
                      >
                        ⚡ {t('card_page.broke_record')}
                      </span>
                    )}
                    {!rec.isFirstEver && (
                      <span className={css({ color: 'fg.muted', fontSize: '2xs' })}>
                        Avg: {rec.avgGapDays}d ({rec.ratioVsAvg.toFixed(1)}×)
                      </span>
                    )}
                  </Wrap>

                  {/* Previous ↔ Next chain */}
                  <Stack
                    gap="1.5"
                    borderColor="border.subtle"
                    borderTopWidth="1px"
                    pt="1"
                    fontSize="2xs"
                  >
                    {rec.previous && (
                      <HStack justifyContent="space-between">
                        <span className={css({ color: 'fg.muted' })}>
                          {t('card_page.prev_in_cat')}:
                        </span>
                        <Link
                          className={css({
                            maxW: '180px',
                            fontWeight: 'bold',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            _hover: { textDecoration: 'underline' }
                          })}
                          href={eventHref(rec.previous.eventId ?? rec.previous.id)}
                        >
                          {localizedTitle(
                            rec.previous.labelJa,
                            rec.previous.labelEn,
                            i18n.language
                          )}{' '}
                          ({formatDateShort(rec.previous.timestamp, i18n.language)})
                        </Link>
                      </HStack>
                    )}

                    {rec.next ? (
                      <HStack justifyContent="space-between">
                        <span className={css({ color: 'fg.muted' })}>
                          {t('card_page.next_in_cat', { count: rec.next.gapDays })}:
                        </span>
                        <Link
                          className={css({
                            maxW: '180px',
                            fontWeight: 'bold',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            _hover: { textDecoration: 'underline' }
                          })}
                          href={eventHref(rec.next.eventId ?? rec.next.id)}
                        >
                          {localizedTitle(rec.next.labelJa, rec.next.labelEn, i18n.language)}
                        </Link>
                      </HStack>
                    ) : (
                      <span className={css({ color: 'emerald.400', fontWeight: 'bold' })}>
                        ✓ {t('card_page.still_latest', { count: rec.activeDaysSince })}
                      </span>
                    )}
                  </Stack>
                </Stack>
              </Box>
            );
          })}
        </Grid>
      </Stack>

      {/* 4. Co-4★ Banner Duo Pairings Broken */}
      {duoBreaks.length > 0 && (
        <Stack gap="3">
          <Text as="h2" fontSize="xl" fontWeight="extrabold">
            {t('event_page.duo_breaks')} ({duoBreaks.length})
          </Text>

          <Grid gap="3" columns={{ base: 1, sm: 2, lg: 3 }}>
            {duoBreaks.map((duo) => {
              const charA = charById.get(duo.charAId);
              const charB = charById.get(duo.charBId);
              if (!charA || !charB) return null;

              return (
                <Box
                  key={`${duo.charAId}-${duo.charBId}`}
                  borderColor="border.default"
                  rounded="xl"
                  borderWidth="1px"
                  p="3.5"
                  bg="bg.subtle"
                >
                  <Stack gap="2.5">
                    <HStack justifyContent="space-between">
                      <HStack gap="2">
                        <CharacterIcon characterId={charA.id} size={28} />
                        <span className={css({ fontWeight: 'bold' })}>×</span>
                        <CharacterIcon characterId={charB.id} size={28} />
                        <span className={css({ fontSize: 'xs', fontWeight: 'bold' })}>
                          {charDisplayName(charA, i18n.language, true)} &{' '}
                          {charDisplayName(charB, i18n.language, true)}
                        </span>
                      </HStack>
                      <span
                        className={css({
                          fontSize: 'base',
                          fontWeight: 'black',
                          fontVariantNumeric: 'tabular-nums'
                        })}
                      >
                        +{duo.daysBroken}d gap
                      </span>
                    </HStack>

                    <Stack gap="1" color="fg.muted" fontSize="2xs">
                      {duo.previousEvent ? (
                        <HStack justifyContent="space-between">
                          <span>Prev:</span>
                          <Link
                            className={css({ _hover: { textDecoration: 'underline' } })}
                            href={eventHref(duo.previousEvent.id)}
                          >
                            {duo.previousEvent.nickname ? `[${duo.previousEvent.nickname}] ` : ''}
                            {localizedTitle(
                              duo.previousEvent.nameJa,
                              duo.previousEvent.nameEn,
                              i18n.language
                            )}
                          </Link>
                        </HStack>
                      ) : (
                        <span>{t('card_page.first_ever')}</span>
                      )}

                      {duo.nextEvent ? (
                        <HStack justifyContent="space-between">
                          <span>Next (+{duo.nextGapDays}d):</span>
                          <Link
                            className={css({ _hover: { textDecoration: 'underline' } })}
                            href={eventHref(duo.nextEvent.id)}
                          >
                            {duo.nextEvent.nickname ? `[${duo.nextEvent.nickname}] ` : ''}
                            {localizedTitle(
                              duo.nextEvent.nameJa,
                              duo.nextEvent.nameEn,
                              i18n.language
                            )}
                          </Link>
                        </HStack>
                      ) : (
                        <span className={css({ color: 'emerald.400' })}>
                          ✓ {t('card_page.still_latest', { count: duo.activeDaysSince })}
                        </span>
                      )}
                    </Stack>
                  </Stack>
                </Box>
              );
            })}
          </Grid>
        </Stack>
      )}

      {/* 5. Featured Commissioned Song */}
      {song && (
        <Stack gap="3">
          <Text as="h2" fontSize="xl" fontWeight="extrabold">
            {t('event_page.featured_song')}
          </Text>

          <Box borderColor="border.default" rounded="xl" borderWidth="1px" p="4" bg="bg.subtle">
            <Flex
              gap="4"
              direction={{ base: 'column', sm: 'row' }}
              alignItems={{ base: 'flex-start', sm: 'center' }}
            >
              <SongJacketTile music={song} size={72} />
              <Stack flex="1" gap="1.5" minW="0">
                <HStack gap="2">
                  <span
                    className={css({
                      rounded: 'md',
                      py: '0.2',
                      px: '1.5',
                      fontSize: '2xs',
                      fontWeight: 'bold',
                      bg: 'bg.muted'
                    })}
                  >
                    {song.commissioned ? 'COMMISSIONED' : 'EVENT SONG'}
                  </span>
                  <Text as="h3" fontSize="lg" fontWeight="black">
                    {localizedTitle(song.titleJa, song.titleEn, i18n.language)}
                  </Text>
                </HStack>

                {/* Vocalists */}
                <HStack gap="2" pt="1" flexWrap="wrap">
                  <span className={css({ color: 'fg.muted', fontSize: '2xs', fontWeight: 'bold' })}>
                    Vocals:
                  </span>
                  <Wrap gap="1.5">
                    {song.sekaiVocalCharacterIds.map((cid) => {
                      const c = charById.get(cid);
                      if (!c) return null;
                      return (
                        <Link
                          className={css({
                            display: 'inline-flex',
                            gap: '1',
                            alignItems: 'center',
                            borderColor: 'border.subtle',
                            rounded: 'full',
                            borderWidth: '1px',
                            py: '0.2',
                            px: '2',
                            fontSize: '2xs',
                            fontWeight: 'bold',
                            bg: 'bg.default'
                          })}
                          key={cid}
                          href={characterHref(c.id)}
                        >
                          <CharacterIcon characterId={c.id} size={16} />
                          <span>{charDisplayName(c, i18n.language, true)}</span>
                        </Link>
                      );
                    })}
                  </Wrap>
                </HStack>

                {altVocalCharacterIds.length > 0 && (
                  <HStack gap="2" color="fg.muted" fontSize="2xs">
                    <span>Another Vocals:</span>
                    <Wrap gap="1">
                      {altVocalCharacterIds.map((cid) => {
                        const c = charById.get(cid);
                        if (!c) return null;
                        return <CharacterIcon key={cid} characterId={c.id} size={16} />;
                      })}
                    </Wrap>
                  </HStack>
                )}
              </Stack>
            </Flex>
          </Box>
        </Stack>
      )}

      {/* 6. Event Card Lineup & Primary Droughts Broken */}
      <Stack gap="3">
        <Text as="h2" fontSize="xl" fontWeight="extrabold">
          {t('event_page.lineup_title')} ({lineupCards.length})
        </Text>

        <Grid gap="4" columns={{ base: 1, md: 2, lg: 3 }}>
          {lineupCards.map(({ card, character, primaryBreaks }) => (
            <Box
              key={card.id}
              style={{ borderColor: `${character.color}60` }}
              rounded="xl"
              borderWidth="1px"
              p="4"
              bg="bg.subtle"
            >
              <Stack gap="3">
                <HStack gap="3">
                  <Link className={css({ flexShrink: 0 })} href={cardHref(card.id)}>
                    <CardThumbTile card={card} preferTrained={preferTrained} size={56} />
                  </Link>
                  <Stack flex="1" gap="0.5" minW="0">
                    <HStack gap="1.5">
                      <CharacterIcon characterId={character.id} size={18} />
                      <Link
                        className={css({
                          fontSize: 'xs',
                          fontWeight: 'bold',
                          _hover: { textDecoration: 'underline' }
                        })}
                        href={characterHref(character.id)}
                      >
                        {charDisplayName(character, i18n.language, true)}
                      </Link>
                      <span className={css({ color: 'amber.400', fontSize: 'xs' })}>
                        {card.rarity === 'rarity_birthday'
                          ? '🎂'
                          : '★'.repeat(
                              card.rarity === 'rarity_4'
                                ? 4
                                : card.rarity === 'rarity_3'
                                  ? 3
                                  : card.rarity === 'rarity_2'
                                    ? 2
                                    : 1
                            )}
                      </span>
                    </HStack>
                    <Link
                      className={css({
                        fontSize: 'sm',
                        fontWeight: 'bold',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        _hover: { textDecoration: 'underline' }
                      })}
                      href={cardHref(card.id)}
                    >
                      {localizedTitle(card.prefixJa, card.prefixEn, i18n.language)}
                    </Link>
                  </Stack>
                </HStack>

                {/* Primary Breaks pills */}
                {primaryBreaks.length > 0 && (
                  <Wrap gap="1.5" pt="1">
                    {primaryBreaks.slice(0, 3).map((brk) => (
                      <span
                        key={brk.key}
                        className={css({
                          borderColor: 'border.default',
                          rounded: 'full',
                          borderWidth: '1px',
                          py: '0.5',
                          px: '2',
                          fontSize: '2xs',
                          fontWeight: 'bold',
                          fontVariantNumeric: 'tabular-nums',
                          bg: 'bg.default'
                        })}
                      >
                        +{brk.daysBroken}d {brk.labelEn}
                      </span>
                    ))}
                  </Wrap>
                )}

                <Link
                  className={css({
                    borderColor: 'border.default',
                    rounded: 'lg',
                    borderWidth: '1px',
                    py: '1.5',
                    fontSize: 'xs',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    bg: 'bg.default',
                    _hover: { textDecoration: 'none', bg: 'bg.muted' }
                  })}
                  href={cardHref(card.id)}
                >
                  {t('event_page.view_card_dossier')}
                </Link>
              </Stack>
            </Box>
          ))}
        </Grid>
      </Stack>
    </Stack>
  );
}
