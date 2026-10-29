import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { css } from 'styled-system/css';
import { Box, Flex, Grid, HStack, Stack, Wrap } from 'styled-system/jsx';
import { EmptyFilterState, InlineFilterInput } from '~/components/search/InlineFilterInput';
import { DroughtMeter, SeverityPill } from '~/components/sekai/DroughtVisuals';
import {
  AttributeIcon,
  CardCutoutRender,
  CardThumbTile,
  CharacterIcon,
  SongJacketTile,
  StampTile,
  UnitBadge
} from '~/components/sekai/SekaiVisuals';
import { InfoTooltip } from '~/components/ui/InfoTooltip';
import { Link } from '~/components/ui/link';
import { Text } from '~/components/ui/text';
import { useCountdownData } from '~/context/CountdownDataContext';
import type { SekaiUnitId } from '~/types/countdown';
import { cardArtUrl, unitIconUrl } from '~/utils/countdown/assets';
import {
  ATTRIBUTE_META,
  MAIN_UNITS,
  SUPPLY_BADGE_META,
  UNIT_META
} from '~/utils/countdown/constants';
import {
  charDisplayName,
  formatDateShort,
  localizedTitle,
  SEVERITY_PALETTE
} from '~/utils/countdown/format';
import { computeCharacterDossier } from '~/utils/countdown/metrics';
import { cardHref, characterHref, eventHref, homeHref, unitHref } from '~/utils/countdown/routes';
import { matchesTokens, normalizeSearchText, tokenizeQuery } from '~/utils/countdown/search';

export function CharacterDossierView({ characterId }: { characterId: number }) {
  const { t, i18n } = useTranslation();
  const { snapshot, now, preferTrained, cardById, musicById, stampById } = useCountdownData();
  const [timelineQuery, setTimelineQuery] = useState('');
  const [subUnitFilter, setSubUnitFilter] = useState<string>('all');

  const dossier = useMemo(
    () => computeCharacterDossier(snapshot, characterId, now),
    [snapshot, characterId, now]
  );

  const filteredTimeline = useMemo(() => {
    if (!dossier) return [];
    let list = dossier.timeline;
    if (dossier.character.unit === 'virtual_singer' && subUnitFilter !== 'all') {
      list = list.filter((item) => item.card?.supportUnit === subUnitFilter);
    }
    const tokens = tokenizeQuery(timelineQuery);
    if (tokens.length === 0) return list;
    return list.filter((item) => {
      const card = item.card;
      if (!card) return false;
      const aMeta = ATTRIBUTE_META[card.attr];
      const sMeta = SUPPLY_BADGE_META[card.supply];
      const hay = normalizeSearchText(
        [
          card.prefixEn ?? '',
          card.prefixJa,
          card.attr,
          aMeta.labelEn,
          aMeta.labelJa,
          card.supply,
          sMeta.shortEn,
          sMeta.shortJa,
          item.event?.nickname ?? '',
          item.event?.nameEn ?? '',
          item.event?.nameJa ?? ''
        ].join(' ')
      );
      return matchesTokens(hay, tokens);
    });
  }, [dossier, timelineQuery, subUnitFilter]);

  if (!dossier) {
    return (
      <Stack gap="4" alignItems="center" py="12">
        <Text>{t('error_page.not_found')}</Text>
        <Link href={homeHref()}>{t('error_page.home')}</Link>
      </Stack>
    );
  }

  const { character } = dossier;
  const unitmates = snapshot.characters.filter((c) => c.unit === character.unit);
  const latestStamp = dossier.latestStampId ? stampById.get(dossier.latestStampId) : undefined;

  return (
    <Stack gap="7">
      {/* 1. Character Hero Header with Full-Bleed Card Art Fade + Latest Stamp */}
      <Box
        style={{
          borderColor: `${character.color}88`,
          background: `radial-gradient(circle at 18% 50%, ${character.color}28, transparent 58%)`
        }}
        position="relative"
        rounded="2xl"
        borderWidth="1px"
        minH={{ base: '205px', md: '230px' }}
        p={{ base: '4', md: '6' }}
        bg="bg.subtle"
        overflow="hidden"
      >
        <Box
          display="flex"
          position="absolute"
          top="0"
          right="0"
          bottom="0"
          justifyContent="flex-end"
          alignItems="center"
          height="100%"
          opacity={{ base: 0.45, sm: 0.98 }}
          pointerEvents="none"
        >
          <CardCutoutRender card={dossier.heroCard} preferTrained={preferTrained} />
        </Box>

        <Stack position="relative" gap="3.5" maxW={{ base: '100%', sm: '65%' }}>
          <HStack gap="2" flexWrap="wrap">
            <Link href={unitHref(character.unit)}>
              <UnitBadge unit={character.unit} />
            </Link>
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
              #{character.abbrev}
            </span>
          </HStack>

          <HStack gap="3.5" alignItems="center">
            <CharacterIcon characterId={character.id} size={56} />
            <Stack gap="0">
              <Text as="h1" fontSize={{ base: '2xl', md: '3xl' }} fontWeight="black">
                {charDisplayName(character, i18n.language)}
              </Text>
              <Text color="fg.muted" fontSize="sm">
                {i18n.language.startsWith('ja') ? character.nameEn : character.nameJa}
              </Text>
            </Stack>
            {latestStamp && (
              <Box hideBelow="sm">
                <StampTile stamp={latestStamp} size={62} />
              </Box>
            )}
          </HStack>

          {/* Unitmate Switcher */}
          <Wrap gap="1.5" pt="1">
            {unitmates.map((m) => (
              <Link
                className={
                  m.id === character.id
                    ? css({
                        display: 'inline-flex',
                        gap: '1.5',
                        alignItems: 'center',
                        rounded: 'full',
                        borderWidth: '1px',
                        py: '1',
                        px: '2.5',
                        fontSize: 'xs',
                        fontWeight: 'extrabold',
                        bg: 'bg.default',
                        _hover: { textDecoration: 'none', bg: 'bg.default' }
                      })
                    : css({
                        display: 'inline-flex',
                        gap: '1.5',
                        alignItems: 'center',
                        rounded: 'full',
                        borderWidth: '1px',
                        py: '1',
                        px: '2.5',
                        fontSize: 'xs',
                        fontWeight: 'medium',
                        bg: 'bg.default/55',
                        _hover: { textDecoration: 'none', bg: 'bg.default' }
                      })
                }
                key={m.id}
                href={characterHref(m.id)}
                style={{
                  borderColor: m.id === character.id ? m.color : 'transparent'
                }}
              >
                <CharacterIcon characterId={m.id} size={20} />
                {charDisplayName(m, i18n.language, true)}
              </Link>
            ))}
          </Wrap>
        </Stack>
      </Box>

      {/* 2. All Active Drought Clocks Grid */}
      <Stack gap="3">
        <Text as="h2" fontSize="xl" fontWeight="extrabold">
          {t('dossier.all_clocks')}
        </Text>
        <Grid gap="3.5" columns={{ base: 1, md: 2, lg: 3 }}>
          {dossier.clocks.map(({ key, labelKey, defaultLabel, clock }) => {
            const pal = SEVERITY_PALETTE[clock.severity];
            const card = clock.latest?.cardId ? cardById.get(clock.latest.cardId) : undefined;
            const song = clock.latest?.musicId ? musicById.get(clock.latest.musicId) : undefined;
            const stamp = clock.latest?.stampId ? stampById.get(clock.latest.stampId) : undefined;

            return (
              <Box
                key={key}
                style={{
                  borderColor:
                    clock.severity === 'record' || clock.severity === 'overdue'
                      ? pal.border
                      : undefined
                }}
                rounded="xl"
                borderWidth="1px"
                p="4"
                bg="bg.subtle"
              >
                <Stack gap="2.5">
                  <HStack justifyContent="space-between" alignItems="flex-start">
                    {(() => {
                      const cleanKey = key.replace(/^char_/, '');
                      const directKey = `clock_tooltips.${key}` as any;
                      const fallbackKey = `clock_tooltips.${cleanKey}` as any;
                      const hasDirect = i18n.exists(directKey);
                      const hasFallback = i18n.exists(fallbackKey);
                      const tooltipText: string | undefined = hasDirect
                        ? String(t(directKey))
                        : hasFallback
                          ? String(t(fallbackKey))
                          : undefined;

                      return (
                        <HStack gap="1.5" alignItems="center">
                          <Text color="fg.muted" fontSize="xs" fontWeight="bold">
                            {t(labelKey as any, { defaultValue: defaultLabel })}
                          </Text>
                          {tooltipText && <InfoTooltip text={tooltipText} label={defaultLabel} />}
                        </HStack>
                      );
                    })()}
                    <SeverityPill clock={clock} />
                  </HStack>

                  <HStack gap="3" alignItems="center">
                    {stamp ? (
                      <StampTile stamp={stamp} size={48} />
                    ) : card ? (
                      <Link className={css({ flexShrink: 0 })} href={cardHref(card.id)}>
                        <CardThumbTile card={card} preferTrained={preferTrained} size={48} />
                      </Link>
                    ) : song ? (
                      <SongJacketTile music={song} size={48} />
                    ) : null}

                    <Stack gap="0" minW="0">
                      <span
                        className={css({
                          fontSize: '2xl',
                          fontWeight: 'black',
                          fontVariantNumeric: 'tabular-nums',
                          lineHeight: '1.05'
                        })}
                        style={{ color: pal.text }}
                      >
                        {t('common.days', { count: clock.daysSince })}
                      </span>
                      {card ? (
                        <Link
                          className={css({
                            fontSize: 'xs',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            _hover: { textDecoration: 'underline' }
                          })}
                          href={cardHref(card.id)}
                        >
                          {localizedTitle(
                            clock.latest?.labelJa ?? '',
                            clock.latest?.labelEn,
                            i18n.language
                          )}
                        </Link>
                      ) : (
                        <span
                          className={css({
                            fontSize: 'xs',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap'
                          })}
                        >
                          {clock.latest
                            ? localizedTitle(
                                clock.latest.labelJa,
                                clock.latest.labelEn,
                                i18n.language
                              )
                            : t('common.never')}
                        </span>
                      )}
                      <span className={css({ color: 'fg.muted', fontSize: '2xs' })}>
                        {formatDateShort(clock.lastTimestamp, i18n.language)}
                      </span>
                    </Stack>
                  </HStack>

                  <DroughtMeter clock={clock} />
                </Stack>
              </Box>
            );
          })}
        </Grid>
      </Stack>

      {/* 3. 5-Attribute Breakdown */}
      <Stack gap="3">
        <Text as="h2" fontSize="xl" fontWeight="extrabold">
          {t('dossier.attr_ring')}
        </Text>
        <Grid gap="3" columns={{ base: 2, sm: 3, lg: 5 }}>
          {dossier.attributes.map((cell) => {
            const clock = cell.clockAll4Star;
            const pal = SEVERITY_PALETTE[clock.severity];
            const card = clock.latest?.cardId ? cardById.get(clock.latest.cardId) : undefined;
            const attrMeta = ATTRIBUTE_META[cell.attr];
            return (
              <Box
                key={cell.attr}
                borderColor="border.default"
                rounded="xl"
                borderWidth="1px"
                p="3"
                bg="bg.subtle"
              >
                <Stack gap="2">
                  <HStack justifyContent="space-between">
                    <HStack gap="1.5">
                      <AttributeIcon attr={cell.attr} size={18} />
                      <span className={css({ fontSize: 'xs', fontWeight: 'bold' })}>
                        {i18n.language.startsWith('ja') ? attrMeta.labelJa : attrMeta.labelEn}
                      </span>
                    </HStack>
                    <span className={css({ color: 'fg.muted', fontSize: '2xs' })}>
                      ×{clock.count}
                    </span>
                  </HStack>
                  <HStack gap="2.5" alignItems="center">
                    {card && (
                      <CardThumbTile
                        card={card}
                        preferTrained={preferTrained}
                        size={42}
                        showSupply={false}
                      />
                    )}
                    <Stack gap="0">
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
                      <span className={css({ color: 'fg.muted', fontSize: '2xs' })}>
                        {formatDateShort(clock.lastTimestamp, i18n.language)}
                      </span>
                    </Stack>
                  </HStack>
                </Stack>
              </Box>
            );
          })}
        </Grid>
      </Stack>

      {/* Optional SEKAI Sub-Unit Breakdown for Virtual Singers */}
      {dossier.subUnits && (
        <Stack gap="3">
          <Text as="h2" fontSize="xl" fontWeight="extrabold">
            {t('dossier.sekai_subunits')}
          </Text>
          <Grid gap="3" columns={{ base: 1, sm: 2, lg: 5 }}>
            {dossier.subUnits.map((sub) => {
              const clock = sub.clock4Star;
              const pal = SEVERITY_PALETTE[clock.severity];
              const card = clock.latest?.cardId ? cardById.get(clock.latest.cardId) : undefined;
              return (
                <Box
                  key={sub.supportUnit}
                  borderColor="border.default"
                  rounded="xl"
                  borderWidth="1px"
                  p="3"
                  bg="bg.subtle"
                >
                  <Stack gap="2">
                    <UnitBadge unit={sub.supportUnit} short />
                    <HStack gap="2">
                      {card ? (
                        <CardThumbTile card={card} preferTrained={preferTrained} size={42} />
                      ) : (
                        <CharacterIcon
                          characterId={character.id}
                          subUnit={sub.supportUnit}
                          size={38}
                        />
                      )}
                      <Stack gap="0">
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
                        <span className={css({ color: 'fg.muted', fontSize: '2xs' })}>
                          {clock.count > 0 ? `×${clock.count}` : t('common.never')}
                        </span>
                      </Stack>
                    </HStack>
                  </Stack>
                </Box>
              );
            })}
          </Grid>
        </Stack>
      )}

      {/* 4. Chronological 4★ Release & Gap Timeline */}
      <Stack gap="3">
        <Flex
          gap="2"
          direction={{ base: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ base: 'flex-start', sm: 'center' }}
        >
          <Text as="h2" fontSize="xl" fontWeight="extrabold">
            {t('dossier.timeline_title')} (
            {timelineQuery.trim()
              ? `${filteredTimeline.length}/${dossier.timeline.length}`
              : dossier.timeline.length}
            )
          </Text>
          <InlineFilterInput
            value={timelineQuery}
            onChange={setTimelineQuery}
            placeholder={t('search.dossier_placeholder')}
            maxW="320px"
          />
        </Flex>

        {character.unit === 'virtual_singer' && (
          <HStack gap="1.5" pt="0.5" flexWrap="wrap">
            <Text color="fg.muted" fontSize="xs" fontWeight="bold">
              {t('dossier.filter_by_unit')}
            </Text>
            {(['all', ...MAIN_UNITS] as const).map((u) => {
              const active = subUnitFilter === u;
              const uMeta = u !== 'all' ? UNIT_META[u as SekaiUnitId] : undefined;
              return (
                <button
                  key={u}
                  type="button"
                  onClick={() => setSubUnitFilter(u)}
                  className={
                    active
                      ? css({
                          cursor: 'pointer',
                          display: 'inline-flex',
                          gap: '1',
                          alignItems: 'center',
                          rounded: 'full',
                          borderWidth: '1px',
                          py: '0.5',
                          px: '2.5',
                          fontSize: 'xs',
                          fontWeight: 'extrabold',
                          bg: 'bg.default'
                        })
                      : css({
                          cursor: 'pointer',
                          display: 'inline-flex',
                          gap: '1',
                          alignItems: 'center',
                          borderColor: 'border.default',
                          rounded: 'full',
                          borderWidth: '1px',
                          py: '0.5',
                          px: '2.5',
                          fontSize: 'xs',
                          fontWeight: 'medium',
                          bg: 'bg.subtle',
                          _hover: { bg: 'bg.muted' }
                        })
                  }
                  style={active && uMeta ? { borderColor: uMeta.color } : undefined}
                >
                  {uMeta && (
                    <img src={unitIconUrl(u as SekaiUnitId)} alt="" width={14} height={14} />
                  )}
                  <span>{u === 'all' ? t('dossier.filter_all') : uMeta?.shortEn}</span>
                </button>
              );
            })}
          </HStack>
        )}

        {filteredTimeline.length === 0 ? (
          <EmptyFilterState query={timelineQuery} onClear={() => setTimelineQuery('')} />
        ) : (
          <Stack gap="2">
            {filteredTimeline.map((item) => {
              const card = item.card!;
              const art = cardArtUrl(card, preferTrained);
              const evFocusCharId = item.event?.focusCharacterId || item.event?.bannerCharacterId;
              const evFocusChar = evFocusCharId
                ? snapshot.characters.find((c) => c.id === evFocusCharId)
                : undefined;
              const evCharColor = evFocusChar?.color ?? character.color;

              return (
                <Box
                  key={card.id}
                  position="relative"
                  borderColor="border.subtle"
                  rounded="xl"
                  borderWidth="1px"
                  p="3"
                  bg="bg.subtle"
                  overflow="hidden"
                >
                  {art && (
                    <img
                      src={art}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className={css({
                        position: 'absolute',
                        top: '0',
                        right: '0',
                        objectFit: 'cover',
                        w: '44%',
                        h: 'full',
                        opacity: 0.24,
                        pointerEvents: 'none'
                      })}
                      style={{
                        objectPosition: 'center 24%',
                        maskImage: 'linear-gradient(to right, transparent 0%, black 48%)',
                        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 48%)'
                      }}
                    />
                  )}
                  <Flex
                    position="relative"
                    gap="3"
                    justifyContent="space-between"
                    alignItems="center"
                    flexWrap="wrap"
                  >
                    <HStack gap="3">
                      <Link className={css({ flexShrink: 0 })} href={cardHref(card.id)}>
                        <CardThumbTile card={card} preferTrained={preferTrained} size={50} />
                      </Link>
                      <Stack gap="0.5">
                        <HStack gap="1.5" flexWrap="wrap">
                          {item.event?.nickname && (
                            <Link
                              className={css({
                                rounded: 'sm',
                                borderWidth: '1px',
                                py: '0.5',
                                px: '1.5',
                                textDecoration: 'none',
                                fontSize: '2xs',
                                fontWeight: 'bold',
                                lineHeight: '1.2',
                                transition: 'opacity 0.15s ease',
                                _hover: { opacity: 0.8 }
                              })}
                              href={eventHref(item.event.id)}
                              style={{
                                borderColor: `${evCharColor}88`,
                                color: evCharColor,
                                backgroundColor: `${evCharColor}18`
                              }}
                            >
                              {item.event.nickname}
                            </Link>
                          )}
                          <Link
                            className={css({
                              color: 'fg.default',
                              fontSize: 'sm',
                              fontWeight: 'bold',
                              _hover: { textDecoration: 'underline' }
                            })}
                            href={cardHref(card.id)}
                          >
                            {localizedTitle(card.prefixJa, card.prefixEn, i18n.language)}
                          </Link>
                        </HStack>
                        <span className={css({ color: 'fg.muted', fontSize: 'xs' })}>
                          {item.event ? (
                            <Link
                              className={css({
                                color: 'fg.muted',
                                fontSize: 'xs',
                                _hover: { color: 'fg.default', textDecoration: 'underline' }
                              })}
                              href={eventHref(item.event.id)}
                            >
                              {localizedTitle(item.event.nameJa, item.event.nameEn, i18n.language)}
                            </Link>
                          ) : (
                            formatDateShort(item.timestamp, i18n.language)
                          )}
                        </span>
                      </Stack>
                    </HStack>

                    <HStack gap="2.5">
                      {item.gapDays !== undefined && (
                        <span
                          className={css({
                            rounded: 'full',
                            py: '0.5',
                            px: '2',
                            fontSize: 'xs',
                            fontWeight: 'bold',
                            fontVariantNumeric: 'tabular-nums',
                            bg: 'bg.default'
                          })}
                        >
                          +{item.gapDays}d gap
                        </span>
                      )}
                      <span
                        className={css({
                          color: 'fg.muted',
                          fontSize: 'xs',
                          fontVariantNumeric: 'tabular-nums'
                        })}
                      >
                        {formatDateShort(item.timestamp, i18n.language)}
                      </span>
                    </HStack>
                  </Flex>
                </Box>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
