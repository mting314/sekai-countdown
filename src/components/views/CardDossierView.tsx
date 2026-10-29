import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BiChevronLeft, BiChevronRight, BiExpandAlt, BiLinkExternal } from 'react-icons/bi';
import { css } from 'styled-system/css';
import { Box, Flex, Grid, HStack, Stack, Wrap } from 'styled-system/jsx';
import { SeverityPill } from '~/components/sekai/DroughtVisuals';
import {
  AttributeIcon,
  CardThumbTile,
  CharacterIcon,
  UnitBadge
} from '~/components/sekai/SekaiVisuals';
import { Link } from '~/components/ui/link';
import { Text } from '~/components/ui/text';
import { useCountdownData } from '~/context/CountdownDataContext';
import { cardArtUrl } from '~/utils/countdown/assets';
import { ATTRIBUTE_META, SUPPLY_BADGE_META } from '~/utils/countdown/constants';
import { computeCardDossier } from '~/utils/countdown/drought-break';
import {
  charDisplayName,
  formatDateShort,
  localizedTitle,
  SEVERITY_PALETTE
} from '~/utils/countdown/format';
import { cardHref, characterHref, eventHref, homeHref } from '~/utils/countdown/routes';

export function CardDossierView({ cardId }: { cardId: number }) {
  const { t, i18n } = useTranslation();
  const { snapshot, now, preferTrained } = useCountdownData();
  const [localTrained, setLocalTrained] = useState<boolean>(preferTrained);

  const dossier = useMemo(() => computeCardDossier(snapshot, cardId, now), [snapshot, cardId, now]);

  if (!dossier) {
    return (
      <Stack gap="4" alignItems="center" py="12">
        <Text>{t('error_page.not_found')}</Text>
        <Link href={homeHref()}>{t('error_page.home')}</Link>
      </Stack>
    );
  }

  const { card, character, event, eventCards, prevCharacterCard, nextCharacterCard } = dossier;
  const hasTraining = card.rarity === 'rarity_3' || card.rarity === 'rarity_4';
  const showTrained = hasTraining ? localTrained : false;
  const artUrl = cardArtUrl(card, showTrained);
  const attrMeta = ATTRIBUTE_META[card.attr];

  return (
    <Stack gap="7">
      {/* 1. Hero Card Art & Metadata Header */}
      <Box
        style={{
          borderColor: `${character.color}88`,
          background: `radial-gradient(circle at 16% 40%, ${character.color}25, transparent 65%)`
        }}
        position="relative"
        rounded="2xl"
        borderWidth="1px"
        bg="bg.subtle"
        overflow="hidden"
      >
        {/* Background Full Art Fade */}
        {artUrl && (
          <>
            <Box
              position="absolute"
              top="0"
              right="0"
              bottom="0"
              w={{ base: '100%', sm: '76%', md: '68%' }}
              opacity={{ base: 0.35, sm: 0.95 }}
              pointerEvents="none"
            >
              <img
                src={artUrl}
                alt=""
                referrerPolicy="no-referrer"
                style={{
                  maskImage:
                    'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.06) 14%, rgba(0,0,0,0.28) 30%, rgba(0,0,0,0.66) 50%, rgba(0,0,0,0.92) 70%, rgba(0,0,0,1) 88%)',
                  WebkitMaskImage:
                    'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.06) 14%, rgba(0,0,0,0.28) 30%, rgba(0,0,0,0.66) 50%, rgba(0,0,0,0.92) 70%, rgba(0,0,0,1) 88%)'
                }}
                className={css({
                  objectPosition: 'center 28%',
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
                gradientVia: 'bg.subtle/80',
                gradientTo: 'transparent'
              })}
              position="absolute"
              top="0"
              left="0"
              bottom="0"
              w={{ base: '85%', sm: '52%', md: '45%' }}
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
            <UnitBadge unit={character.unit} />
            {(() => {
              const sMeta = SUPPLY_BADGE_META[card.supply];
              return (
                <span
                  className={css({
                    rounded: 'md',
                    borderWidth: '1px',
                    py: '0.5',
                    px: '2',
                    fontSize: 'xs',
                    fontWeight: 'bold'
                  })}
                  style={{
                    backgroundColor: sMeta.bg,
                    color: sMeta.fg,
                    borderColor: `${sMeta.fg}66`
                  }}
                >
                  {i18n.language.startsWith('ja') ? sMeta.shortJa : sMeta.shortEn}
                </span>
              );
            })()}
            <HStack
              gap="1"
              borderColor="border.subtle"
              rounded="md"
              borderWidth="1px"
              py="0.5"
              px="2"
              bg="bg.default/80"
            >
              <AttributeIcon attr={card.attr} size={15} />
              <span className={css({ fontSize: 'xs', fontWeight: 'bold' })}>
                {i18n.language.startsWith('ja') ? attrMeta.labelJa : attrMeta.labelEn}
              </span>
            </HStack>
            <span className={css({ color: 'amber.400', fontSize: 'xs', letterSpacing: '0.1em' })}>
              {card.rarity === 'rarity_birthday'
                ? '🎂 BD'
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
          </Wrap>

          {/* Title & Character */}
          <Stack gap="1">
            <HStack gap="2.5" alignItems="center">
              <Link className={css({ flexShrink: 0 })} href={characterHref(character.id)}>
                <CharacterIcon characterId={character.id} size={42} />
              </Link>
              <Stack gap="0">
                <Link
                  className={css({
                    color: 'fg.muted',
                    fontSize: 'sm',
                    fontWeight: 'bold',
                    _hover: { color: 'fg.default' }
                  })}
                  href={characterHref(character.id)}
                >
                  {charDisplayName(character, i18n.language)}
                </Link>
                <Text
                  as="h1"
                  fontSize={{ base: 'xl', md: '2xl' }}
                  fontWeight="black"
                  lineHeight="1.2"
                >
                  {localizedTitle(card.prefixJa, card.prefixEn, i18n.language)}
                </Text>
              </Stack>
            </HStack>
          </Stack>

          {/* Debut Event & Date */}
          <Stack gap="1.5" fontSize="xs">
            {event && (
              <HStack gap="2" flexWrap="wrap">
                <span className={css({ color: 'fg.muted' })}>Debut:</span>
                <Link
                  className={css({
                    display: 'inline-flex',
                    gap: '1.5',
                    alignItems: 'center',
                    fontWeight: 'bold',
                    _hover: { textDecoration: 'underline' }
                  })}
                  href={eventHref(event.id)}
                >
                  {event.nickname && (
                    <span
                      className={css({
                        rounded: 'sm',
                        borderWidth: '1px',
                        py: '0.2',
                        px: '1.5',
                        fontSize: '2xs',
                        fontWeight: 'black'
                      })}
                      style={{
                        borderColor: `${character.color}88`,
                        color: character.color,
                        backgroundColor: `${character.color}18`
                      }}
                    >
                      {event.nickname}
                    </span>
                  )}
                  <span>{localizedTitle(event.nameJa, event.nameEn, i18n.language)}</span>
                </Link>
              </HStack>
            )}

            <HStack gap="2" color="fg.muted">
              <span>{formatDateShort(card.releaseAt, i18n.language)}</span>
              <span>·</span>
              <span>
                {dossier.isUpcoming
                  ? t('search.in_days', { count: dossier.daysAgo })
                  : t('search.days_ago', { count: dossier.daysAgo })}
              </span>
            </HStack>
          </Stack>

          {/* Art Switcher & Full Art Buttons */}
          <HStack gap="2" pt="1" flexWrap="wrap">
            {hasTraining && (
              <HStack
                gap="1"
                borderColor="border.default"
                rounded="lg"
                borderWidth="1px"
                p="0.5"
                bg="bg.default/80"
              >
                <button
                  type="button"
                  onClick={() => setLocalTrained(false)}
                  className={
                    !showTrained
                      ? css({
                          cursor: 'pointer',
                          rounded: 'md',
                          py: '1',
                          px: '2.5',
                          fontSize: 'xs',
                          fontWeight: 'bold',
                          bg: 'bg.muted'
                        })
                      : css({
                          cursor: 'pointer',
                          rounded: 'md',
                          py: '1',
                          px: '2.5',
                          color: 'fg.muted',
                          fontSize: 'xs',
                          fontWeight: 'medium',
                          _hover: { color: 'fg.default' }
                        })
                  }
                >
                  {t('card_page.untrained')}
                </button>
                <button
                  type="button"
                  onClick={() => setLocalTrained(true)}
                  className={
                    showTrained
                      ? css({
                          cursor: 'pointer',
                          rounded: 'md',
                          py: '1',
                          px: '2.5',
                          fontSize: 'xs',
                          fontWeight: 'bold',
                          bg: 'bg.muted'
                        })
                      : css({
                          cursor: 'pointer',
                          rounded: 'md',
                          py: '1',
                          px: '2.5',
                          color: 'fg.muted',
                          fontSize: 'xs',
                          fontWeight: 'medium',
                          _hover: { color: 'fg.default' }
                        })
                  }
                >
                  {t('card_page.trained')}
                </button>
              </HStack>
            )}

            {artUrl && (
              <a
                href={artUrl}
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
              >
                <BiExpandAlt size={14} />
                <span>{t('card_page.open_full_art')}</span>
              </a>
            )}

            <a
              href={`https://sekai.best/card/${card.id}`}
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

          {/* Prev / Next Character 4★ Switcher */}
          <Flex
            gap="2"
            justifyContent="space-between"
            borderColor="border.subtle"
            borderTopWidth="1px"
            pt="2"
          >
            {prevCharacterCard ? (
              <Link
                className={css({
                  display: 'inline-flex',
                  gap: '1',
                  alignItems: 'center',
                  color: 'fg.muted',
                  fontSize: 'xs',
                  _hover: { color: 'fg.default', textDecoration: 'underline' }
                })}
                href={cardHref(prevCharacterCard.id)}
              >
                <BiChevronLeft size={16} />
                <span
                  className={css({
                    maxW: '160px',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap'
                  })}
                >
                  {localizedTitle(
                    prevCharacterCard.prefixJa,
                    prevCharacterCard.prefixEn,
                    i18n.language
                  )}
                </span>
              </Link>
            ) : (
              <span />
            )}

            {nextCharacterCard ? (
              <Link
                className={css({
                  display: 'inline-flex',
                  gap: '1',
                  alignItems: 'center',
                  color: 'fg.muted',
                  fontSize: 'xs',
                  _hover: { color: 'fg.default', textDecoration: 'underline' }
                })}
                href={cardHref(nextCharacterCard.id)}
              >
                <span
                  className={css({
                    maxW: '160px',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap'
                  })}
                >
                  {localizedTitle(
                    nextCharacterCard.prefixJa,
                    nextCharacterCard.prefixEn,
                    i18n.language
                  )}
                </span>
                <BiChevronRight size={16} />
              </Link>
            ) : (
              <span className={css({ color: 'fg.muted', fontSize: '2xs', fontStyle: 'italic' })}>
                {t('card_page.still_latest', { count: dossier.daysAgo })}
              </span>
            )}
          </Flex>
        </Stack>
      </Box>

      {/* 2. Droughts Broken by This Card */}
      <Stack gap="3">
        <Stack gap="0.5">
          <Text as="h2" fontSize="xl" fontWeight="extrabold">
            {t('card_page.droughts_broken')} ({dossier.brokenDroughts.length})
          </Text>
          <Text color="fg.muted" fontSize="xs">
            {t('card_page.droughts_broken_sub')}
          </Text>
        </Stack>

        <Grid gap="4" columns={{ base: 1, md: 2, lg: 3 }}>
          {dossier.brokenDroughts.map((rec) => {
            const pal = SEVERITY_PALETTE[rec.severityAtRelease];

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
                  {/* Category Title & Ordinal */}
                  <HStack justifyContent="space-between" alignItems="flex-start">
                    <Stack gap="0">
                      <span className={css({ fontSize: 'xs', fontWeight: 'bold' })}>
                        {i18n.language.startsWith('ja') ? rec.labelJa : rec.labelEn}
                      </span>
                      <span className={css({ color: 'fg.muted', fontSize: '2xs' })}>
                        {t('card_page.ordinal_of', { ord: rec.ordinal, total: rec.totalCount })}
                      </span>
                    </Stack>
                    <SeverityPill
                      clock={{
                        entityId: rec.key,
                        severity: rec.severityAtRelease,
                        daysSince: rec.daysBroken,
                        avgGapDays: rec.avgGapDays,
                        maxGapDays: rec.priorMaxGapDays ?? rec.daysBroken,
                        lastTimestamp: rec.previous?.timestamp ?? card.releaseAt,
                        overdueRatio: rec.ratioVsAvg,
                        count: rec.totalCount,
                        isRecordWait: rec.brokePriorRecord,
                        history: []
                      }}
                    />
                  </HStack>

                  {/* Days Broken Big Display */}
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

                  {/* Highlights Badges */}
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

                  {/* Previous Card ↔ Next Card Chain */}
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
                          href={cardHref(rec.previous.cardId ?? rec.previous.id)}
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
                          href={cardHref(rec.next.cardId ?? rec.next.id)}
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

      {/* 3. Co-4★ Banner Duo Droughts Broken */}
      {dossier.duoBreaks.length > 0 && (
        <Stack gap="3">
          <Text as="h2" fontSize="xl" fontWeight="extrabold">
            {t('card_page.duo_breaks')}
          </Text>

          <Grid gap="3" columns={{ base: 1, md: 2, lg: 3 }}>
            {dossier.duoBreaks.map((duo) => {
              const charA = snapshot.characters.find((c) => c.id === duo.charAId);
              const charB = snapshot.characters.find((c) => c.id === duo.charBId);
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

      {/* 4. Debut Event & Banner Lineup */}
      {event && eventCards.length > 0 && (
        <Stack gap="3">
          <Text as="h2" fontSize="xl" fontWeight="extrabold">
            {t('card_page.event_lineup')} ({eventCards.length})
          </Text>

          <Grid gap="3" columns={{ base: 1, sm: 2, lg: 3 }}>
            {eventCards.map((ec) => {
              const ecChar = snapshot.characters.find((c) => c.id === ec.characterId);
              const isCurrent = ec.id === card.id;

              return (
                <Box
                  key={ec.id}
                  style={{
                    borderColor: isCurrent ? character.color : undefined,
                    background: isCurrent ? `${character.color}14` : undefined
                  }}
                  rounded="xl"
                  borderWidth="1px"
                  p="3"
                  bg="bg.subtle"
                >
                  <HStack gap="3">
                    <Link className={css({ flexShrink: 0 })} href={cardHref(ec.id)}>
                      <CardThumbTile card={ec} preferTrained={preferTrained} size={48} />
                    </Link>
                    <Stack gap="0.5" minW="0">
                      <HStack gap="1.5">
                        {ecChar && (
                          <span className={css({ fontSize: 'xs', fontWeight: 'bold' })}>
                            {charDisplayName(ecChar, i18n.language, true)}
                          </span>
                        )}
                        <span className={css({ color: 'amber.400', fontSize: 'xs' })}>
                          {ec.rarity === 'rarity_birthday'
                            ? '🎂'
                            : '★'.repeat(
                                ec.rarity === 'rarity_4'
                                  ? 4
                                  : ec.rarity === 'rarity_3'
                                    ? 3
                                    : ec.rarity === 'rarity_2'
                                      ? 2
                                      : 1
                              )}
                        </span>
                      </HStack>
                      <Link
                        className={css({
                          fontSize: 'xs',
                          fontWeight: 'bold',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          _hover: { textDecoration: 'underline' }
                        })}
                        href={cardHref(ec.id)}
                      >
                        {localizedTitle(ec.prefixJa, ec.prefixEn, i18n.language)}
                      </Link>
                      {isCurrent && (
                        <span
                          className={css({
                            color: 'fg.muted',
                            fontSize: '2xs',
                            fontWeight: 'bold'
                          })}
                        >
                          ★ Current Card
                        </span>
                      )}
                    </Stack>
                  </HStack>
                </Box>
              );
            })}
          </Grid>
        </Stack>
      )}
    </Stack>
  );
}
