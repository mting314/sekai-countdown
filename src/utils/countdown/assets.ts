import { join } from 'path-browserify';
import type { CardAttribute, CompactCard, CompactEvent, SekaiUnitId } from '~/types/countdown';
import { getAssetUrl } from '~/utils/assets';
import { SEKAI_ASSET_CDN } from './constants';

const canBeTrained = (card: Pick<CompactCard, 'rarity'>) =>
  card.rarity === 'rarity_3' || card.rarity === 'rarity_4';

export function cardThumbUrl(
  card: Pick<CompactCard, 'assetbundleName' | 'rarity'> | undefined,
  preferTrained = true
): string | undefined {
  if (!card?.assetbundleName) return undefined;
  const suffix = preferTrained && canBeTrained(card) ? 'after_training' : 'normal';
  return `${SEKAI_ASSET_CDN}/thumbnail/chara/${card.assetbundleName}_${suffix}.webp`;
}

export function cardArtUrl(
  card: Pick<CompactCard, 'assetbundleName' | 'rarity'> | undefined,
  preferTrained = true
): string | undefined {
  if (!card?.assetbundleName) return undefined;
  const suffix = preferTrained && canBeTrained(card) ? 'card_after_training' : 'card_normal';
  return `${SEKAI_ASSET_CDN}/character/member/${card.assetbundleName}/${suffix}.webp`;
}

export function cardCutoutUrl(
  card: Pick<CompactCard, 'assetbundleName' | 'rarity'> | undefined,
  preferTrained = true
): string | undefined {
  if (!card?.assetbundleName) return undefined;
  const suffix = preferTrained && canBeTrained(card) ? 'after_training' : 'normal';
  return `${SEKAI_ASSET_CDN}/character/member_cutout/${card.assetbundleName}/${suffix}.webp`;
}

export function eventStoryBannerUrl(
  event: Pick<CompactEvent, 'storyAssetbundleName' | 'assetbundleName'> | undefined
): string | undefined {
  const bundle = event?.storyAssetbundleName || event?.assetbundleName;
  if (!bundle) return undefined;
  return `${SEKAI_ASSET_CDN}/event_story/${bundle}/screen_image/banner_event_story.webp`;
}

export function eventHomeBannerUrl(assetbundleName?: string): string | undefined {
  if (!assetbundleName) return undefined;
  return `${SEKAI_ASSET_CDN}/home/banner/${assetbundleName}/${assetbundleName}.webp`;
}

export function eventLogoUrl(assetbundleName?: string): string | undefined {
  if (!assetbundleName) return undefined;
  return `${SEKAI_ASSET_CDN}/event/${assetbundleName}/logo/logo.webp`;
}

export function eventCharacterRenderUrl(assetbundleName?: string): string | undefined {
  if (!assetbundleName) return undefined;
  return `${SEKAI_ASSET_CDN}/event/${assetbundleName}/screen/character.webp`;
}

export function eventBgUrl(assetbundleName?: string): string | undefined {
  if (!assetbundleName) return undefined;
  return `${SEKAI_ASSET_CDN}/event/${assetbundleName}/screen/bg.webp`;
}

export function songJacketUrl(assetbundleName?: string): string | undefined {
  if (!assetbundleName) return undefined;
  return `${SEKAI_ASSET_CDN}/music/jacket/${assetbundleName}/${assetbundleName}.webp`;
}

export function stampImageUrl(assetbundleName?: string): string | undefined {
  if (!assetbundleName) return undefined;
  return `${SEKAI_ASSET_CDN}/stamp/${assetbundleName}/${assetbundleName}.webp`;
}

export const unitIconUrl = (unit: string) =>
  getAssetUrl(join('assets/sekai/units', `${unit}.webp`));

export const characterIconUrl = (id: number, subUnit?: SekaiUnitId | 'none') => {
  if (id === 21 && subUnit && subUnit !== 'none' && subUnit !== 'virtual_singer') {
    return getAssetUrl(join('assets/sekai/chara_vs', `21_${subUnit}.png`));
  }
  return getAssetUrl(join('assets/sekai/chara', `${id}.webp`));
};

export const attributeIconUrl = (attr: CardAttribute) =>
  getAssetUrl(join('assets/sekai/attrs', `${attr}.png`));

export const rarityStarUrl = (kind: 'normal' | 'trained' | 'birthday') =>
  getAssetUrl(join('assets/sekai/rarity', `${kind}.png`));
