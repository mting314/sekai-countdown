import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { css } from 'styled-system/css';
import { Box, Flex, Grid, HStack, Stack } from 'styled-system/jsx';
import { SeverityPill } from '~/components/sekai/DroughtVisuals';
import { AttributeIcon, CardThumbTile, CharacterIcon } from '~/components/sekai/SekaiVisuals';
import { Link } from '~/components/ui/link';
import { Text } from '~/components/ui/text';
import { useCountdownData } from '~/context/CountdownDataContext';
import type { SekaiUnitId } from '~/types/countdown';
import { unitIconUrl } from '~/utils/countdown/assets';
import { ALL_UNITS, ATTRIBUTE_META, CARD_ATTRIBUTES, UNIT_META } from '~/utils/countdown/constants';
import {
  charDisplayName,
  formatDateShort,
  localizedTitle,
  SEVERITY_PALETTE
} from '~/utils/countdown/format';
import {
  computeCharacterDossier,
  computeExtrasMetrics,
  type DuoPairingEntry
} from '~/utils/countdown/metrics';
import { cardHref, characterHref, eventHref, homeHref, unitHref } from '~/utils/countdown/routes';

const UNIT_ALIASES: Record<string, SekaiUnitId> = {
  ln: 'leo_need',
  leo_need: 'leo_need',
  light_sound: 'leo_need',
  mmj: 'more_more_jump',
  more_more_jump: 'more_more_jump',
  idol: 'more_more_jump',
  vbs: 'vivid_bad_squad',
  vivid_bad_squad: 'vivid_bad_squad',
  street: 'vivid_bad_squad',
  wxs: 'wonderlands_showtime',
  wonderlands_showtime: 'wonderlands_showtime',
  theme_park: 'wonderlands_showtime',
  n25: 'nightcord',
  nightcord: 'nightcord',
  school_refusal: 'nightcord',
  vs: 'virtual_singer',
  virtual_singer: 'virtual_singer'
};

export function resolveUnitId(raw: string): SekaiUnitId | undefined {
  const norm = raw.toLowerCase().trim();
  return UNIT_ALIASES[norm];
}

export function UnitDossierView({ unitId }: { unitId: string }) {
  const { t, i18n } = useTranslation();
  const { snapshot, now, preferTrained, cardById, charById, musicById } = useCountdownData();

  const resolvedUnit = resolveUnitId(unitId);
  const meta = resolvedUnit ? UNIT_META[resolvedUnit] : undefined;

  const members = useMemo(
    () => (resolvedUnit ? snapshot.characters.filter((c) => c.unit === resolvedUnit) : []),
    [snapshot.characters, resolvedUnit]
  );

  const memberDossiers = useMemo(
    () =>
      members.map((m) => ({ character: m, dossier: computeCharacterDossier(snapshot, m.id, now) })),
    [members, snapshot, now]
  );

  // Same-unit pairings
  const duoClocks = useMemo<DuoPairingEntry[]>(() => {
    if (!resolvedUnit || resolvedUnit === 'virtual_singer') return [];
    const extras = computeExtrasMetrics(snapshot, now);
    const unitCharIds = new Set(members.map((m) => m.id));
    return extras.topOverdueSameUnitDuos.filter(
      (d) => unitCharIds.has(d.charA) && unitCharIds.has(d.charB)
    );
  }, [resolvedUnit, snapshot, now, members]);

  // Unit focus events
  const unitEvents = useMemo(() => {
    if (!resolvedUnit) return [];
    return snapshot.events
      .filter((e) => e.unit === resolvedUnit)
      .toSorted((a, b) => b.startAt - a.startAt);
  }, [snapshot.events, resolvedUnit]);

  if (!resolvedUnit || !meta) {
    return (
      <Stack gap="4" alignItems="center" py="12">
        <Text>{t('error_page.not_found')}</Text>
        <Link href={homeHref()}>{t('error_page.home')}</Link>
      </Stack>
    );
  }

  return (
    <Stack gap="7">
      {/* Unit Hero Banner */}
      <Box
        style={{
          borderColor: `${meta.color}88`,
          background: `radial-gradient(circle at 10% 40%, ${meta.color}25, transparent 65%)`
        }}
        position="relative"
        rounded="2xl"
        borderWidth="1px"
        p={{ base: '5', md: '7' }}
        bg="bg.subtle"
        overflow="hidden"
      >
        <Stack gap="3.5">
          <HStack gap="2.5" alignItems="center">
            <img src={unitIconUrl(resolvedUnit)} alt="" width={36} height={36} />
            <Stack gap="0">
              <Text as="h1" fontSize={{ base: '2xl', md: '3xl' }} fontWeight="black">
                {i18n.language.startsWith('ja') ? meta.nameJa : meta.nameEn}
              </Text>
              <Text color="fg.muted" fontSize="sm">
                {i18n.language.startsWith('ja') ? meta.nameEn : meta.nameJa}
              </Text>
            </Stack>
          </HStack>

          {/* Unit Switcher */}
          <HStack gap="2" pt="1" flexWrap="wrap">
            <Text color="fg.muted" fontSize="xs" fontWeight="bold">
              {t('unit_page.switch_unit')}
            </Text>
            {ALL_UNITS.map((u) => {
              const uMeta = UNIT_META[u];
              const active = u === resolvedUnit;
              return (
                <Link
                  className={
                    active
                      ? css({
                          display: 'inline-flex',
                          gap: '1.5',
                          alignItems: 'center',
                          rounded: 'full',
                          borderWidth: '1px',
                          py: '1',
                          px: '3',
                          fontSize: 'xs',
                          fontWeight: 'extrabold',
                          bg: 'bg.default',
                          _hover: { textDecoration: 'none' }
                        })
                      : css({
                          display: 'inline-flex',
                          gap: '1.5',
                          alignItems: 'center',
                          rounded: 'full',
                          borderWidth: '1px',
                          py: '1',
                          px: '3',
                          fontSize: 'xs',
                          fontWeight: 'medium',
                          bg: 'bg.default/50',
                          _hover: { textDecoration: 'none', bg: 'bg.default' }
                        })
                  }
                  key={u}
                  href={unitHref(u)}
                  style={{
                    borderColor: active ? uMeta.color : 'transparent'
                  }}
                >
                  <img src={unitIconUrl(u)} alt="" width={16} height={16} />
                  <span>{uMeta.shortEn}</span>
                </Link>
              );
            })}
          </HStack>
        </Stack>
      </Box>

      {/* 1. All Unit Members Side-by-Side */}
      <Stack gap="3">
        <Stack gap="0.5">
          <Text as="h2" fontSize="xl" fontWeight="extrabold">
            {t('unit_page.all_members')}
          </Text>
          <Text color="fg.muted" fontSize="xs">
            {t('unit_page.all_members_sub')}
          </Text>
        </Stack>

        <Grid gap="4" columns={{ base: 1, md: 2, lg: 4 }}>
          {memberDossiers.map(({ character, dossier }) => {
            const any4Clock = dossier?.clocks.find((c) => c.key === 'char_any_4star')?.clock;
            const lim4Clock = dossier?.clocks.find((c) => c.key === 'char_lim_4star')?.clock;
            const soloClock = dossier?.clocks.find((c) => c.key === 'char_solo_focus')?.clock;
            const heroCard = dossier?.heroCard;

            return (
              <Box
                key={character.id}
                style={{ borderColor: `${character.color}66` }}
                rounded="xl"
                borderWidth="1px"
                p="4"
                bg="bg.subtle"
              >
                <Stack gap="3">
                  <HStack justifyContent="space-between" alignItems="center">
                    <HStack gap="2.5">
                      <CharacterIcon characterId={character.id} size={42} />
                      <Stack gap="0">
                        <Link
                          className={css({
                            fontSize: 'base',
                            fontWeight: 'extrabold',
                            _hover: { textDecoration: 'underline' }
                          })}
                          href={characterHref(character.id)}
                        >
                          {charDisplayName(character, i18n.language)}
                        </Link>
                        <span className={css({ color: 'fg.muted', fontSize: '2xs' })}>
                          #{character.abbrev}
                        </span>
                      </Stack>
                    </HStack>
                    {heroCard && (
                      <Link href={cardHref(heroCard.id)}>
                        <CardThumbTile card={heroCard} preferTrained={preferTrained} size={44} />
                      </Link>
                    )}
                  </HStack>

                  {/* Key Clocks */}
                  <Stack gap="1.5" pt="1">
                    {soloClock && (
                      <HStack justifyContent="space-between" fontSize="xs">
                        <span className={css({ color: 'fg.muted' })}>{t('clocks.solo_focus')}</span>
                        <HStack gap="1.5">
                          <span
                            className={css({
                              fontWeight: 'black',
                              fontVariantNumeric: 'tabular-nums'
                            })}
                          >
                            {t('common.days', { count: soloClock.daysSince })}
                          </span>
                          <SeverityPill clock={soloClock} />
                        </HStack>
                      </HStack>
                    )}
                    {lim4Clock && (
                      <HStack justifyContent="space-between" fontSize="xs">
                        <span className={css({ color: 'fg.muted' })}>{t('clocks.lim_4star')}</span>
                        <HStack gap="1.5">
                          <span
                            className={css({
                              fontWeight: 'black',
                              fontVariantNumeric: 'tabular-nums'
                            })}
                          >
                            {t('common.days', { count: lim4Clock.daysSince })}
                          </span>
                          <SeverityPill clock={lim4Clock} />
                        </HStack>
                      </HStack>
                    )}
                    {any4Clock && (
                      <HStack justifyContent="space-between" fontSize="xs">
                        <span className={css({ color: 'fg.muted' })}>{t('clocks.any_4star')}</span>
                        <HStack gap="1.5">
                          <span
                            className={css({
                              fontWeight: 'black',
                              fontVariantNumeric: 'tabular-nums'
                            })}
                          >
                            {t('common.days', { count: any4Clock.daysSince })}
                          </span>
                          <SeverityPill clock={any4Clock} />
                        </HStack>
                      </HStack>
                    )}
                  </Stack>

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
                    href={characterHref(character.id)}
                  >
                    {charDisplayName(character, i18n.language, true)} Dossier →
                  </Link>
                </Stack>
              </Box>
            );
          })}
        </Grid>
      </Stack>

      {/* 2. Unit 5-Attribute Matrix */}
      <Stack gap="3">
        <Stack gap="0.5">
          <Text as="h2" fontSize="xl" fontWeight="extrabold">
            {t('unit_page.attr_matrix')}
          </Text>
          <Text color="fg.muted" fontSize="xs">
            {t('unit_page.attr_matrix_sub')}
          </Text>
        </Stack>

        <Box
          borderColor="border.subtle"
          rounded="xl"
          borderWidth="1px"
          bg="bg.subtle"
          overflowX="auto"
        >
          <table className={css({ w: 'full', fontSize: 'xs', borderCollapse: 'collapse' })}>
            <thead>
              <tr
                className={css({
                  borderColor: 'border.default',
                  borderBottomWidth: '1px',
                  bg: 'bg.muted/60'
                })}
              >
                <th className={css({ p: '3', fontWeight: 'bold', textAlign: 'left' })}>
                  {t('search.cat_character')}
                </th>
                {CARD_ATTRIBUTES.map((attr) => {
                  const aMeta = ATTRIBUTE_META[attr];
                  return (
                    <th key={attr} className={css({ minW: '120px', p: '3', textAlign: 'center' })}>
                      <HStack gap="1.5" justifyContent="center">
                        <AttributeIcon attr={attr} size={16} />
                        <span>
                          {i18n.language.startsWith('ja') ? aMeta.labelJa : aMeta.labelEn}
                        </span>
                      </HStack>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {memberDossiers.map(({ character, dossier }) => (
                <tr
                  key={character.id}
                  className={css({
                    borderColor: 'border.subtle',
                    borderBottomWidth: '1px',
                    _last: { borderBottomWidth: '0' }
                  })}
                >
                  <td className={css({ p: '3', whiteSpace: 'nowrap' })}>
                    <HStack gap="2">
                      <CharacterIcon characterId={character.id} size={28} />
                      <Link
                        className={css({
                          fontWeight: 'bold',
                          _hover: { textDecoration: 'underline' }
                        })}
                        href={characterHref(character.id)}
                      >
                        {charDisplayName(character, i18n.language, true)}
                      </Link>
                    </HStack>
                  </td>
                  {CARD_ATTRIBUTES.map((attr) => {
                    const cell = dossier?.attributes.find((a) => a.attr === attr);
                    const clock = cell?.clockAll4Star;
                    const card = clock?.latest?.cardId
                      ? cardById.get(clock.latest.cardId)
                      : undefined;
                    const pal = clock ? SEVERITY_PALETTE[clock.severity] : undefined;

                    return (
                      <td key={attr} className={css({ p: '2.5', textAlign: 'center' })}>
                        {clock && clock.count > 0 ? (
                          <HStack gap="2" justifyContent="center">
                            {card && (
                              <Link href={cardHref(card.id)}>
                                <CardThumbTile
                                  card={card}
                                  preferTrained={preferTrained}
                                  size={36}
                                />
                              </Link>
                            )}
                            <Stack gap="0" alignItems="flex-start">
                              <span
                                className={css({
                                  fontSize: 'xs',
                                  fontWeight: 'black',
                                  fontVariantNumeric: 'tabular-nums'
                                })}
                                style={{ color: pal?.text }}
                              >
                                {t('common.days', { count: clock.daysSince })}
                              </span>
                              <span className={css({ color: 'fg.muted', fontSize: '2xs' })}>
                                ×{clock.count}
                              </span>
                            </Stack>
                          </HStack>
                        ) : (
                          <span className={css({ color: 'fg.muted', fontSize: '2xs' })}>
                            {t('common.never')}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </Stack>

      {/* 3. Co-4★ Pairings within Unit */}
      {duoClocks.length > 0 && (
        <Stack gap="3">
          <Stack gap="0.5">
            <Text as="h2" fontSize="xl" fontWeight="extrabold">
              {t('unit_page.pairings')}
            </Text>
            <Text color="fg.muted" fontSize="xs">
              {t('unit_page.pairings_sub')}
            </Text>
          </Stack>

          <Grid gap="3" columns={{ base: 1, sm: 2, lg: 3 }}>
            {duoClocks.map((duo) => {
              const charA = charById.get(duo.charA);
              const charB = charById.get(duo.charB);
              if (!charA || !charB) return null;

              return (
                <Box
                  key={`${duo.charA}-${duo.charB}`}
                  borderColor="border.default"
                  rounded="xl"
                  borderWidth="1px"
                  p="3.5"
                  bg="bg.subtle"
                >
                  <Stack gap="2.5">
                    <HStack justifyContent="space-between" alignItems="center">
                      <HStack gap="2">
                        <CharacterIcon characterId={charA.id} size={30} />
                        <span className={css({ fontSize: 'xs', fontWeight: 'bold' })}>×</span>
                        <CharacterIcon characterId={charB.id} size={30} />
                        <span className={css({ fontSize: 'xs', fontWeight: 'bold' })}>
                          {charDisplayName(charA, i18n.language, true)} &{' '}
                          {charDisplayName(charB, i18n.language, true)}
                        </span>
                      </HStack>
                    </HStack>

                    <HStack justifyContent="space-between" alignItems="baseline">
                      <span
                        className={css({
                          fontSize: 'xl',
                          fontWeight: 'black',
                          fontVariantNumeric: 'tabular-nums'
                        })}
                      >
                        {t('common.days', { count: duo.daysSince })}
                      </span>
                      {duo.latestEvent && (
                        <Link
                          className={css({
                            color: 'fg.muted',
                            fontSize: 'xs',
                            _hover: { textDecoration: 'underline' }
                          })}
                          href={eventHref(duo.latestEvent.id)}
                        >
                          {duo.latestEvent.nickname ? `[${duo.latestEvent.nickname}] ` : ''}
                          {localizedTitle(
                            duo.latestEvent.nameJa,
                            duo.latestEvent.nameEn,
                            i18n.language
                          )}
                        </Link>
                      )}
                    </HStack>
                  </Stack>
                </Box>
              );
            })}
          </Grid>
        </Stack>
      )}

      {/* 4. Unit Focus & Hakolim History */}
      {unitEvents.length > 0 && (
        <Stack gap="3">
          <Text as="h2" fontSize="xl" fontWeight="extrabold">
            {t('unit_page.focus_history')} ({unitEvents.length})
          </Text>

          <Stack gap="2.5">
            {unitEvents.map((ev) => {
              const focusChar = ev.focusCharacterId
                ? snapshot.characters.find((c) => c.id === ev.focusCharacterId)
                : undefined;
              const song = ev.songId ? musicById.get(ev.songId) : undefined;
              const charColor = focusChar?.color ?? meta.color;

              return (
                <Box
                  key={ev.id}
                  borderColor="border.subtle"
                  rounded="xl"
                  borderWidth="1px"
                  p="3"
                  bg="bg.subtle"
                >
                  <Flex gap="3" justifyContent="space-between" alignItems="center" flexWrap="wrap">
                    <HStack gap="3">
                      {focusChar && <CharacterIcon characterId={focusChar.id} size={38} />}
                      <Stack gap="0.5">
                        <HStack gap="2" flexWrap="wrap">
                          {ev.nickname && (
                            <Link
                              className={css({
                                rounded: 'sm',
                                borderWidth: '1px',
                                py: '0.5',
                                px: '1.5',
                                textDecoration: 'none',
                                fontSize: '2xs',
                                fontWeight: 'bold'
                              })}
                              href={eventHref(ev.id)}
                              style={{
                                borderColor: `${charColor}88`,
                                color: charColor,
                                backgroundColor: `${charColor}1a`
                              }}
                            >
                              {ev.nickname}
                            </Link>
                          )}
                          <Link
                            className={css({
                              fontSize: 'sm',
                              fontWeight: 'bold',
                              _hover: { textDecoration: 'underline' }
                            })}
                            href={eventHref(ev.id)}
                          >
                            {localizedTitle(ev.nameJa, ev.nameEn, i18n.language)}
                          </Link>
                          {ev.isHakolim && (
                            <span
                              className={css({
                                borderColor: 'purple.500/50',
                                rounded: 'full',
                                borderWidth: '1px',
                                py: '0.2',
                                px: '2',
                                color: 'purple.200',
                                fontSize: '2xs',
                                fontWeight: 'extrabold',
                                bg: 'purple.900/40'
                              })}
                            >
                              Hakolim
                            </span>
                          )}
                        </HStack>
                        {song && (
                          <span className={css({ color: 'fg.muted', fontSize: 'xs' })}>
                            ♪ {localizedTitle(song.titleJa, song.titleEn, i18n.language)}
                          </span>
                        )}
                      </Stack>
                    </HStack>

                    <HStack gap="3">
                      <span className={css({ color: 'fg.muted', fontSize: 'xs' })}>
                        {formatDateShort(ev.startAt, i18n.language)}
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
                        href={eventHref(ev.id)}
                      >
                        Event Dossier →
                      </Link>
                    </HStack>
                  </Flex>
                </Box>
              );
            })}
          </Stack>
        </Stack>
      )}
    </Stack>
  );
}
