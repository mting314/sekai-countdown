import type {
  CardAttribute,
  CompactCard,
  CompactEvent,
  CompactMusic,
  CompactStamp,
  CountdownCharacter,
  CountdownSnapshot,
  DroughtClock,
  SekaiUnitId
} from '~/types/countdown';
import { ATTRIBUTE_META, MS_PER_DAY, SUPPLY_BADGE_META, UNIT_META } from './constants';
import {
  computeCardMetrics,
  computeExtrasMetrics,
  computeFocusMetrics,
  computeMixedAndAttributeMetrics,
  computeVirtualSingerMetrics
} from './metrics';
import {
  cardHref,
  cardsHref,
  characterHref,
  eventHref,
  extrasHref,
  focusHref,
  mixedAttrsHref,
  virtualSingersHref
} from './routes';

export type SearchCategory = 'all' | 'character' | 'clock' | 'event' | 'card' | 'song';

export interface CharacterSearchItem {
  kind: 'character';
  id: string;
  haystack: string;
  exactKeys: string[];
  character: CountdownCharacter;
  primaryClock: DroughtClock;
  primaryLabelEn: string;
  primaryLabelJa: string;
  secondaryClock: DroughtClock;
  secondaryLabelEn: string;
  secondaryLabelJa: string;
  href: string;
}

export interface ClockSearchItem {
  kind: 'clock';
  id: string;
  haystack: string;
  exactKeys: string[];
  character: CountdownCharacter;
  clock: DroughtClock;
  categoryEn: string;
  categoryJa: string;
  attr?: CardAttribute;
  subUnit?: SekaiUnitId;
  href: string;
}

export interface EventSearchItem {
  kind: 'event';
  id: string;
  haystack: string;
  exactKeys: string[];
  event: CompactEvent;
  status: 'live' | 'upcoming' | 'ended';
  daysDelta: number;
  focusCharacter?: CountdownCharacter;
  href: string;
}

export interface CardSearchItem {
  kind: 'card';
  id: string;
  haystack: string;
  exactKeys: string[];
  card: CompactCard;
  character: CountdownCharacter;
  event?: CompactEvent;
  daysAgo: number;
  href: string;
}

export interface SongSearchItem {
  kind: 'song';
  id: string;
  haystack: string;
  exactKeys: string[];
  music: CompactMusic;
  altSingerIds: number[];
  daysAgo: number;
  href: string;
}

export type GlobalSearchItem =
  | CharacterSearchItem
  | ClockSearchItem
  | EventSearchItem
  | CardSearchItem
  | SongSearchItem;

export interface GlobalSearchIndex {
  characters: CharacterSearchItem[];
  clocks: ClockSearchItem[];
  events: EventSearchItem[];
  cards: CardSearchItem[];
  songs: SongSearchItem[];
}

const UNIT_ALIASES: Record<SekaiUnitId, string> = {
  leo_need: 'leo/need leoneed l/n ln レオニ レオニード',
  more_more_jump: 'more more jump mmj momojan モモジャン モアジャン',
  vivid_bad_squad: 'vivid bad squad vbs ビビバス',
  wonderlands_showtime: 'wonderlands showtime wxs wandasho ワンダショ',
  nightcord: 'nightcord at 25:00 n25 25ji niigo ニーゴ 25時',
  virtual_singer: 'virtual singer vs vocaloid piapro バチャシン バーチャルシンガー ボカロ'
};

const ATTR_ALIASES: Record<CardAttribute, string> = {
  cool: 'cool クール',
  cute: 'cute キュート',
  pure: 'pure ピュア',
  happy: 'happy ハッピー',
  mysterious: 'mysterious myst ミステリアス'
};

export function normalizeSearchText(raw: string): string {
  return raw
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[#★☆*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeQuery(query: string): string[] {
  const norm = normalizeSearchText(query);
  if (!norm) return [];
  return norm.split(' ').filter(Boolean);
}

export function matchesTokens(haystack: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  for (const tok of tokens) {
    if (!haystack.includes(tok)) return false;
  }
  return true;
}

export function characterSearchHaystack(ch: CountdownCharacter): string {
  const meta = UNIT_META[ch.unit];
  return normalizeSearchText(
    [
      ch.nameEn,
      ch.givenNameEn,
      ch.nameJa,
      ch.nameJa.replace(/\s+/g, ''),
      ch.givenNameJa,
      ch.abbrev,
      meta.nameEn,
      meta.shortEn,
      meta.nameJa,
      UNIT_ALIASES[ch.unit]
    ]
      .filter(Boolean)
      .join(' ')
  );
}

export interface ClockFilterLookups {
  charById: Map<number, CountdownCharacter>;
  cardById: Map<number, CompactCard>;
  eventById: Map<number, CompactEvent>;
  musicById: Map<number, CompactMusic>;
  stampById?: Map<number, CompactStamp>;
}

/**
 * Checks whether a DroughtClock row matches an inline filter query on any leaderboard/grid.
 */
export function matchesClockQuery(
  query: string,
  clock: DroughtClock,
  lookups: ClockFilterLookups,
  extraTerms?: string
): boolean {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return true;

  const ch = clock.characterId ? lookups.charById.get(clock.characterId) : undefined;
  const card = clock.latest?.cardId ? lookups.cardById.get(clock.latest.cardId) : undefined;
  const ev =
    clock.latest?.eventId !== undefined
      ? lookups.eventById.get(clock.latest.eventId)
      : card?.eventId !== undefined
        ? lookups.eventById.get(card.eventId)
        : undefined;
  const music = clock.latest?.musicId ? lookups.musicById.get(clock.latest.musicId) : undefined;
  const stamp =
    clock.latest?.stampId && lookups.stampById
      ? lookups.stampById.get(clock.latest.stampId)
      : undefined;

  const supplyMeta = card ? SUPPLY_BADGE_META[card.supply] : undefined;

  const parts = [
    ch ? characterSearchHaystack(ch) : '',
    clock.unitId
      ? `${UNIT_META[clock.unitId].nameEn} ${UNIT_META[clock.unitId].nameJa} ${UNIT_ALIASES[clock.unitId]}`
      : '',
    clock.latest?.labelEn ?? '',
    clock.latest?.labelJa ?? '',
    clock.latest?.sublabel ?? '',
    ev ? `${ev.id} ${ev.nickname ?? ''} ${ev.nameEn ?? ''} ${ev.nameJa}` : '',
    card
      ? `${card.prefixEn ?? ''} ${card.prefixJa} ${ATTR_ALIASES[card.attr]} ${card.supply} ${supplyMeta?.shortEn ?? ''} ${supplyMeta?.shortJa ?? ''}`
      : '',
    music ? `${music.titleEn ?? ''} ${music.titleJa}` : '',
    stamp ? stamp.nameJa : '',
    clock.isRecordWait ? 'record new record 最長記録' : '',
    clock.severity,
    extraTerms ?? ''
  ];

  const haystack = normalizeSearchText(parts.join(' '));
  return matchesTokens(haystack, tokens);
}

/**
 * Builds an in-memory multi-entity search index across all 26 characters, ~420 countdown clocks,
 * 222 events (including fan nicknames like `mizu5`), 4★/Birthday cards, and 737 songs.
 */
function findClockByChar(list: DroughtClock[], cid: number): DroughtClock {
  return list.find((c) => c.characterId === cid)!;
}

export function buildGlobalSearchIndex(
  snapshot: CountdownSnapshot,
  now: number
): GlobalSearchIndex {
  const charById = new Map(snapshot.characters.map((c) => [c.id, c]));
  const eventById = new Map(snapshot.events.map((e) => [e.id, e]));
  const cardById = new Map(snapshot.cards.map((c) => [c.id, c]));

  const focus = computeFocusMetrics(snapshot, now);
  const cards = computeCardMetrics(snapshot, now, { includeWorldLink: false, includeCollab: true });
  const vs = computeVirtualSingerMetrics(snapshot, now);
  const mixed = computeMixedAndAttributeMetrics(snapshot, now);
  const extras = computeExtrasMetrics(snapshot, now);

  const fesByChar = new Map(cards.fes4Star.map((f) => [f.characterId, f]));

  // 1. Characters
  const characterItems: CharacterSearchItem[] = snapshot.characters.map((ch) => {
    const isHuman = ch.id <= 20;
    const primaryClock = isHuman
      ? findClockByChar(focus.characterFocus, ch.id)
      : findClockByChar(vs.unitFocusVs4Star, ch.id);
    const secondaryClock = isHuman
      ? findClockByChar(cards.lim4Star, ch.id)
      : findClockByChar(vs.vsBannerFocus, ch.id);
    return {
      kind: 'character',
      id: `char:${ch.id}`,
      haystack: characterSearchHaystack(ch),
      exactKeys: [
        normalizeSearchText(ch.abbrev),
        normalizeSearchText(ch.givenNameEn),
        normalizeSearchText(ch.givenNameJa)
      ],
      character: ch,
      primaryClock,
      primaryLabelEn: isHuman ? 'Focus' : 'VS 4★',
      primaryLabelJa: isHuman ? '箱イベ' : '出張★4',
      secondaryClock,
      secondaryLabelEn: isHuman ? 'Lim 4★' : 'VS Banner',
      secondaryLabelJa: isHuman ? '限定★4' : 'VSバナー',
      href: characterHref(ch.id)
    };
  });

  // 2. Clocks (personal + 6x5 SEKAI VS sub-unit + 26x5 attribute clocks)
  const clockItems: ClockSearchItem[] = [];
  const pushClock = (
    ch: CountdownCharacter,
    clock: DroughtClock | undefined,
    categoryEn: string,
    categoryJa: string,
    keywords: string,
    href: string,
    opts?: { attr?: CardAttribute; subUnit?: SekaiUnitId }
  ) => {
    if (!clock) return;
    const latestEv = clock.latest?.eventId ? eventById.get(clock.latest.eventId) : undefined;
    const latestCard = clock.latest?.cardId ? cardById.get(clock.latest.cardId) : undefined;
    const recordTags = clock.isRecordWait ? 'record new record 最長記録 更新中' : '';
    const hay = normalizeSearchText(
      [
        characterSearchHaystack(ch),
        categoryEn,
        categoryJa,
        keywords,
        clock.severity,
        recordTags,
        clock.latest?.labelEn ?? '',
        clock.latest?.labelJa ?? '',
        latestEv?.nickname ?? '',
        latestCard?.prefixEn ?? '',
        latestCard?.prefixJa ?? ''
      ].join(' ')
    );
    clockItems.push({
      kind: 'clock',
      id: `clock:${ch.id}:${categoryEn}`,
      haystack: hay,
      exactKeys: [],
      character: ch,
      clock,
      categoryEn,
      categoryJa,
      attr: opts?.attr,
      subUnit: opts?.subUnit,
      href
    });
  };

  for (const ch of snapshot.characters) {
    if (ch.id <= 20) {
      pushClock(
        ch,
        findClockByChar(focus.characterFocus, ch.id),
        'Solo Focus Event',
        'ユニット箱イベバナー',
        'focus solo banner rotation 箱イベ バナー ローテ',
        focusHref()
      );
      pushClock(
        ch,
        findClockByChar(focus.characterHakolim, ch.id),
        'Hakolim (Limited Focus)',
        '箱限定（ハコリム）',
        'hakolim hako limited focus ハコリム 箱限定',
        focusHref()
      );
      pushClock(
        ch,
        findClockByChar(mixed.mixedBanner, ch.id),
        'Mixed Event Banner Lead',
        '混合イベバナー',
        'mixed shuffle banner lead 混合イベ 混合バナー',
        mixedAttrsHref()
      );
    } else {
      pushClock(
        ch,
        findClockByChar(vs.unitFocusVs4Star, ch.id),
        'Unit-Focus VS 4★ Slot',
        '箱イベ★4出張枠',
        'vs virtual singer unit focus slot 4star 出張枠 箱イベ',
        virtualSingersHref()
      );
      pushClock(
        ch,
        findClockByChar(vs.unitFocusVsSong, ch.id),
        'Unit-Focus Commissioned Song',
        '箱イベ書き下ろし歌唱',
        'vs virtual singer song vocal commissioned 書き下ろし 歌唱',
        virtualSingersHref()
      );
      pushClock(
        ch,
        findClockByChar(vs.vsBannerFocus, ch.id),
        'Dedicated VS Banner Focus',
        'バチャシン箱バナー',
        'vs banner focus piapro バチャシンバナー',
        virtualSingersHref()
      );
    }

    const fes = fesByChar.get(ch.id);
    const waitingBloom = fes && fes.bloomFesCount === 0 ? 'waiting room no bloomfes 未実装' : '';
    pushClock(
      ch,
      findClockByChar(cards.lim4Star, ch.id),
      'Hairstyle Limited 4★',
      '髪型付き限定★4',
      'lim limited hairstyle lim jail 4star 限定 髪型',
      cardsHref()
    );
    pushClock(
      ch,
      fes?.clock,
      fes && fes.bloomFesCount === 0 ? 'Fes 4★ (0 BloomFes)' : 'Fes 4★ (ColorFes / BloomFes)',
      fes && fes.bloomFesCount === 0 ? 'フェス限★4（ブルフェス未実装）' : 'フェス限★4',
      `fes colorfes bloomfes festival カラフェス ブルフェス フェス限 ${waitingBloom}`,
      cardsHref()
    );
    pushClock(
      ch,
      findClockByChar(cards.any4Star, ch.id),
      'Any 4★ Card',
      '全★4カード',
      'any 4star card 星4 ★4',
      cardsHref()
    );
    pushClock(
      ch,
      findClockByChar(cards.perm4Star, ch.id),
      'Permanent 4★',
      '恒常★4',
      'perm permanent 4star 恒常',
      cardsHref()
    );
    pushClock(
      ch,
      findClockByChar(extras.altVocals, ch.id),
      'Another Vocal Cover',
      'アナザーボーカル',
      'alt another vocal cover solo アナボ アナザーボーカル',
      extrasHref()
    );
    pushClock(
      ch,
      findClockByChar(extras.stamps, ch.id),
      'Illustration Stamp',
      'イラストスタンプ',
      'stamp sticker スタンプ',
      extrasHref()
    );
  }

  // 6 x 5 SEKAI Sub-Unit clocks for Virtual Singers
  for (const row of vs.subUnitMatrix) {
    for (const cell of row) {
      const ch = charById.get(cell.vsCharacterId);
      if (!ch) continue;
      const uMeta = UNIT_META[cell.supportUnit];
      pushClock(
        ch,
        cell.clock4Star,
        `${uMeta.shortEn} SEKAI 4★`,
        `${uMeta.nameJa}セカイ ★4`,
        `sekai subunit support ${UNIT_ALIASES[cell.supportUnit]} セカイ サブユニット`,
        virtualSingersHref(),
        { subUnit: cell.supportUnit }
      );
    }
  }

  // 26 x 5 Attribute Starvation clocks
  for (const row of mixed.attributeMatrix) {
    for (const cell of row) {
      const ch = charById.get(cell.characterId);
      if (!ch) continue;
      const aMeta = ATTRIBUTE_META[cell.attr];
      pushClock(
        ch,
        cell.clockAll4Star,
        `${aMeta.labelEn} 4★`,
        `${aMeta.labelJa}属性 ★4`,
        `attribute attr ${ATTR_ALIASES[cell.attr]} 属性`,
        mixedAttrsHref(),
        { attr: cell.attr }
      );
      pushClock(
        ch,
        cell.clockLim4Star,
        `${aMeta.labelEn} Lim 4★`,
        `${aMeta.labelJa}属性 限定★4`,
        `attribute attr lim limited ${ATTR_ALIASES[cell.attr]} 属性 限定`,
        mixedAttrsHref(),
        { attr: cell.attr }
      );
    }
  }

  // 3. Events (newest first)
  const eventItems: EventSearchItem[] = snapshot.events
    .toSorted((a, b) => b.id - a.id)
    .map((ev) => {
      const focusChar = ev.focusCharacterId
        ? charById.get(ev.focusCharacterId)
        : ev.bannerCharacterId
          ? charById.get(ev.bannerCharacterId)
          : undefined;
      const status: EventSearchItem['status'] =
        ev.startAt <= now && ev.aggregateAt >= now
          ? 'live'
          : ev.startAt > now
            ? 'upcoming'
            : 'ended';
      const daysDelta =
        status === 'upcoming'
          ? Math.max(0, Math.ceil((ev.startAt - now) / MS_PER_DAY))
          : Math.max(0, Math.floor((now - ev.startAt) / MS_PER_DAY));
      const unitAliases = ev.unit !== 'mixed' ? UNIT_ALIASES[ev.unit] : 'mixed shuffle 混合';
      const hay = normalizeSearchText(
        [
          `event ${ev.id}`,
          ev.nickname ?? '',
          ev.nameEn ?? '',
          ev.nameJa,
          ev.eventType,
          ev.isHakolim ? 'hakolim limited 限定' : 'permanent 恒常',
          ev.isSoloFocus ? 'focus solo 箱イベ' : '',
          ev.isVsFocusEvent ? 'vs focus バチャシン箱' : '',
          unitAliases,
          focusChar ? characterSearchHaystack(focusChar) : ''
        ].join(' ')
      );
      const exactKeys = [String(ev.id)];
      if (ev.nickname) exactKeys.push(normalizeSearchText(ev.nickname));
      return {
        kind: 'event',
        id: `event:${ev.id}`,
        haystack: hay,
        exactKeys,
        event: ev,
        status,
        daysDelta,
        focusCharacter: focusChar,
        href: eventHref(ev.id)
      };
    });

  // 4. 4★ & Birthday Cards (newest first)
  const cardItems: CardSearchItem[] = snapshot.cards
    .filter((c) => c.rarity === 'rarity_4' || c.rarity === 'rarity_birthday')
    .toSorted((a, b) => b.releaseAt - a.releaseAt || b.id - a.id)
    .flatMap((card) => {
      const ch = charById.get(card.characterId);
      if (!ch) return [];
      const ev = card.eventId ? eventById.get(card.eventId) : undefined;
      const sMeta = SUPPLY_BADGE_META[card.supply];
      const daysAgo = Math.max(0, Math.floor((now - card.releaseAt) / MS_PER_DAY));
      const hay = normalizeSearchText(
        [
          card.prefixEn ?? '',
          card.prefixJa,
          characterSearchHaystack(ch),
          ATTR_ALIASES[card.attr],
          card.supply,
          sMeta.shortEn,
          sMeta.shortJa,
          card.rarity === 'rarity_birthday' ? 'birthday bd バースデー 誕生日' : '4star 星4',
          ev?.nickname ?? '',
          ev?.nameEn ?? '',
          ev?.nameJa ?? ''
        ].join(' ')
      );
      return [
        {
          kind: 'card' as const,
          id: `card:${card.id}`,
          haystack: hay,
          exactKeys: [String(card.id)],
          card,
          character: ch,
          event: ev,
          daysAgo,
          href: cardHref(card.id)
        }
      ];
    });

  // 5. Songs (newest first, with Another Vocal singer lookup)
  const altSingersByMusic = new Map<number, Set<number>>();
  for (const av of snapshot.anotherVocals) {
    let set = altSingersByMusic.get(av.musicId);
    if (!set) {
      set = new Set();
      altSingersByMusic.set(av.musicId, set);
    }
    for (const cid of av.characterIds) set.add(cid);
  }

  const songItems: SongSearchItem[] = snapshot.musics
    .toSorted((a, b) => b.publishedAt - a.publishedAt || b.id - a.id)
    .map((m) => {
      const altIds = Array.from(altSingersByMusic.get(m.id) ?? []);
      const altNames = altIds
        .map((id) => {
          const c = charById.get(id);
          return c ? `${c.givenNameEn} ${c.givenNameJa} ${c.abbrev}` : '';
        })
        .join(' ');
      const unitTerms = m.units.map((u) => UNIT_ALIASES[u]).join(' ');
      const daysAgo = Math.max(0, Math.floor((now - m.publishedAt) / MS_PER_DAY));
      const hay = normalizeSearchText(
        [
          m.titleEn ?? '',
          m.titleJa,
          unitTerms,
          m.commissioned ? 'commissioned 書き下ろし' : 'cover カバー',
          m.categories.includes('mv') ? '3dmv' : '',
          m.categories.includes('mv_2d') ? '2dmv' : '',
          altNames
        ].join(' ')
      );
      return {
        kind: 'song',
        id: `song:${m.id}`,
        haystack: hay,
        exactKeys: [
          normalizeSearchText(m.titleJa),
          ...(m.titleEn ? [normalizeSearchText(m.titleEn)] : [])
        ],
        music: m,
        altSingerIds: altIds,
        daysAgo,
        href: altIds.length === 1 ? characterHref(altIds[0]) : extrasHref()
      };
    });

  return {
    characters: characterItems,
    clocks: clockItems,
    events: eventItems,
    cards: cardItems,
    songs: songItems
  };
}

export interface GroupedSearchResults {
  characters: CharacterSearchItem[];
  clocks: ClockSearchItem[];
  events: EventSearchItem[];
  cards: CardSearchItem[];
  songs: SongSearchItem[];
  flat: GlobalSearchItem[];
  totalMatches: number;
}

function scoreMatch(item: GlobalSearchItem, normQuery: string): number {
  let score = 0;
  if (item.exactKeys.includes(normQuery)) score += 100;
  else if (item.exactKeys.some((k) => k.startsWith(normQuery))) score += 45;
  if (item.haystack.startsWith(normQuery)) score += 20;
  if (item.kind === 'clock') {
    if (!item.attr && !item.subUnit) score += 8;
    if (item.clock.isRecordWait) score += 12;
    score += Math.min(10, item.clock.overdueRatio * 4);
  }
  return score;
}

export function queryGlobalSearch(
  index: GlobalSearchIndex,
  query: string,
  category: SearchCategory = 'all'
): GroupedSearchResults {
  const norm = normalizeSearchText(query);
  const tokens = tokenizeQuery(query);

  if (tokens.length === 0) {
    // Curated default spotlight when search opens with an empty query
    const topClocks = index.clocks
      .filter((c) => c.clock.isRecordWait && c.clock.count >= 2)
      .toSorted((a, b) => b.clock.overdueRatio - a.clock.overdueRatio)
      .slice(0, 6);
    const recentEvents = index.events.slice(0, 4);
    const chars = category === 'character' ? index.characters : index.characters.slice(0, 6);

    const characters = category === 'all' || category === 'character' ? chars : [];
    const clocks =
      category === 'all'
        ? topClocks
        : category === 'clock'
          ? index.clocks.toSorted((a, b) => b.clock.daysSince - a.clock.daysSince).slice(0, 16)
          : [];
    const events =
      category === 'all' ? recentEvents : category === 'event' ? index.events.slice(0, 14) : [];
    const cards = category === 'card' ? index.cards.slice(0, 14) : [];
    const songs = category === 'song' ? index.songs.slice(0, 14) : [];

    const flat: GlobalSearchItem[] = [...characters, ...clocks, ...events, ...cards, ...songs];
    return {
      characters,
      clocks,
      events,
      cards,
      songs,
      flat,
      totalMatches: flat.length
    };
  }

  const filterAndRank = <T extends GlobalSearchItem>(items: T[], cap: number): T[] => {
    const matched = items.filter((item) => matchesTokens(item.haystack, tokens));
    return matched.toSorted((a, b) => scoreMatch(b, norm) - scoreMatch(a, norm)).slice(0, cap);
  };

  const singleCap = 24;
  const characters =
    category === 'all' || category === 'character'
      ? filterAndRank(index.characters, category === 'all' ? 6 : singleCap)
      : [];
  const clocks =
    category === 'all' || category === 'clock'
      ? filterAndRank(index.clocks, category === 'all' ? 5 : singleCap)
      : [];
  const events =
    category === 'all' || category === 'event'
      ? filterAndRank(index.events, category === 'all' ? 6 : singleCap)
      : [];
  const cards =
    category === 'all' || category === 'card'
      ? filterAndRank(index.cards, category === 'all' ? 6 : singleCap)
      : [];
  const songs =
    category === 'all' || category === 'song'
      ? filterAndRank(index.songs, category === 'all' ? 6 : singleCap)
      : [];

  // If an event has an exact nickname match (like "mizu5" or "hona7"), put Events above Characters/Clocks in flat keyboard order!
  const hasExactEvent = events.some((e) => e.exactKeys.includes(norm));
  const flat: GlobalSearchItem[] = hasExactEvent
    ? [...events, ...characters, ...clocks, ...cards, ...songs]
    : [...characters, ...clocks, ...events, ...cards, ...songs];

  return {
    characters,
    clocks,
    events,
    cards,
    songs,
    flat,
    totalMatches: flat.length
  };
}
