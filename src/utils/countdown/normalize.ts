import type {
  CardAttribute,
  CardRarity,
  CompactAnotherVocal,
  CompactCard,
  CompactEvent,
  CompactMusic,
  CompactStamp,
  CountdownCharacter,
  CountdownSnapshot,
  EventUnitId,
  MusicCategoryKind,
  SekaiUnitId
} from '~/types/countdown';
import {
  CHARACTER_ABBREV,
  CHARACTER_COLORS,
  CHARACTER_UNIT,
  DB_UNIT_TO_SLUG,
  JP_LAUNCH_MS,
  MAX_VALID_TIMESTAMP_MS,
  MS_PER_DAY,
  SUPPLY_ID_TO_KIND
} from './constants';

export interface RawEvent {
  id: number;
  eventType: string;
  name: string;
  assetbundleName?: string;
  startAt: number;
  aggregateAt: number;
  unit?: string;
}

export interface RawEventStory {
  id: number;
  eventId: number;
  assetbundleName?: string;
  bannerGameCharacterUnitId?: number;
}

export interface RawEventStoryUnit {
  eventStoryId: number;
  unit: string;
  eventStoryUnitRelation: string;
}

export interface RawEventCard {
  eventId: number;
  cardId: number;
}

export interface RawEventMusic {
  eventId: number;
  musicId: number;
}

export interface RawCard {
  id: number;
  characterId: number;
  cardRarityType: CardRarity;
  attr: CardAttribute;
  supportUnit?: string;
  prefix?: string;
  assetbundleName: string;
  releaseAt?: number;
  archivePublishedAt?: number;
  cardSupplyId?: number;
}

export interface RawGameCharacter {
  id: number;
  firstName?: string;
  givenName: string;
}

export interface RawGameCharacterUnit {
  id: number;
  gameCharacterId: number;
  unit: string;
}

export interface RawMusic {
  id: number;
  title: string;
  assetbundleName?: string;
  publishedAt?: number;
  releasedAt?: number;
  isNewlyWrittenMusic?: boolean;
}

export interface RawMusicTag {
  musicId: number;
  musicTag: string;
}

export interface RawMusicVocal {
  id: number;
  musicId: number;
  musicVocalType: string;
  characters?: { characterType: string; characterId: number }[];
  archivePublishedAt?: number;
}

export interface RawMusicCategory {
  musicId: number;
  musicCategoryName: string;
}

export interface RawStamp {
  id: number;
  stampType?: string;
  name?: string;
  assetbundleName?: string;
  characterId1?: number;
  characterId2?: number;
  archivePublishedAt?: number;
}

export interface RawMasterTables {
  events: RawEvent[];
  eventStories: RawEventStory[];
  eventStoryUnits: RawEventStoryUnit[];
  eventCards: RawEventCard[];
  eventMusics: RawEventMusic[];
  cards: RawCard[];
  gameCharacters: RawGameCharacter[];
  gameCharacterUnits: RawGameCharacterUnit[];
  musics: RawMusic[];
  musicTags: RawMusicTag[];
  musicVocals: RawMusicVocal[];
  musicCategories: RawMusicCategory[];
  stamps: RawStamp[];
  eventsEn?: { id: number; name?: string }[];
  cardsEn?: { id: number; prefix?: string }[];
  musicsEn?: { id: number; title?: string }[];
  gameCharactersEn?: RawGameCharacter[];
  focusOverrides?: Record<string, number>;
  nicknames?: Record<string, string>;
  dataVersion?: string;
  generatedAt?: number;
}

const VALID_CATEGORIES = new Set<MusicCategoryKind>(['mv', 'mv_2d', 'original', 'image']);
const VALID_ATTRS = new Set<CardAttribute>(['cool', 'cute', 'pure', 'happy', 'mysterious']);
const VALID_RARITIES = new Set<CardRarity>([
  'rarity_1',
  'rarity_2',
  'rarity_3',
  'rarity_4',
  'rarity_birthday'
]);

function clampTimestamp(ts: number): number {
  return ts < JP_LAUNCH_MS ? JP_LAUNCH_MS : ts;
}

export function resolveEventUnit(
  storyUnits: RawEventStoryUnit[],
  rawEventUnit?: string
): EventUnitId {
  if (storyUnits.length > 0) {
    const main = new Set<SekaiUnitId>();
    const all = new Set<SekaiUnitId>();
    for (const row of storyUnits) {
      const slug = DB_UNIT_TO_SLUG[(row.unit || '').toLowerCase()];
      if (slug) {
        all.add(slug);
        if (row.eventStoryUnitRelation === 'main') {
          main.add(slug);
        }
      }
    }
    if (main.size === 1) return [...main][0];
    if (main.size > 1) return 'mixed';
    if (all.size === 1) return [...all][0];
    return 'mixed';
  }
  if (rawEventUnit) {
    const mapped = DB_UNIT_TO_SLUG[rawEventUnit.toLowerCase()];
    if (mapped) return mapped;
  }
  return 'mixed';
}

export function normalizeMasterTables(raw: RawMasterTables): CountdownSnapshot {
  const focusOverrides = raw.focusOverrides ?? { '97': 10 };
  const abbrevMap: Record<number, string> = { ...CHARACTER_ABBREV };
  for (const [k, v] of Object.entries(raw.nicknames ?? {})) {
    const id = Number(k);
    if (Number.isInteger(id) && v) abbrevMap[id] = v.toLowerCase();
  }

  // 1. Characters (1..26)
  const enCharById = new Map((raw.gameCharactersEn ?? []).map((c) => [c.id, c]));
  const characters: CountdownCharacter[] = raw.gameCharacters
    .filter((c) => c.id >= 1 && c.id <= 26)
    .toSorted((a, b) => a.id - b.id)
    .map((c) => {
      const en = enCharById.get(c.id) ?? c;
      const nameEn = [en.givenName, en.firstName].filter(Boolean).join(' ').trim();
      return {
        id: c.id,
        unit: CHARACTER_UNIT[c.id],
        nameEn,
        givenNameEn: (en.givenName || nameEn).trim(),
        nameJa: `${c.firstName ?? ''}${c.givenName}`,
        givenNameJa: c.givenName,
        abbrev: abbrevMap[c.id] ?? `c${c.id}`,
        color: CHARACTER_COLORS[c.id] ?? '#33ccbb'
      };
    });

  // 2. Event lookup for card debut deduplication
  const rawEventsSorted = raw.events
    .filter((e) => e.startAt > 0 && e.startAt < MAX_VALID_TIMESTAMP_MS)
    .toSorted((a, b) => a.startAt - b.startAt || a.id - b.id);
  const rawEventById = new Map(rawEventsSorted.map((e) => [e.id, e]));

  const eventIdsByCardId = new Map<number, number[]>();
  for (const ec of raw.eventCards) {
    const list = eventIdsByCardId.get(ec.cardId) ?? [];
    list.push(ec.eventId);
    eventIdsByCardId.set(ec.cardId, list);
  }

  // 3. Cards (keyed on card.releaseAt, linked only to true debut event within 25 days)
  const enCardPrefixById = new Map(
    (raw.cardsEn ?? []).filter((c) => c.prefix).map((c) => [c.id, c.prefix!])
  );
  const cards: CompactCard[] = [];
  const debutCardsByEventId = new Map<number, CompactCard[]>();

  for (const c of raw.cards) {
    if (c.characterId < 1 || c.characterId > 26) continue;
    if (!VALID_RARITIES.has(c.cardRarityType) || !VALID_ATTRS.has(c.attr)) continue;
    const rawTs = c.releaseAt ?? c.archivePublishedAt ?? 0;
    if (rawTs <= 0 || rawTs >= MAX_VALID_TIMESTAMP_MS) continue;
    const releaseAt = clampTimestamp(rawTs);

    const candidateEvents = (eventIdsByCardId.get(c.id) ?? [])
      .map((eid) => rawEventById.get(eid))
      .filter((ev): ev is RawEvent => Boolean(ev))
      .filter((ev) => Math.abs(ev.startAt - releaseAt) <= 25 * MS_PER_DAY)
      .toSorted(
        (a, b) => Math.abs(a.startAt - releaseAt) - Math.abs(b.startAt - releaseAt) || a.id - b.id
      );

    const debutEvent = candidateEvents[0];
    const supply = SUPPLY_ID_TO_KIND[c.cardSupplyId ?? 1] ?? 'permanent';
    const supportSlug = c.supportUnit ? DB_UNIT_TO_SLUG[c.supportUnit.toLowerCase()] : undefined;
    const prefixEn = enCardPrefixById.get(c.id);

    const compact: CompactCard = {
      id: c.id,
      characterId: c.characterId,
      rarity: c.cardRarityType,
      attr: c.attr,
      supportUnit: supportSlug ?? 'none',
      supply,
      isWorldLink: supply === 'unit_event_limited' || debutEvent?.eventType === 'world_bloom',
      prefixJa: c.prefix ?? '',
      prefixEn: prefixEn && prefixEn !== c.prefix ? prefixEn : undefined,
      assetbundleName: c.assetbundleName,
      releaseAt,
      eventId: debutEvent?.id
    };
    cards.push(compact);
    if (debutEvent) {
      const list = debutCardsByEventId.get(debutEvent.id) ?? [];
      list.push(compact);
      debutCardsByEventId.set(debutEvent.id, list);
    }
  }
  cards.sort((a, b) => a.releaseAt - b.releaseAt || a.id - b.id);

  // 4. Musics & Another Vocals
  const enMusicById = new Map(
    (raw.musicsEn ?? []).filter((m) => m.title).map((m) => [m.id, m.title!])
  );
  const tagsByMusic = new Map<number, Set<SekaiUnitId>>();
  for (const t of raw.musicTags) {
    const slug = DB_UNIT_TO_SLUG[t.musicTag.toLowerCase()];
    if (!slug) continue;
    const set = tagsByMusic.get(t.musicId) ?? new Set<SekaiUnitId>();
    set.add(slug);
    tagsByMusic.set(t.musicId, set);
  }
  const catsByMusic = new Map<number, Set<MusicCategoryKind>>();
  for (const mc of raw.musicCategories) {
    const cat = mc.musicCategoryName as MusicCategoryKind;
    if (!VALID_CATEGORIES.has(cat)) continue;
    const set = catsByMusic.get(mc.musicId) ?? new Set<MusicCategoryKind>();
    set.add(cat);
    catsByMusic.set(mc.musicId, set);
  }
  const sekaiVocalsByMusic = new Map<number, Set<number>>();
  for (const v of raw.musicVocals) {
    if (v.musicVocalType !== 'sekai') continue;
    const set = sekaiVocalsByMusic.get(v.musicId) ?? new Set<number>();
    for (const ch of v.characters ?? []) {
      if (ch.characterType === 'game_character' && ch.characterId >= 1 && ch.characterId <= 26) {
        set.add(ch.characterId);
      }
    }
    sekaiVocalsByMusic.set(v.musicId, set);
  }

  const musics: CompactMusic[] = [];
  const musicById = new Map<number, CompactMusic>();
  for (const m of raw.musics) {
    const rawTs = m.publishedAt ?? m.releasedAt ?? 0;
    if (rawTs <= 0 || rawTs >= MAX_VALID_TIMESTAMP_MS) continue;
    const publishedAt = clampTimestamp(rawTs);
    const enTitle = enMusicById.get(m.id);
    const item: CompactMusic = {
      id: m.id,
      titleJa: m.title,
      titleEn: enTitle && enTitle !== m.title ? enTitle : undefined,
      assetbundleName: m.assetbundleName ?? '',
      publishedAt,
      commissioned: m.isNewlyWrittenMusic === true,
      units: [...(tagsByMusic.get(m.id) ?? [])],
      categories: [...(catsByMusic.get(m.id) ?? [])],
      sekaiVocalCharacterIds: [...(sekaiVocalsByMusic.get(m.id) ?? [])].toSorted((a, b) => a - b)
    };
    musics.push(item);
    musicById.set(m.id, item);
  }
  musics.sort((a, b) => a.publishedAt - b.publishedAt || a.id - b.id);

  const anotherVocals: CompactAnotherVocal[] = [];
  for (const v of raw.musicVocals) {
    if (v.musicVocalType !== 'another_vocal') continue;
    const charIds = (v.characters ?? [])
      .filter(
        (c) => c.characterType === 'game_character' && c.characterId >= 1 && c.characterId <= 26
      )
      .map((c) => c.characterId);
    if (charIds.length === 0) continue;
    const fallbackTs = musicById.get(v.musicId)?.publishedAt ?? 0;
    const rawTs =
      v.archivePublishedAt &&
      v.archivePublishedAt > 0 &&
      v.archivePublishedAt < MAX_VALID_TIMESTAMP_MS
        ? v.archivePublishedAt
        : fallbackTs;
    if (rawTs <= 0 || rawTs >= MAX_VALID_TIMESTAMP_MS) continue;
    anotherVocals.push({
      id: v.id,
      musicId: v.musicId,
      characterIds: [...new Set(charIds)].toSorted((a, b) => a - b),
      publishedAt: clampTimestamp(rawTs)
    });
  }
  anotherVocals.sort((a, b) => a.publishedAt - b.publishedAt || a.id - b.id);

  // 5. Stamps (illustration stamps with valid publish timestamps)
  const stamps: CompactStamp[] = [];
  for (const s of raw.stamps) {
    if (s.stampType && s.stampType !== 'illustration') continue;
    if (!s.characterId1 || s.characterId1 < 1 || s.characterId1 > 26) continue;
    if (
      !s.archivePublishedAt ||
      s.archivePublishedAt <= 0 ||
      s.archivePublishedAt >= MAX_VALID_TIMESTAMP_MS
    ) {
      continue;
    }
    stamps.push({
      id: s.id,
      characterId1: s.characterId1,
      characterId2:
        s.characterId2 && s.characterId2 >= 1 && s.characterId2 <= 26 ? s.characterId2 : undefined,
      nameJa: s.name ?? '',
      assetbundleName: s.assetbundleName ?? '',
      publishedAt: clampTimestamp(s.archivePublishedAt)
    });
  }
  stamps.sort((a, b) => a.publishedAt - b.publishedAt || a.id - b.id);

  // 6. Events + Focus / Hakolim / Mixed / VS Focus / World Link numbering
  const storyByEventId = new Map(raw.eventStories.map((s) => [s.eventId, s]));
  const storyUnitsByStoryId = new Map<number, RawEventStoryUnit[]>();
  for (const u of raw.eventStoryUnits) {
    const list = storyUnitsByStoryId.get(u.eventStoryId) ?? [];
    list.push(u);
    storyUnitsByStoryId.set(u.eventStoryId, list);
  }
  const gcuById = new Map(raw.gameCharacterUnits.map((u) => [u.id, u]));
  const enEventNameById = new Map(
    (raw.eventsEn ?? []).filter((e) => e.name).map((e) => [e.id, e.name!])
  );
  const firstSongByEventId = new Map<number, CompactMusic>();
  for (const em of raw.eventMusics) {
    if (!firstSongByEventId.has(em.eventId)) {
      const song = musicById.get(em.musicId);
      if (song) firstSongByEventId.set(em.eventId, song);
    }
  }

  const focusRunningCount: Record<number, number> = {};
  let wlSeries = 0;
  let wlPart = 0;
  let prevWlStart: number | null = null;
  const WL_GAP_MS = 120 * MS_PER_DAY;

  const events: CompactEvent[] = rawEventsSorted.map((ev) => {
    const story = storyByEventId.get(ev.id);
    const storyUnits = story ? (storyUnitsByStoryId.get(story.id) ?? []) : [];
    const unit = resolveEventUnit(storyUnits, ev.unit);

    const gcu = story?.bannerGameCharacterUnitId
      ? gcuById.get(story.bannerGameCharacterUnitId)
      : undefined;
    const bannerCharacterId =
      gcu && gcu.gameCharacterId >= 1 && gcu.gameCharacterId <= 26 ? gcu.gameCharacterId : 0;
    const bannerCharacterUnit = gcu?.unit ? DB_UNIT_TO_SLUG[gcu.unit.toLowerCase()] : undefined;

    const debutCards = (debutCardsByEventId.get(ev.id) ?? []).toSorted((a, b) => a.id - b.id);
    const song = firstSongByEventId.get(ev.id);
    const hasCommissionedSong = Boolean(song?.commissioned);
    const distinctStoryUnits = new Set(storyUnits.map((u) => u.unit));
    const singleUnitStory = distinctStoryUnits.size === 1;
    const bannerInMainUnit =
      bannerCharacterId >= 1 &&
      bannerCharacterId <= 20 &&
      CHARACTER_UNIT[bannerCharacterId] === unit;

    const isStandardEventType = ev.eventType === 'marathon' || ev.eventType === 'cheerful_carnival';
    const hasNewCards = debutCards.length > 0;

    let isSoloFocus =
      isStandardEventType &&
      hasNewCards &&
      bannerInMainUnit &&
      (hasCommissionedSong || singleUnitStory);
    let focusCharacterId = isSoloFocus ? bannerCharacterId : 0;

    if (Object.prototype.hasOwnProperty.call(focusOverrides, String(ev.id))) {
      const forced = focusOverrides[String(ev.id)];
      if (forced && forced > 0) {
        isSoloFocus = true;
        focusCharacterId = forced;
      } else {
        isSoloFocus = false;
        focusCharacterId = 0;
      }
    }

    let focusIndex: number | undefined;
    let nickname: string | undefined;
    if (isSoloFocus && focusCharacterId > 0) {
      focusRunningCount[focusCharacterId] = (focusRunningCount[focusCharacterId] ?? 0) + 1;
      focusIndex = focusRunningCount[focusCharacterId];
      nickname = `${abbrevMap[focusCharacterId] ?? `c${focusCharacterId}`}${focusIndex}`;
    } else if (ev.eventType === 'world_bloom') {
      if (prevWlStart === null || ev.startAt - prevWlStart > WL_GAP_MS) {
        wlSeries += 1;
        wlPart = 1;
      } else {
        wlPart += 1;
      }
      prevWlStart = ev.startAt;
      nickname = `wl${wlSeries}-${wlPart}`;
    }

    const isHakolim =
      isSoloFocus &&
      debutCards.some(
        (c) =>
          c.rarity === 'rarity_4' &&
          (c.supply === 'term_limited' || c.supply === 'colorful_fes' || c.supply === 'bloom_fes')
      );

    const isVsFocusEvent =
      isStandardEventType &&
      hasNewCards &&
      !isSoloFocus &&
      bannerCharacterId >= 21 &&
      bannerCharacterId <= 26;

    const isMixedEvent = isStandardEventType && hasNewCards && !isSoloFocus && !isVsFocusEvent;

    const enName = enEventNameById.get(ev.id);
    return {
      id: ev.id,
      nameJa: ev.name,
      nameEn: enName && enName !== ev.name ? enName : undefined,
      eventType: ev.eventType,
      assetbundleName: ev.assetbundleName ?? '',
      storyAssetbundleName: story?.assetbundleName,
      startAt: clampTimestamp(ev.startAt),
      aggregateAt: clampTimestamp(ev.aggregateAt),
      unit: isSoloFocus && focusCharacterId > 0 ? CHARACTER_UNIT[focusCharacterId] : unit,
      bannerCharacterId,
      bannerCharacterUnit,
      isSoloFocus,
      focusCharacterId,
      focusIndex,
      nickname,
      isHakolim,
      isMixedEvent,
      isVsFocusEvent,
      cardIds: debutCards.map((c) => c.id),
      songId: song?.id
    };
  });

  return {
    generatedAt: raw.generatedAt ?? Date.now(),
    dataVersion: raw.dataVersion,
    characters,
    events,
    cards,
    musics,
    anotherVocals,
    stamps
  };
}
