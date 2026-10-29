import { join } from 'path-browserify';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BiMenu, BiRefresh, BiStar, BiX } from 'react-icons/bi';
import { css } from 'styled-system/css';
import { Box, Container, HStack, Stack } from 'styled-system/jsx';
import { ColorModeToggle } from '~/components/layout/ColorModeToggle';
import { Footer } from '~/components/layout/Footer';
import { LanguageToggle } from '~/components/layout/LanguageToggle';
import { CharacterIcon } from '~/components/sekai/SekaiVisuals';
import { Drawer } from '~/components/ui/drawer';
import { Link } from '~/components/ui/link';
import { Button } from '~/components/ui/styled/button';
import { IconButton } from '~/components/ui/styled/icon-button';
import { useCountdownData } from '~/context/CountdownDataContext';
import { charDisplayName } from '~/utils/countdown/format';
import { characterHref, homeHref } from '~/utils/countdown/routes';

const NAV = [
  { path: '/', key: 'overview', exact: true },
  { path: '/focus', key: 'focus', exact: false },
  { path: '/cards', key: 'cards', exact: false },
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
              <Button
                size="xs"
                variant="outline"
                onClick={() => setPreferTrained(!preferTrained)}
                title={preferTrained ? t('header.trained_art') : t('header.untrained_art')}
              >
                <BiStar />
                <Box as="span" hideBelow="sm">
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
                <Box as="span" hideBelow="md">
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

      {/* Quick 26-Character Avatar Strip for 1-click Character Dossier jump */}
      <Box borderColor="border.subtle" borderBottomWidth="1px" bg="bg.subtle/60">
        <Container w="full" py="1.5" px="4">
          <HStack className={css({ scrollbarWidth: 'none' })} gap="1.5" py="0.5" overflowX="auto">
            {snapshot.characters.map((ch) => {
              const active = currentPath.endsWith(`/characters/${ch.id}`);
              return (
                <Link
                  className={css({
                    flexShrink: 0,
                    rounded: 'full',
                    transition: 'transform 0.12s ease',
                    _hover: { transform: 'scale(1.12)' }
                  })}
                  style={active ? { transform: 'scale(1.12)' } : undefined}
                  key={ch.id}
                  href={characterHref(ch.id)}
                  title={`${charDisplayName(ch, i18n.language)} — ${t('common.view_dossier')}`}
                >
                  <CharacterIcon characterId={ch.id} size={28} />
                </Link>
              );
            })}
          </HStack>
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
