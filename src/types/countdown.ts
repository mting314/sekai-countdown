export type SekaiUnitId =
  | 'leo_need'
  | 'more_more_jump'
  | 'vivid_bad_squad'
  | 'wonderlands_showtime'
  | 'nightcord'
  | 'virtual_singer';

export type EventUnitId = SekaiUnitId | 'mixed';

export type CardRarity = 'rarity_1' | 'rarity_2' | 'rarity_3' | 'rarity_4' | 'rarity_birthday';

export type CardAttribute = 'cool' | 'cute' | 'pure' | 'happy' | 'mysterious';

export type CardSupplyKind =
  | 'permanent'
  | 'birthday'
  | 'term_limited'
  | 'colorful_fes'
  | 'bloom_fes'
  | 'unit_event_limited'
  | 'collab_limited';

export type MusicCategoryKind = 'mv' | 'mv_2d' | 'original' | 'image';

export interface CountdownCharacter {
  id: number;
  unit: SekaiUnitId;
  nameEn: string;
  givenNameEn: string;
  nameJa: string;
  givenNameJa: string;
  abbrev: string;
  color: string;
}

export interface CompactCard {
  id: number;
  characterId: number;
  rarity: CardRarity;
  attr: CardAttribute;
  supportUnit: SekaiUnitId | 'none';
  supply: CardSupplyKind;
  isWorldLink: boolean;
  prefixJa: string;
  prefixEn?: string;
  assetbundleName: string;
  releaseAt: number;
  eventId?: number;
}

export interface CompactEvent {
  id: number;
  nameJa: string;
  nameEn?: string;
  eventType: string;
  assetbundleName: string;
  storyAssetbundleName?: string;
  startAt: number;
  aggregateAt: number;
  unit: EventUnitId;
  bannerCharacterId: number;
  bannerCharacterUnit?: SekaiUnitId;
  isSoloFocus: boolean;
  focusCharacterId: number;
  focusIndex?: number;
  nickname?: string;
  isHakolim: boolean;
  isMixedEvent: boolean;
  isVsFocusEvent: boolean;
  cardIds: number[];
  songId?: number;
}

export interface CompactMusic {
  id: number;
  titleJa: string;
  titleEn?: string;
  assetbundleName: string;
  publishedAt: number;
  commissioned: boolean;
  units: SekaiUnitId[];
  categories: MusicCategoryKind[];
  sekaiVocalCharacterIds: number[];
}

export interface CompactAnotherVocal {
  id: number;
  musicId: number;
  characterIds: number[];
  publishedAt: number;
}

export interface CompactStamp {
  id: number;
  characterId1: number;
  characterId2?: number;
  nameJa: string;
  assetbundleName: string;
  publishedAt: number;
}

export interface CountdownSnapshot {
  generatedAt: number;
  dataVersion?: string;
  characters: CountdownCharacter[];
  events: CompactEvent[];
  cards: CompactCard[];
  musics: CompactMusic[];
  anotherVocals: CompactAnotherVocal[];
  stamps: CompactStamp[];
}

export type DroughtSeverity = 'fresh' | 'normal' | 'due' | 'overdue' | 'record';

export interface GapOccurrence {
  timestamp: number;
  labelJa: string;
  labelEn?: string;
  sublabel?: string;
  eventId?: number;
  cardId?: number;
  musicId?: number;
  stampId?: number;
  gapDaysFromPrev?: number;
}

export interface DroughtClock {
  entityId: number | string;
  characterId?: number;
  unitId?: SekaiUnitId;
  daysSince: number;
  eventsSince?: number;
  count: number;
  lastTimestamp: number | null;
  avgGapDays: number;
  maxGapDays: number;
  overdueRatio: number;
  isRecordWait: boolean;
  severity: DroughtSeverity;
  latest?: GapOccurrence;
  upcoming?: GapOccurrence;
  history: GapOccurrence[];
}
