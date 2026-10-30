import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BiCalendar, BiLeftArrowAlt, BiLinkExternal, BiRightArrowAlt } from 'react-icons/bi';
import { css } from 'styled-system/css';
import { Box, Flex, Grid, HStack, Stack, Wrap } from 'styled-system/jsx';
import { CharacterIcon, UnitBadge } from '~/components/sekai/SekaiVisuals';
import { Link } from '~/components/ui/link';
import { Text } from '~/components/ui/text';
import { useCountdownData } from '~/context/CountdownDataContext';
import { eventHomeBannerUrl, eventStoryBannerUrl, songJacketUrl } from '~/utils/countdown/assets';
import { UNIT_META } from '~/utils/countdown/constants';
import { charDisplayName, formatDateShort, localizedTitle } from '~/utils/countdown/format';
import { characterHref, eventHref, songHref, songsHref } from '~/utils/countdown/routes';

export function SongDossierView({ songId }: { songId: number }) {
  const { t, i18n } = useTranslation();
  const { snapshot, now, charById, musicById, anotherVocalsByMusicId, eventBySongId } =
    useCountdownData();

  const song = musicById.get(songId);
  const [jacketBroken, setJacketBroken] = useState(false);

  if (!song) {
    return (
      <Stack gap="4" py="8" textAlign="center">
        <Text fontSize="xl" fontWeight="bold">
          Song not found (#{songId})
        </Text>
        <Box>
          <Link className={css({ textDecoration: 'underline' })} href={songsHref()}>
            ← Back to Songs Catalog
          </Link>
        </Box>
      </Stack>
    );
  }

  const altVocals = anotherVocalsByMusicId.get(song.id) ?? [];
  const event = eventBySongId.get(song.id);
  const mainUnit = song.units[0];
  const unitMeta = mainUnit ? UNIT_META[mainUnit] : undefined;
  const unitColor = unitMeta?.color ?? '#33ccbb';
  const jacketUrl = jacketBroken ? undefined : songJacketUrl(song.assetbundleName);

  // Prev / next song
  const allMusics = snapshot.musics;
  const currentIndex = allMusics.findIndex((m) => m.id === song.id);
  const prevSong = currentIndex > 0 ? allMusics[currentIndex - 1] : undefined;
  const nextSong = currentIndex < allMusics.length - 1 ? allMusics[currentIndex + 1] : undefined;

  const daysSinceRelease = Math.max(
    0,
    Math.floor((now - song.publishedAt) / (1000 * 60 * 60 * 24))
  );

  return (
    <Stack gap="8" py="4">
      {/* Breadcrumb Navigation */}
      <HStack gap="2" color="fg.muted" fontSize="xs">
        <Link className={css({ _hover: { textDecoration: 'underline' } })} href={songsHref()}>
          {t('navigation.songs')}
        </Link>
        <span>/</span>
        <span className={css({ color: 'fg.default', fontWeight: 'bold' })}>
          {localizedTitle(song.titleJa, song.titleEn, i18n.language)}
        </span>
      </HStack>

      {/* Hero Section: Jacket + Song Info */}
      <Box
        style={{
          background: `linear-gradient(135deg, ${unitColor}18 0%, rgba(20,20,28,0.95) 100%)`,
          borderColor: `${unitColor}44`
        }}
        position="relative"
        borderColor="border.subtle"
        rounded="2xl"
        borderWidth="1px"
        p={{ base: '4', md: '6' }}
        bg="bg.subtle"
        overflow="hidden"
      >
        <Flex
          gap={{ base: '5', md: '8' }}
          direction={{ base: 'column', sm: 'row' }}
          alignItems={{ base: 'center', sm: 'flex-start' }}
        >
          {/* High-res Jacket Art */}
          <Box
            position="relative"
            flexShrink={0}
            borderColor={`${unitColor}66`}
            rounded="xl"
            borderWidth="2px"
            boxShadow="0 8px 24px rgba(0,0,0,0.5)"
            overflow="hidden"
          >
            {jacketUrl ? (
              <img
                src={jacketUrl}
                alt={song.titleJa}
                width={200}
                height={200}
                referrerPolicy="no-referrer"
                onError={() => setJacketBroken(true)}
                style={{
                  width: '200px',
                  height: '200px',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
            ) : (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                w="200px"
                h="200px"
                color="fg.muted"
                bg="bg.muted"
              >
                ♪
              </Box>
            )}
          </Box>

          {/* Details Column */}
          <Stack flex="1" gap="3" minW="0" textAlign={{ base: 'center', sm: 'left' }}>
            <HStack gap="2" justifyContent={{ base: 'center', sm: 'flex-start' }} flexWrap="wrap">
              {song.units.map((u) => (
                <UnitBadge key={u} unit={u} size="sm" />
              ))}
              {song.commissioned && (
                <span
                  className={css({
                    borderColor: 'amber.500/50',
                    rounded: 'sm',
                    borderWidth: '1px',
                    py: '0.5',
                    px: '2',
                    color: 'amber.400',
                    fontSize: '2xs',
                    fontWeight: 'extrabold',
                    bg: 'amber.950/40'
                  })}
                >
                  {t('songs_page.commissioned_badge')}
                </span>
              )}
              {song.categories.map((c) => (
                <span
                  key={c}
                  className={css({
                    borderColor: 'border.subtle',
                    rounded: 'sm',
                    borderWidth: '1px',
                    py: '0.5',
                    px: '2',
                    color: 'fg.muted',
                    fontSize: '2xs',
                    fontWeight: 'bold',
                    bg: 'bg.default'
                  })}
                >
                  {c.toUpperCase()}
                </span>
              ))}
            </HStack>

            <Text as="h1" fontSize={{ base: '2xl', md: '3xl' }} fontWeight="black">
              {localizedTitle(song.titleJa, song.titleEn, i18n.language)}
            </Text>

            {song.titleEn && i18n.language.startsWith('ja') && (
              <Text color="fg.muted" fontSize="sm">
                {song.titleEn}
              </Text>
            )}
            {!i18n.language.startsWith('ja') && (
              <Text color="fg.muted" fontSize="sm">
                {song.titleJa}
              </Text>
            )}

            <Wrap gap="4" pt="2" color="fg.muted" fontSize="xs">
              <HStack gap="1.5">
                <BiCalendar />
                <span>
                  {t('songs_page.released_on', {
                    date: formatDateShort(song.publishedAt, i18n.language)
                  })}
                </span>
              </HStack>
              <span>•</span>
              <span>{t('common.days', { count: daysSinceRelease })}</span>
              <span>•</span>
              <span className={css({ fontFamily: 'mono' })}>#{song.assetbundleName}</span>
            </Wrap>

            {/* External Links */}
            <HStack gap="3" pt="2">
              <a
                href={`https://sekai.best/music/${song.id}`}
                target="_blank"
                rel="noreferrer"
                className={css({
                  display: 'inline-flex',
                  gap: '1.5',
                  alignItems: 'center',
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
              >
                Sekai.best <BiLinkExternal />
              </a>
            </HStack>
          </Stack>
        </Flex>
      </Box>

      {/* Associated Event (if commissioned) */}
      {event && (
        <Stack gap="3">
          <Text as="h2" fontSize="lg" fontWeight="extrabold">
            {t('songs_page.associated_event')}
          </Text>

          <Box borderColor="border.subtle" rounded="xl" borderWidth="1px" p="4" bg="bg.subtle">
            <Flex
              gap="4"
              direction={{ base: 'column', md: 'row' }}
              justifyContent="space-between"
              alignItems={{ base: 'flex-start', md: 'center' }}
            >
              <HStack gap="3">
                <img
                  src={eventHomeBannerUrl(event.assetbundleName)}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget;
                    const fallback = eventStoryBannerUrl(event);
                    if (fallback && target.src !== fallback) {
                      target.src = fallback;
                    }
                  }}
                  style={{
                    width: 140,
                    height: 60,
                    objectFit: 'cover',
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.12)',
                    flexShrink: 0
                  }}
                />
                <Stack gap="1">
                  <HStack gap="2">
                    {event.nickname && (
                      <span
                        className={css({
                          borderColor: `${unitColor}66`,
                          rounded: 'sm',
                          borderWidth: '1px',
                          py: '0.2',
                          px: '1.5',
                          color: unitColor,
                          fontSize: '2xs',
                          fontWeight: 'bold',
                          bg: `${unitColor}18`
                        })}
                      >
                        {event.nickname}
                      </span>
                    )}
                    <Link
                      className={css({
                        fontSize: 'base',
                        fontWeight: 'bold',
                        _hover: { textDecoration: 'underline' }
                      })}
                      href={eventHref(event.id)}
                    >
                      {localizedTitle(event.nameJa, event.nameEn, i18n.language)}
                    </Link>
                  </HStack>
                  <Text color="fg.muted" fontSize="xs">
                    {formatDateShort(event.startAt, i18n.language)}
                  </Text>
                </Stack>
              </HStack>

              <Link
                className={css({
                  borderColor: 'border.default',
                  rounded: 'md',
                  borderWidth: '1px',
                  py: '1.5',
                  px: '3',
                  fontSize: 'xs',
                  fontWeight: 'bold',
                  bg: 'bg.default',
                  _hover: { textDecoration: 'none', bg: 'bg.muted' }
                })}
                href={eventHref(event.id)}
              >
                {t('common.read_more')} →
              </Link>
            </Flex>
          </Box>
        </Stack>
      )}

      {/* Sekai Vocal Lineup */}
      <Stack gap="3">
        <Text as="h2" fontSize="lg" fontWeight="extrabold">
          {t('songs_page.vocalists')} ({song.sekaiVocalCharacterIds.length})
        </Text>

        {song.sekaiVocalCharacterIds.length === 0 ? (
          <Box color="fg.muted" fontSize="sm">
            Virtual Singer Original
          </Box>
        ) : (
          <Grid gap="3" columns={{ base: 2, sm: 3, md: 4, lg: 6 }}>
            {song.sekaiVocalCharacterIds.map((charId) => {
              const character = charById.get(charId);
              if (!character) return null;

              return (
                <Link
                  className={css({
                    display: 'flex',
                    gap: '2.5',
                    alignItems: 'center',
                    borderColor: 'border.subtle',
                    rounded: 'xl',
                    borderWidth: '1px',
                    p: '2.5',
                    bg: 'bg.subtle',
                    transition: 'all 0.12s ease',
                    _hover: {
                      transform: 'translateY(-2px)',
                      borderColor: character.color,
                      textDecoration: 'none'
                    }
                  })}
                  key={character.id}
                  href={characterHref(character.id)}
                >
                  <CharacterIcon characterId={character.id} size={36} />
                  <Stack gap="0" minW="0">
                    <Text fontSize="xs" fontWeight="bold" truncate>
                      {charDisplayName(character, i18n.language)}
                    </Text>
                    <Text color="fg.muted" fontSize="2xs">
                      #{character.abbrev}
                    </Text>
                  </Stack>
                </Link>
              );
            })}
          </Grid>
        )}
      </Stack>

      {/* Another Vocal Versions */}
      <Stack gap="3">
        <Text as="h2" fontSize="lg" fontWeight="extrabold">
          {t('songs_page.another_vocals')} ({altVocals.length})
        </Text>

        {altVocals.length === 0 ? (
          <Box
            borderColor="border.subtle"
            rounded="xl"
            borderWidth="1px"
            p="4"
            color="fg.muted"
            fontSize="sm"
            bg="bg.subtle"
          >
            No another vocal versions implemented yet.
          </Box>
        ) : (
          <Grid gap="3" columns={{ base: 1, sm: 2, lg: 3 }}>
            {altVocals.map((av, idx) => {
              const chars = av.characterIds
                .map((id) => charById.get(id))
                .filter((c): c is NonNullable<typeof c> => c != null);

              return (
                <Box
                  key={av.id}
                  borderColor="border.subtle"
                  rounded="xl"
                  borderWidth="1px"
                  p="3.5"
                  bg="bg.subtle"
                >
                  <Stack gap="2.5">
                    <HStack justifyContent="space-between" alignItems="center">
                      <span
                        className={css({
                          rounded: 'sm',
                          py: '0.5',
                          px: '1.5',
                          color: 'fg.muted',
                          fontSize: '2xs',
                          fontWeight: 'bold',
                          bg: 'bg.muted'
                        })}
                      >
                        Version #{idx + 1}
                      </span>
                      <span className={css({ color: 'fg.muted', fontSize: '2xs' })}>
                        {formatDateShort(av.publishedAt, i18n.language)}
                      </span>
                    </HStack>

                    <HStack gap="2" flexWrap="wrap">
                      {chars.map((ch) => (
                        <Link
                          className={css({
                            display: 'flex',
                            gap: '1.5',
                            alignItems: 'center',
                            borderColor: `${ch.color}55`,
                            rounded: 'full',
                            borderWidth: '1px',
                            p: '1',
                            pr: '2.5',
                            bg: `${ch.color}14`,
                            _hover: { textDecoration: 'none' }
                          })}
                          key={ch.id}
                          href={characterHref(ch.id)}
                        >
                          <CharacterIcon characterId={ch.id} size={24} />
                          <span
                            className={css({
                              fontSize: 'xs',
                              fontWeight: 'bold'
                            })}
                            style={{ color: ch.color }}
                          >
                            {charDisplayName(ch, i18n.language, true)}
                          </span>
                        </Link>
                      ))}
                    </HStack>
                  </Stack>
                </Box>
              );
            })}
          </Grid>
        )}
      </Stack>

      {/* Prev / Next Song Navigation */}
      <HStack
        justifyContent="space-between"
        borderColor="border.subtle"
        borderTopWidth="1px"
        pt="4"
      >
        {prevSong ? (
          <Link
            className={css({
              display: 'flex',
              gap: '1.5',
              alignItems: 'center',
              fontSize: 'sm',
              fontWeight: 'bold',
              _hover: { textDecoration: 'underline' }
            })}
            href={songHref(prevSong.id)}
          >
            <BiLeftArrowAlt size={20} />
            <span>
              {t('songs_page.prev_song')}:{' '}
              {localizedTitle(prevSong.titleJa, prevSong.titleEn, i18n.language)}
            </span>
          </Link>
        ) : (
          <Box />
        )}

        {nextSong ? (
          <Link
            className={css({
              display: 'flex',
              gap: '1.5',
              alignItems: 'center',
              fontSize: 'sm',
              fontWeight: 'bold',
              _hover: { textDecoration: 'underline' }
            })}
            href={songHref(nextSong.id)}
          >
            <span>
              {t('songs_page.next_song')}:{' '}
              {localizedTitle(nextSong.titleJa, nextSong.titleEn, i18n.language)}
            </span>
            <BiRightArrowAlt size={20} />
          </Link>
        ) : (
          <Box />
        )}
      </HStack>
    </Stack>
  );
}
