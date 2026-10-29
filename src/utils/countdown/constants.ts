import type { CardAttribute, CardSupplyKind, SekaiUnitId } from '~/types/countdown';

export const MASTER_DB_JP = 'https://sekai-world.github.io/sekai-master-db-diff';
export const MASTER_DB_EN = 'https://sekai-world.github.io/sekai-master-db-en-diff';
export const SEKAI_ASSET_CDN = 'https://storage.sekai.best/sekai-jp-assets';

// Project SEKAI JP launch date (2020-09-30 00:00 JST) & upper sentinel bound (2065).
export const JP_LAUNCH_MS = 1601391600000;
export const MAX_VALID_TIMESTAMP_MS = 3000000000000;
export const MS_PER_DAY = 86_400_000;

export const MAIN_UNITS: SekaiUnitId[] = [
  'leo_need',
  'more_more_jump',
  'vivid_bad_squad',
  'wonderlands_showtime',
  'nightcord'
];

export const ALL_UNITS: SekaiUnitId[] = [...MAIN_UNITS, 'virtual_singer'];

export const HUMAN_CHARACTER_IDS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20
] as const;

export const VIRTUAL_SINGER_IDS = [21, 22, 23, 24, 25, 26] as const;

export const ALL_CHARACTER_IDS = [...HUMAN_CHARACTER_IDS, ...VIRTUAL_SINGER_IDS] as const;

export const CARD_ATTRIBUTES: CardAttribute[] = ['cool', 'cute', 'pure', 'happy', 'mysterious'];

export const ATTRIBUTE_META: Record<
  CardAttribute,
  { labelEn: string; labelJa: string; color: string }
> = {
  cool: { labelEn: 'Cool', labelJa: 'クール', color: '#4466ee' },
  cute: { labelEn: 'Cute', labelJa: 'キュート', color: '#ff6699' },
  pure: { labelEn: 'Pure', labelJa: 'ピュア', color: '#33cc77' },
  happy: { labelEn: 'Happy', labelJa: 'ハッピー', color: '#ff9922' },
  mysterious: { labelEn: 'Mysterious', labelJa: 'ミステリアス', color: '#9955dd' }
};

export const UNIT_META: Record<
  SekaiUnitId | 'mixed',
  { nameEn: string; shortEn: string; nameJa: string; color: string }
> = {
  leo_need: {
    nameEn: 'Leo/need',
    shortEn: 'L/n',
    nameJa: 'Leo/need',
    color: '#4455dd'
  },
  more_more_jump: {
    nameEn: 'MORE MORE JUMP!',
    shortEn: 'MMJ',
    nameJa: 'MORE MORE JUMP！',
    color: '#66cc44'
  },
  vivid_bad_squad: {
    nameEn: 'Vivid BAD SQUAD',
    shortEn: 'VBS',
    nameJa: 'Vivid BAD SQUAD',
    color: '#ee1166'
  },
  wonderlands_showtime: {
    nameEn: 'Wonderlands×Showtime',
    shortEn: 'WxS',
    nameJa: 'ワンダーランズ×ショウタイム',
    color: '#ff9900'
  },
  nightcord: {
    nameEn: 'Nightcord at 25:00',
    shortEn: 'N25',
    nameJa: '25時、ナイトコードで。',
    color: '#884499'
  },
  virtual_singer: {
    nameEn: 'Virtual Singer',
    shortEn: 'VS',
    nameJa: 'バーチャル・シンガー',
    color: '#33ccbb'
  },
  mixed: {
    nameEn: 'Mixed / Crossover',
    shortEn: 'Mixed',
    nameJa: 'シャッフル・混合',
    color: '#8a8a9e'
  }
};

export const CHARACTER_UNIT: Record<number, SekaiUnitId> = {
  1: 'leo_need',
  2: 'leo_need',
  3: 'leo_need',
  4: 'leo_need',
  5: 'more_more_jump',
  6: 'more_more_jump',
  7: 'more_more_jump',
  8: 'more_more_jump',
  9: 'vivid_bad_squad',
  10: 'vivid_bad_squad',
  11: 'vivid_bad_squad',
  12: 'vivid_bad_squad',
  13: 'wonderlands_showtime',
  14: 'wonderlands_showtime',
  15: 'wonderlands_showtime',
  16: 'wonderlands_showtime',
  17: 'nightcord',
  18: 'nightcord',
  19: 'nightcord',
  20: 'nightcord',
  21: 'virtual_singer',
  22: 'virtual_singer',
  23: 'virtual_singer',
  24: 'virtual_singer',
  25: 'virtual_singer',
  26: 'virtual_singer'
};

// Official Project SEKAI character image colors.
export const CHARACTER_COLORS: Record<number, string> = {
  1: '#33aaee',
  2: '#ffdd44',
  3: '#ee6666',
  4: '#bbdd22',
  5: '#ffccaa',
  6: '#99ccff',
  7: '#ffaacc',
  8: '#99eedd',
  9: '#ff6699',
  10: '#00bbdd',
  11: '#ff7722',
  12: '#0077dd',
  13: '#ffbb00',
  14: '#ff66bb',
  15: '#33dd99',
  16: '#bb88ee',
  17: '#bb6688',
  18: '#8888cc',
  19: '#ccaa88',
  20: '#ddaacc',
  21: '#33ccbb',
  22: '#ffcc11',
  23: '#ffee11',
  24: '#ffbbcc',
  25: '#dd4444',
  26: '#3366cc'
};

export const CHARACTER_ABBREV: Record<number, string> = {
  1: 'ichi',
  2: 'saki',
  3: 'hona',
  4: 'shiho',
  5: 'mino',
  6: 'haru',
  7: 'airi',
  8: 'shizu',
  9: 'koha',
  10: 'an',
  11: 'aki',
  12: 'toya',
  13: 'kasa',
  14: 'emu',
  15: 'nene',
  16: 'rui',
  17: 'kana',
  18: 'mafu',
  19: 'ena',
  20: 'mizu',
  21: 'miku',
  22: 'rin',
  23: 'len',
  24: 'luka',
  25: 'meiko',
  26: 'kaito'
};

export const DB_UNIT_TO_SLUG: Record<string, SekaiUnitId> = {
  light_sound: 'leo_need',
  light_music_club: 'leo_need',
  idol: 'more_more_jump',
  street: 'vivid_bad_squad',
  theme_park: 'wonderlands_showtime',
  school_refusal: 'nightcord',
  piapro: 'virtual_singer',
  vocaloid: 'virtual_singer'
};

export const SUPPLY_ID_TO_KIND: Record<number, CardSupplyKind> = {
  1: 'permanent',
  2: 'birthday',
  3: 'term_limited',
  4: 'colorful_fes',
  5: 'bloom_fes',
  6: 'unit_event_limited',
  7: 'collab_limited'
};

export const SUPPLY_BADGE_META: Record<
  CardSupplyKind,
  { shortEn: string; shortJa: string; bg: string; fg: string }
> = {
  permanent: { shortEn: 'Perm', shortJa: '恒常', bg: '#334155', fg: '#f8fafc' },
  birthday: { shortEn: 'B-Day', shortJa: 'BD', bg: '#ec4899', fg: '#ffffff' },
  term_limited: { shortEn: 'Lim', shortJa: '限定', bg: '#f59e0b', fg: '#1e1b4b' },
  colorful_fes: { shortEn: 'ColorFes', shortJa: 'カラフェス', bg: '#8b5cf6', fg: '#ffffff' },
  bloom_fes: { shortEn: 'BloomFes', shortJa: 'ブルフェス', bg: '#06b6d4', fg: '#083344' },
  unit_event_limited: { shortEn: 'WL Lim', shortJa: 'WL限定', bg: '#10b981', fg: '#052e16' },
  collab_limited: { shortEn: 'Collab', shortJa: 'コラボ', bg: '#ef4444', fg: '#ffffff' }
};
