import { join } from 'path-browserify';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BiMenu, BiRefresh, BiStar, BiX } from 'react-icons/bi';
import { css } from 'styled-system/css';
import { Box, Container, Grid, HStack, Stack } from 'styled-system/jsx';
import { ColorModeToggle } from '~/components/layout/ColorModeToggle';
import { Footer } from '~/components/layout/Footer';
import { LanguageToggle } from '~/components/layout/LanguageToggle';
import { GlobalSearchDialog } from '~/components/search/GlobalSearchDialog';
import { CharacterIcon } from '~/components/sekai/SekaiVisuals';
import { Drawer } from '~/components/ui/drawer';
import { Link } from '~/components/ui/link';
import { Button } from '~/components/ui/styled/button';
import { IconButton } from '~/components/ui/styled/icon-button';
import { useCountdownData } from '~/context/CountdownDataContext';
import { unitIconUrl } from '~/utils/countdown/assets';
import { ALL_UNITS, UNIT_META } from '~/utils/countdown/constants';
import { charDisplayName } from '~/utils/countdown/format';
import { characterHref, homeHref, unitHref } from '~/utils/countdown/routes';

const NAV = [
  { path: '/', key: 'overview', exact: true },
  { path: '/focus', key: 'focus', exact: false },
  { path: '/cards', key: 'cards', exact: false },
  { path: '/songs', key: 'songs', exact: false },
  { path: '/virtual-singers', key: 'virtual_singers', exact: false },
  { path: '/mixed-attrs', key: 'mixed_attrs', exact: false },
  { path: '/extras', key: 'extras', exact: false }
] as const;

export function Layout({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const { snapshot, preferTrained, setPreferTrained, syncStatus, syncLiveNow } = useCountdownData();
  const [currentPath, setCurrentPath] = useState(import.meta.env.BASE_URL);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, [children]);

  const matches = (path: string, exact: boolean) => {
    const full = join(import.meta.env.BASE_URL, path);
    return exact
      ? currentPath === full || currentPath === full + '/'
      : currentPath.startsWith(full);
  };

  function NavLinks({ vertical = false }: { vertical?: boolean }) {
    const items = NAV.map(({ path, key, exact }) => {
      const active = matches(path, exact);
      return (
        <Link
          className={
            active
              ? css({
                  rounded: 'lg',
                  py: '1.5',
                  px: '2',
                  fontSize: 'xs',
                  fontWeight: 'bold',
                  bg: 'bg.muted',
                  whiteSpace: 'nowrap',
                  _hover: { textDecoration: 'none', bg: 'bg.subtle' }
                })
              : css({
                  rounded: 'lg',
                  py: '1.5',
                  px: '2',
                  fontSize: 'xs',
                  fontWeight: 'medium',
                  bg: 'transparent',
                  whiteSpace: 'nowrap',
                  _hover: { textDecoration: 'none', bg: 'bg.subtle' }
                })
          }
          key={path}
          href={join(import.meta.env.BASE_URL, path)}
          data-active={active ? true : undefined}
          onClick={() => setIsDrawerOpen(false)}
        >
          {t(`navigation.${key}`)}
        </Link>
      );
    });
    return vertical ? <Stack gap="3">{items}</Stack> : <HStack gap="1">{items}</HStack>;
  }

  return (
    <Stack position="relative" w="full" minH="100vh" bgColor="bg.default">
      <Box
        style={{ backdropFilter: 'blur(10px)' }}
        zIndex="20"
        position="sticky"
        top="0"
        borderColor="border.subtle"
        borderBottomWidth="1px"
        bg="bg.default/90"
      >
        <Container w="full" py="2.5" px="4">
          <HStack gap="3" justifyContent="space-between" alignItems="center" w="full">
            <HStack gap="3" alignItems="center">
              <Box hideFrom="lg">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDrawerOpen(true)}
                  aria-label="Open Menu"
                >
                  <BiMenu size={22} />
                </Button>
              </Box>

              <Link
                className={css({
                  fontSize: 'md',
                  fontWeight: 'extrabold',
                  letterSpacing: 'tight',
                  whiteSpace: 'nowrap',
                  _hover: { textDecoration: 'none' }
                })}
                href={homeHref()}
              >
                <span style={{ color: '#14b8a6' }}>SEKAI</span>{' '}
                <span>{i18n.language.startsWith('ja') ? 'カウントダウン' : 'Countdown'}</span>
              </Link>

              <Box hideBelow="lg">
                <NavLinks />
              </Box>
            </HStack>

            <HStack gap="1.5" flexShrink={0} alignItems="center">
              <GlobalSearchDialog />

              <Button
                size="xs"
                variant="outline"
                onClick={() => setPreferTrained(!preferTrained)}
                title={preferTrained ? t('header.trained_art') : t('header.untrained_art')}
              >
                <BiStar />
                <Box as="span" hideBelow="xl">
                  {preferTrained ? t('header.trained_art') : t('header.untrained_art')}
                </Box>
              </Button>

              <Button
                size="xs"
                variant="subtle"
                onClick={() => void syncLiveNow()}
                disabled={syncStatus === 'syncing' || syncStatus === 'checking'}
                title={t('header.sync_live')}
              >
                <BiRefresh />
                <Box as="span" hideBelow="2xl">
                  {syncStatus === 'syncing' || syncStatus === 'checking'
                    ? t('header.syncing')
                    : syncStatus === 'live'
                      ? t('header.live_ready')
                      : t('header.snapshot_ready')}
                </Box>
              </Button>

              <Box hideBelow="sm">
                <HStack gap="1">
                  <LanguageToggle />
                  <ColorModeToggle />
                </HStack>
              </Box>
            </HStack>
          </HStack>
        </Container>
      </Box>

      {/* Unit Cards Bar (2x2 Character Grid with Unit Color Gradient & Watermark Symbol) */}
      <Box borderColor="border.subtle" borderBottomWidth="1px" bg="bg.subtle/60">
        <Container w="full" py="2.5" px="4">
          <Grid
            gap="2.5"
            gridTemplateColumns={{
              base: 'repeat(2, minmax(0, 1fr))',
              sm: 'repeat(3, minmax(0, 1fr))',
              xl: 'repeat(6, minmax(0, 1fr))'
            }}
          >
            {ALL_UNITS.map((unit) => {
              const meta = UNIT_META[unit];
              const members = snapshot.characters.filter((c) => c.unit === unit);
              const isUnitActive = currentPath.includes(`/units/${unit}`);
              const hasActiveChar =
                isUnitActive || members.some((ch) => currentPath.endsWith(`/characters/${ch.id}`));

              const isVS = unit === 'virtual_singer';

              return (
                <Box
                  className={css({
                    _hover: {
                      transform: 'translateY(-1px)',
                      borderColor: `${meta.color}99`,
                      boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
                    }
                  })}
                  key={unit}
                  style={{
                    borderColor: hasActiveChar ? meta.color : `${meta.color}35`,
                    background: hasActiveChar
                      ? `linear-gradient(135deg, ${meta.color}28 0%, ${meta.color}10 60%, rgba(20,20,26,0.96) 100%)`
                      : `linear-gradient(135deg, ${meta.color}15 0%, ${meta.color}05 60%, rgba(18,18,24,0.92) 100%)`,
                    boxShadow: hasActiveChar ? `0 0 16px ${meta.color}22` : undefined
                  }}
                  position="relative"
                  rounded="2xl"
                  borderWidth="1px"
                  p="2.5"
                  overflow="hidden"
                  transition="all 0.18s cubic-bezier(0.16, 1, 0.3, 1)"
                >
                  {/* Subtle Unit Emblem Watermark in Corner */}
                  <img
                    src={unitIconUrl(unit)}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    style={{
                      position: 'absolute',
                      right: -8,
                      bottom: -8,
                      width: 54,
                      height: 54,
                      opacity: 0.1,
                      pointerEvents: 'none',
                      transform: 'rotate(-8deg)',
                      filter: 'grayscale(0.2)'
                    }}
                  />

                  <Stack zIndex={1} position="relative" gap="2">
                    {/* Unit Header / Link */}
                    <Link
                      className={css({
                        display: 'flex',
                        gap: '1.5',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        rounded: 'lg',
                        py: '0.5',
                        px: '1',
                        transition: 'background 0.12s ease',
                        _hover: { textDecoration: 'none', bg: 'bg.muted/60' }
                      })}
                      href={unitHref(unit)}
                      title={`View ${meta.nameEn} all members dossier`}
                    >
                      <HStack gap="1.5" minW="0">
                        <img
                          src={unitIconUrl(unit)}
                          alt=""
                          width={16}
                          height={16}
                          loading="lazy"
                          className={css({ flexShrink: 0 })}
                        />
                        <span
                          className={css({
                            fontSize: 'xs',
                            fontWeight: 'extrabold',
                            truncate: true
                          })}
                          style={{ color: hasActiveChar ? meta.color : undefined }}
                        >
                          {i18n.language.startsWith('ja') ? meta.shortJa : meta.shortEn}
                        </span>
                      </HStack>
                      <span
                        className={css({
                          color: 'fg.muted',
                          fontSize: '2xs',
                          fontWeight: 'bold',
                          opacity: 0.7
                        })}
                      >
                        →
                      </span>
                    </Link>

                    {/* Character Avatars Grid: 2x2 for main units, 3x2 for Virtual Singer */}
                    <Grid
                      gap="1.5"
                      alignItems="center"
                      gridTemplateColumns={
                        isVS ? 'repeat(3, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))'
                      }
                      justifyItems="center"
                    >
                      {members.map((ch) => {
                        const active = currentPath.endsWith(`/characters/${ch.id}`);
                        const iconSize = isVS ? 26 : 30;

                        return (
                          <Link
                            className={css({
                              display: 'inline-flex',
                              position: 'relative',
                              justifyContent: 'center',
                              alignItems: 'center',
                              rounded: 'full',
                              p: '0.5',
                              transition: 'all 0.15s ease',
                              _hover: {
                                zIndex: 2,
                                transform: 'scale(1.15)'
                              }
                            })}
                            key={ch.id}
                            href={characterHref(ch.id)}
                            title={`${charDisplayName(ch, i18n.language)} — ${t('common.view_dossier')}`}
                            style={{
                              boxShadow: active
                                ? `0 0 0 2px ${ch.color}, 0 0 8px ${ch.color}88`
                                : undefined,
                              transform: active ? 'scale(1.08)' : undefined
                            }}
                          >
                            <CharacterIcon characterId={ch.id} size={iconSize} />
                          </Link>
                        );
                      })}
                    </Grid>
                  </Stack>
                </Box>
              );
            })}
          </Grid>
        </Container>
      </Box>

      <Container zIndex="1" position="relative" flex={1} w="full" py="5" px="4">
        {children}
      </Container>

      <Footer />

      {/* Mobile Navigation Drawer */}
      <Drawer.Root open={isDrawerOpen} onOpenChange={(e) => setIsDrawerOpen(e.open)}>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content>
            <Drawer.Header>
              <HStack justifyContent="space-between" alignItems="center" w="full">
                <Drawer.Title>{t('common.menu')}</Drawer.Title>
                <Drawer.CloseTrigger asChild>
                  <IconButton variant="ghost" size="sm" aria-label="Close Menu">
                    <BiX size={24} />
                  </IconButton>
                </Drawer.CloseTrigger>
              </HStack>
            </Drawer.Header>
            <Drawer.Body>
              <NavLinks vertical />
            </Drawer.Body>
            <Drawer.Footer>
              <HStack justifyContent="space-between" w="full">
                <LanguageToggle />
                <ColorModeToggle />
              </HStack>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>
    </Stack>
  );
}
