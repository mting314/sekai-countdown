import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { css } from 'styled-system/css';
import { Box, HStack } from 'styled-system/jsx';
import type {
  CardAttribute,
  CompactCard,
  CompactMusic,
  CompactStamp,
  SekaiUnitId
} from '~/types/countdown';
import {
  attributeIconUrl,
  cardArtUrl,
  cardCutoutUrl,
  cardThumbUrl,
  characterIconUrl,
  eventLogoUrl,
  rarityStarUrl,
  songJacketUrl,
  stampImageUrl,
  unitIconUrl
} from '~/utils/countdown/assets';
import { CHARACTER_COLORS, SUPPLY_BADGE_META, UNIT_META } from '~/utils/countdown/constants';

export function CharacterIcon({
  characterId,
  subUnit,
  size = 36
}: {
  characterId: number;
  subUnit?: SekaiUnitId | 'none';
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const color = CHARACTER_COLORS[characterId] ?? '#33ccbb';
  const src = broken ? characterIconUrl(characterId) : characterIconUrl(characterId, subUnit);

  return (
    <Box
      style={{
        width: size,
        height: size,
        border: `2px solid ${color}`,
        background: `${color}22`
      }}
      position="relative"
      flexShrink={0}
      rounded="full"
      overflow="hidden"
    >
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onError={() => {
          if (!broken) setBroken(true);
        }}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </Box>
  );
}

export function UnitBadge({
  unit,
  short = false,
  size = 'sm'
}: {
  unit: SekaiUnitId | 'mixed';
  short?: boolean;
  size?: 'xs' | 'sm';
}) {
  const { i18n } = useTranslation();
  const meta = UNIT_META[unit];
  const label = i18n.language.startsWith('ja')
    ? short
      ? meta.shortEn
      : meta.nameJa
    : short
      ? meta.shortEn
      : meta.nameEn;
  const iconSize = size === 'xs' ? 14 : 16;

  return (
    <HStack
      style={{
        background: `${meta.color}1f`,
        border: `1px solid ${meta.color}66`,
        paddingInline: size === 'xs' ? 6 : 8
      }}
      display="inline-flex"
      gap="1.5"
      alignItems="center"
      rounded="full"
      py="0.5"
    >
      {unit !== 'mixed' && (
        <img
          src={unitIconUrl(unit)}
          alt=""
          width={iconSize}
          height={iconSize}
          loading="lazy"
          style={{ flexShrink: 0 }}
        />
      )}
      <span
        className={
          size === 'xs'
            ? css({ fontSize: '2xs', fontWeight: 'semibold', whiteSpace: 'nowrap' })
            : css({ fontSize: 'xs', fontWeight: 'semibold', whiteSpace: 'nowrap' })
        }
      >
        {label}
      </span>
    </HStack>
  );
}

export function AttributeIcon({ attr, size = 16 }: { attr: CardAttribute; size?: number }) {
  return (
    <img
      src={attributeIconUrl(attr)}
      alt={attr}
      title={attr}
      width={size}
      height={size}
      loading="lazy"
      style={{ flexShrink: 0, display: 'block' }}
    />
  );
}

export function CardThumbTile({
  card,
  preferTrained = true,
  size = 56,
  showSupply = true
}: {
  card?: CompactCard;
  preferTrained?: boolean;
  size?: number;
  showSupply?: boolean;
}) {
  const { i18n } = useTranslation();
  const [failedTrained, setFailedTrained] = useState(false);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setFailedTrained(false);
    setBroken(false);
  }, [card?.id, preferTrained]);

  if (!card) {
    return (
      <Box
        style={{ width: size, height: size }}
        flexShrink={0}
        borderColor="border.subtle"
        rounded="lg"
        borderWidth="1px"
        bg="bg.muted"
      />
    );
  }

  const useTrained = preferTrained && !failedTrained;
  const url = broken ? undefined : cardThumbUrl(card, useTrained);
  const color = CHARACTER_COLORS[card.characterId] ?? '#33ccbb';
  const starCount =
    card.rarity === 'rarity_4'
      ? 4
      : card.rarity === 'rarity_3'
        ? 3
        : card.rarity === 'rarity_2'
          ? 2
          : 1;
  const isTrainedVisual = useTrained && (card.rarity === 'rarity_3' || card.rarity === 'rarity_4');
  const supplyMeta = SUPPLY_BADGE_META[card.supply];
  const isJa = i18n.language.startsWith('ja');

  return (
    <Box
      style={{
        width: size,
        height: size,
        border: `1.5px solid ${color}88`,
        background: `linear-gradient(135deg, ${color}44, rgba(15,23,42,0.75))`
      }}
      position="relative"
      flexShrink={0}
      rounded="lg"
      overflow="hidden"
    >
      {url && (
        <img
          src={url}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => {
            if (useTrained) setFailedTrained(true);
            else setBroken(true);
          }}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}

      {/* Attribute badge (top-left) */}
      <Box position="absolute" top="0.5" left="0.5">
        <AttributeIcon attr={card.attr} size={Math.max(12, Math.round(size * 0.26))} />
      </Box>

      {/* Supply badge (top-right, non-permanent) */}
      {showSupply && card.supply !== 'permanent' && size >= 44 && (
        <span
          className={css({
            position: 'absolute',
            top: '0.5',
            right: '0.5',
            rounded: 'sm',
            px: '1',
            fontSize: '9px',
            fontWeight: 'bold',
            letterSpacing: 'tight',
            lineHeight: '1.25'
          })}
          style={{ background: supplyMeta.bg, color: supplyMeta.fg }}
        >
          {isJa ? supplyMeta.shortJa : supplyMeta.shortEn}
        </span>
      )}

      {/* Rarity stars (bottom-left) */}
      {size >= 40 && (
        <HStack
          style={{ background: 'rgba(0,0,0,0.48)' }}
          position="absolute"
          left="0.5"
          bottom="0.5"
          gap="0"
          rounded="sm"
          px="0.5"
        >
          {card.rarity === 'rarity_birthday' ? (
            <img src={rarityStarUrl('birthday')} alt="BD" width={11} height={11} loading="lazy" />
          ) : (
            Array.from({ length: starCount }).map((_, idx) => (
              <img
                key={idx}
                src={rarityStarUrl(isTrainedVisual ? 'trained' : 'normal')}
                alt=""
                width={9}
                height={9}
                loading="lazy"
              />
            ))
          )}
        </HStack>
      )}
    </Box>
  );
}

/**
 * Full-bleed widescreen card illustration (`card_after_training` / `card_normal`)
 * designed to sit flush against the right edge of a banner/podium card and fade
 * smoothly into the panel surface on the left.
 */
export function CardCutoutRender({
  card,
  preferTrained = true,
  height
}: {
  card?: CompactCard;
  preferTrained?: boolean;
  height?: number;
}) {
  // Cascading stages:
  // 0: member_cutout PNG (preferred side, crisp portrait crop)
  // 1: member_cutout WebP (preferred side)
  // 2: member_cutout PNG (opposite side)
  // 3: member_cutout WebP (opposite side)
  // 4: card full art PNG (preferred side)
  // 5: card full art WebP (preferred side)
  const [stage, setStage] = useState(0);

  useEffect(() => {
    setStage(0);
  }, [card?.id, preferTrained]);

  if (!card || stage >= 6) return null;

  const isCutout = stage < 4;
  const useTrained = stage < 2 || (stage >= 4 && stage < 5) ? preferTrained : !preferTrained;
  const usePng = stage % 2 === 0;

  const src = isCutout
    ? cardCutoutUrl(card, useTrained, usePng)
    : cardArtUrl(card, useTrained, usePng);

  if (!src) return null;

  const fadeMask =
    'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.1) 14%, rgba(0,0,0,0.55) 36%, black 65%)';

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setStage((s) => s + 1)}
      style={{
        height: height ?? '100%',
        width: 'auto',
        maxWidth: '100%',
        objectFit: 'cover',
        objectPosition: isCutout ? 'center center' : 'center 20%',
        maskImage: fadeMask,
        WebkitMaskImage: fadeMask,
        pointerEvents: 'none',
        userSelect: 'none'
      }}
    />
  );
}

export function SongJacketTile({ music, size = 48 }: { music?: CompactMusic; size?: number }) {
  const [broken, setBroken] = useState(false);
  const url = broken ? undefined : songJacketUrl(music?.assetbundleName);
  const unitColor = music?.units[0] ? UNIT_META[music.units[0]].color : '#33ccbb';

  if (url) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        style={{
          width: size,
          height: size,
          borderRadius: 8,
          objectFit: 'cover',
          flexShrink: 0,
          border: `1px solid ${unitColor}66`
        }}
      />
    );
  }
  return (
    <Box
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${unitColor}66, ${unitColor}22)`
      }}
      flexShrink={0}
      rounded="md"
    />
  );
}

export function StampTile({ stamp, size = 56 }: { stamp?: CompactStamp; size?: number }) {
  const [broken, setBroken] = useState(false);
  const url = broken ? undefined : stampImageUrl(stamp?.assetbundleName);
  if (!url) {
    return <Box style={{ width: size, height: size }} flexShrink={0} rounded="lg" bg="bg.muted" />;
  }
  return (
    <img
      src={url}
      alt={stamp?.nameJa ?? ''}
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        flexShrink: 0
      }}
    />
  );
}

export function EventLogoImage({
  assetbundleName,
  height = 38
}: {
  assetbundleName?: string;
  height?: number;
}) {
  const [broken, setBroken] = useState(false);
  const url = broken ? undefined : eventLogoUrl(assetbundleName);
  if (!url) return null;
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      style={{
        height,
        width: 'auto',
        maxWidth: 180,
        objectFit: 'contain',
        filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.45))'
      }}
    />
  );
}
