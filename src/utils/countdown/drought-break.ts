import type {
  CardAttribute,
  CompactCard,
  CompactEvent,
  CompactMusic,
  CountdownCharacter,
  CountdownSnapshot,
  DroughtSeverity,
  SekaiUnitId
} from '~/types/countdown';
import { ATTRIBUTE_META, JP_LAUNCH_MS, MS_PER_DAY, UNIT_META } from './constants';

export interface BrokenOccurrenceRef {
  id: number;
  timestamp: number;
  labelJa: string;
  labelEn?: string;
  sublabel?: string;
  cardId?: number;
  eventId?: number;
  musicId?: number;
}

export interface BrokenDroughtRecord {
  key: string;
  labelEn: string;
  labelJa: string;
  characterId?: number;
  unitId?: SekaiUnitId;
  attr?: CardAttribute;
  ordinal: number;
  totalCount: number;
  isFirstEver: boolean;
  daysBroken: number;
  eventsBetween: number;
  avgGapDays: number;
  priorMaxGapDays?: number;
  brokePriorRecord: boolean;
  isAllTimeMaxGap: boolean;
  ratioVsAvg: number;
  severityAtRelease: DroughtSeverity;
  previous?: BrokenOccurrenceRef;
  next?: BrokenOccurrenceRef & { gapDays: number };
  isStillLatest: boolean;
  activeDaysSince: number;
}

export interface DuoDroughtBreakRecord {
  charAId: number;
  charBId: number;
  sameUnit: boolean;
  ordinal: number;
  totalSharedCount: number;
  isFirstEver: boolean;
  daysBroken: number;
  previousEvent?: CompactEvent;
  nextEvent?: CompactEvent;
  nextGapDays?: number;
  isStillLatest: boolean;
  activeDaysSince: number;
}

export interface CardDossierResult {
  card: CompactCard;
  character: CountdownCharacter;
  event?: CompactEvent;
  eventCards: CompactCard[];
  prevCharacterCard?: CompactCard;
  nextCharacterCard?: CompactCard;
  prevSameRarityCard?: CompactCard;
  nextSameRarityCard?: CompactCard;
  daysAgo: number;
  isUpcoming: boolean;
  brokenDroughts: BrokenDroughtRecord[];
  duoBreaks: DuoDroughtBreakRecord[];
}

export interface EventRotationContext {
  unit: SekaiUnitId;
  focusCharacter: CountdownCharacter;
  cycle: number;
  isCycleJump: boolean;
  cycleSkippedIds: number[];
  queueSkippedIds: number[];
  waitingAfterEventIds: number[];
}

export interface EventCardSummary {
  card: CompactCard;
  character: CountdownCharacter;
  primaryBreaks: BrokenDroughtRecord[];
}

export interface EventDossierResult {
  event: CompactEvent;
  status: 'live' | 'upcoming' | 'ended';
  daysDelta: number;
  focusCharacter?: CountdownCharacter;
  bannerCharacter?: CountdownCharacter;
  song?: CompactMusic;
  altVocalCharacterIds: number[];
  prevEvent?: CompactEvent;
  nextEvent?: CompactEvent;
  rotationContext?: EventRotationContext;
  eventBreaks: BrokenDroughtRecord[];
  duoBreaks: DuoDroughtBreakRecord[];
  lineupCards: EventCardSummary[];
}

function isHairstyleLimited4Star(card: CompactCard): boolean {
  if (card.rarity !== 'rarity_4') return false;
  if (card.supply === 'permanent' || card.supply === 'birthday') return false;
  if (card.isWorldLink) return false;
  return true;
}

function countEventsBetween(eventStartsSorted: number[], fromTs: number, toTs: number): number {
  let count = 0;
  for (const ts of eventStartsSorted) {
    if (ts >= toTs) break;
    if (ts > fromTs) count += 1;
  }
  return count;
}

function classifyReleaseSeverity(
  isFirstEver: boolean,
  brokePriorRecord: boolean,
  isAllTimeMaxGap: boolean,
  ratioVsAvg: number,
  totalGapsCount: number
): DroughtSeverity {
  if (isFirstEver) {
    return ratioVsAvg >= 1.5 ? 'overdue' : 'due';
  }
  if (brokePriorRecord || (isAllTimeMaxGap && totalGapsCount >= 2 && ratioVsAvg >= 1.15)) {
    return 'record';
  }
  if (ratioVsAvg >= 1.25) return 'overdue';
  if (ratioVsAvg >= 0.95) return 'due';
  if (ratioVsAvg >= 0.55) return 'normal';
  return 'fresh';
}

function evaluateSequenceBreak(params: {
  key: string;
  labelEn: string;
  labelJa: string;
  items: BrokenOccurrenceRef[];
  targetId: number;
  eventStartsSorted: number[];
  now: number;
  fallbackAvgDays: number;
  characterId?: number;
  unitId?: SekaiUnitId;
  attr?: CardAttribute;
}): BrokenDroughtRecord | null {
  const {
    key,
    labelEn,
    labelJa,
    items,
    targetId,
    eventStartsSorted,
    now,
    fallbackAvgDays,
    characterId,
    unitId,
    attr
  } = params;

  const sorted = items.toSorted((a, b) => a.timestamp - b.timestamp || a.id - b.id);
  const idx = sorted.findIndex((x) => x.id === targetId);
  if (idx === -1) return null;

  const target = sorted[idx];
  const prev = idx > 0 ? sorted[idx - 1] : undefined;
  const nextItem = idx + 1 < sorted.length ? sorted[idx + 1] : undefined;

  const isFirstEver = idx === 0;
  const baselineTs = prev ? prev.timestamp : JP_LAUNCH_MS;
  const daysBroken = Math.max(0, Math.floor((target.timestamp - baselineTs) / MS_PER_DAY));
  const eventsBetween = countEventsBetween(eventStartsSorted, baselineTs, target.timestamp);

  // Inter-occurrence gaps (between #1->#2, #2->#3, etc.)
  const allInterGaps: number[] = [];
  for (let i = 1; i < sorted.length; i += 1) {
    allInterGaps.push(
      Math.max(0, Math.floor((sorted[i].timestamp - sorted[i - 1].timestamp) / MS_PER_DAY))
    );
  }

  const priorGaps = idx >= 2 ? allInterGaps.slice(0, idx - 1) : [];
  const priorMaxGapDays = priorGaps.length > 0 ? Math.max(...priorGaps) : undefined;

  const avgSource = priorGaps.length > 0 ? priorGaps : allInterGaps;
  const avgGapDays =
    avgSource.length > 0
      ? Math.max(14, Math.round(avgSource.reduce((s, d) => s + d, 0) / avgSource.length))
      : fallbackAvgDays;

  const brokePriorRecord =
    !isFirstEver && priorMaxGapDays !== undefined && daysBroken > priorMaxGapDays;
  const isAllTimeMaxGap =
    !isFirstEver &&
    allInterGaps.length >= 2 &&
    daysBroken >= Math.max(...allInterGaps) &&
    daysBroken > 0;

  const ratioVsAvg = avgGapDays > 0 ? Number((daysBroken / avgGapDays).toFixed(2)) : 1;
  const severityAtRelease = classifyReleaseSeverity(
    isFirstEver,
    brokePriorRecord,
    isAllTimeMaxGap,
    ratioVsAvg,
    allInterGaps.length
  );

  const isStillLatest = nextItem === undefined;
  const activeDaysSince = Math.max(0, Math.floor((now - target.timestamp) / MS_PER_DAY));

  return {
    key,
    labelEn,
    labelJa,
    characterId,
    unitId,
    attr,
    ordinal: idx + 1,
    totalCount: sorted.length,
    isFirstEver,
    daysBroken,
    eventsBetween,
    avgGapDays,
    priorMaxGapDays,
    brokePriorRecord,
    isAllTimeMaxGap,
    ratioVsAvg,
    severityAtRelease,
    previous: prev,
    next: nextItem
      ? {
          ...nextItem,
          gapDays: Math.max(0, Math.floor((nextItem.timestamp - target.timestamp) / MS_PER_DAY))
        }
      : undefined,
    isStillLatest,
    activeDaysSince
  };
}

function cardToBreakRef(
  card: CompactCard,
  eventById: Map<number, CompactEvent>
): BrokenOccurrenceRef {
  const ev = card.eventId ? eventById.get(card.eventId) : undefined;
  return {
    id: card.id,
    timestamp: card.releaseAt,
    labelJa: card.prefixJa || ev?.nameJa || `#${card.id}`,
    labelEn: card.prefixEn || ev?.nameEn,
    sublabel: ev?.nickname,
    cardId: card.id,
    eventId: card.eventId
  };
}

function eventToBreakRef(ev: CompactEvent): BrokenOccurrenceRef {
  return {
    id: ev.id,
    timestamp: ev.startAt,
    labelJa: ev.nameJa,
    labelEn: ev.nameEn,
    sublabel: ev.nickname,
    eventId: ev.id
  };
}

function computeDuoBreakForEventPair(
  snapshot: CountdownSnapshot,
  cardById: Map<number, CompactCard>,
  charById: Map<number, CountdownCharacter>,
  charAId: number,
  charBId: number,
  targetEventId: number,
  now: number
): DuoDroughtBreakRecord | null {
  const lo = Math.min(charAId, charBId);
  const hi = Math.max(charAId, charBId);
  const sharedEvents = snapshot.events
    .filter((ev) => {
      if (ev.eventType === 'world_bloom') return false;
      const fourStarChars = new Set(
        ev.cardIds
          .map((cid) => cardById.get(cid))
          .filter((c): c is CompactCard => Boolean(c && c.rarity === 'rarity_4'))
          .map((c) => c.characterId)
      );
      return fourStarChars.has(lo) && fourStarChars.has(hi);
    })
    .toSorted((a, b) => a.startAt - b.startAt || a.id - b.id);

  const idx = sharedEvents.findIndex((e) => e.id === targetEventId);
  if (idx === -1) return null;

  const target = sharedEvents[idx];
  const prev = idx > 0 ? sharedEvents[idx - 1] : undefined;
  const nextEv = idx + 1 < sharedEvents.length ? sharedEvents[idx + 1] : undefined;
  const baseline = prev ? prev.startAt : JP_LAUNCH_MS;
  const charA = charById.get(charAId);
  const charB = charById.get(charBId);

  return {
    charAId,
    charBId,
    sameUnit: Boolean(charA && charB && charA.unit === charB.unit),
    ordinal: idx + 1,
    totalSharedCount: sharedEvents.length,
    isFirstEver: idx === 0,
    daysBroken: Math.max(0, Math.floor((target.startAt - baseline) / MS_PER_DAY)),
    previousEvent: prev,
    nextEvent: nextEv,
    nextGapDays: nextEv
      ? Math.max(0, Math.floor((nextEv.startAt - target.startAt) / MS_PER_DAY))
      : undefined,
    isStillLatest: nextEv === undefined,
    activeDaysSince: Math.max(0, Math.floor((now - target.startAt) / MS_PER_DAY))
  };
}

function buildCardBrokenDroughts(
  card: CompactCard,
  character: CountdownCharacter,
  charCards: CompactCard[],
  eventById: Map<number, CompactEvent>,
  eventStartsSorted: number[],
  now: number
): BrokenDroughtRecord[] {
  const results: BrokenDroughtRecord[] = [];
  const push = (
    key: string,
    labelEn: string,
    labelJa: string,
    predicate: (c: CompactCard) => boolean,
    fallbackAvgDays: number,
    opts?: { unitId?: SekaiUnitId; attr?: CardAttribute }
  ) => {
    const matching = charCards.filter(predicate).map((c) => cardToBreakRef(c, eventById));
    const rec = evaluateSequenceBreak({
      key,
      labelEn,
      labelJa,
      items: matching,
      targetId: card.id,
      eventStartsSorted,
      now,
      fallbackAvgDays,
      characterId: character.id,
      unitId: opts?.unitId,
      attr: opts?.attr
    });
    if (rec) results.push(rec);
  };

  const ev = card.eventId ? eventById.get(card.eventId) : undefined;
  const aMeta = ATTRIBUTE_META[card.attr];

  if (card.rarity === 'rarity_4') {
    push('any_4star', 'Any 4★ Card', '全★4カード', (c) => c.rarity === 'rarity_4', 95);

    if (isHairstyleLimited4Star(card)) {
      push('lim_4star', 'Hairstyle Limited 4★', '髪型付き限定★4', isHairstyleLimited4Star, 240);
    }

    if (card.supply === 'colorful_fes' || card.supply === 'bloom_fes') {
      push(
        'fes_4star',
        'Fes 4★ (ColorFes / BloomFes)',
        'フェス限★4（カラフェス・ブルフェス）',
        (c) => c.supply === 'colorful_fes' || c.supply === 'bloom_fes',
        540
      );
      if (card.supply === 'bloom_fes') {
        push(
          'bloom_fes',
          'BloomFes 4★',
          'ブルームフェスティバル★4',
          (c) => c.supply === 'bloom_fes',
          720
        );
      }
    }

    if (card.isWorldLink) {
      push(
        'wl_4star',
        'World Link 4★',
        'ワールドリンク★4',
        (c) => c.rarity === 'rarity_4' && c.isWorldLink,
        450
      );
    }

    if (card.supply === 'collab_limited') {
      push(
        'collab_4star',
        'Collaboration Limited 4★',
        'コラボ限定★4',
        (c) => c.rarity === 'rarity_4' && c.supply === 'collab_limited',
        720
      );
    }

    if (card.supply === 'permanent') {
      push(
        'perm_4star',
        'Permanent 4★',
        '恒常★4',
        (c) => c.rarity === 'rarity_4' && c.supply === 'permanent',
        165
      );
    }

    push(
      `attr_${card.attr}_4star`,
      `${aMeta.labelEn} Attribute 4★`,
      `${aMeta.labelJa}属性 ★4`,
      (c) => c.rarity === 'rarity_4' && c.attr === card.attr,
      360,
      { attr: card.attr }
    );

    if (isHairstyleLimited4Star(card)) {
      push(
        `attr_${card.attr}_lim4`,
        `${aMeta.labelEn} Limited 4★`,
        `${aMeta.labelJa}属性 限定★4`,
        (c) => isHairstyleLimited4Star(c) && c.attr === card.attr,
        650,
        { attr: card.attr }
      );
    }

    if (
      character.id >= 21 &&
      card.supportUnit !== 'none' &&
      card.supportUnit !== 'virtual_singer'
    ) {
      const uMeta = UNIT_META[card.supportUnit];
      push(
        `sekai_${card.supportUnit}_4star`,
        `${uMeta.shortEn} SEKAI 4★`,
        `${uMeta.nameJa}セカイ ★4`,
        (c) => c.rarity === 'rarity_4' && c.supportUnit === card.supportUnit,
        520,
        { unitId: card.supportUnit }
      );
    }

    if (ev?.isSoloFocus && ev.focusCharacterId === character.id) {
      push(
        'solo_focus_4star',
        'Solo Focus Banner 4★',
        'ユニット箱イベバナー★4',
        (c) => {
          const ce = c.eventId ? eventById.get(c.eventId) : undefined;
          return (
            c.rarity === 'rarity_4' &&
            Boolean(ce?.isSoloFocus && ce.focusCharacterId === character.id)
          );
        },
        270
      );
    }

    if (ev?.isMixedEvent) {
      push(
        'mixed_4star',
        'Mixed Event 4★',
        '混合イベ★4',
        (c) => {
          const ce = c.eventId ? eventById.get(c.eventId) : undefined;
          return c.rarity === 'rarity_4' && Boolean(ce?.isMixedEvent);
        },
        320
      );
    }

    if (
      ev &&
      !ev.isMixedEvent &&
      !ev.isVsFocusEvent &&
      ev.eventType !== 'world_bloom' &&
      character.id >= 21
    ) {
      push(
        'vs_unit_focus_4star',
        'Unit-Focus VS 4★ Slot',
        '箱イベ★4出張枠',
        (c) => {
          const ce = c.eventId ? eventById.get(c.eventId) : undefined;
          return (
            c.rarity === 'rarity_4' &&
            Boolean(ce && !ce.isMixedEvent && !ce.isVsFocusEvent && ce.eventType !== 'world_bloom')
          );
        },
        190
      );
    }
  } else if (card.rarity === 'rarity_birthday') {
    push(
      'birthday',
      'Birthday / Anniversary Card',
      'バースデー・アニバーサリーカード',
      (c) => c.rarity === 'rarity_birthday',
      365
    );
  } else if (card.rarity === 'rarity_3') {
    if (card.eventId !== undefined) {
      push(
        'event_3star',
        'Event Reward 3★',
        'イベント報酬★3',
        (c) => c.rarity === 'rarity_3' && c.eventId !== undefined,
        270
      );
    }
    push('any_3star', 'Any 3★ Card', '全★3カード', (c) => c.rarity === 'rarity_3', 240);
    push(
      `attr_${card.attr}_3star`,
      `${aMeta.labelEn} Attribute 3★`,
      `${aMeta.labelJa}属性 ★3`,
      (c) => c.rarity === 'rarity_3' && c.attr === card.attr,
      480,
      { attr: card.attr }
    );
  } else if (card.rarity === 'rarity_2') {
    if (card.eventId !== undefined) {
      push(
        'event_2star',
        'Event Reward 2★',
        'イベント報酬★2',
        (c) => c.rarity === 'rarity_2' && c.eventId !== undefined,
        210
      );
    }
    push('any_2star', 'Any 2★ Card', '全★2カード', (c) => c.rarity === 'rarity_2', 190);
  } else {
    push('rarity_1', 'Initial 1★ Card', '初期★1カード', (c) => c.rarity === 'rarity_1', 365);
  }

  return results;
}

export function computeCardDossier(
  snapshot: CountdownSnapshot,
  cardId: number,
  now: number
): CardDossierResult | null {
  const cardById = new Map(snapshot.cards.map((c) => [c.id, c]));
  const card = cardById.get(cardId);
  if (!card) return null;

  const charById = new Map(snapshot.characters.map((c) => [c.id, c]));
  const character = charById.get(card.characterId);
  if (!character) return null;

  const eventById = new Map(snapshot.events.map((e) => [e.id, e]));
  const event = card.eventId ? eventById.get(card.eventId) : undefined;
  const eventStartsSorted = snapshot.events
    .filter((e) => e.cardIds.length > 0)
    .map((e) => e.startAt)
    .toSorted((a, b) => a - b);

  const charCards = snapshot.cards
    .filter((c) => c.characterId === character.id)
    .toSorted((a, b) => a.releaseAt - b.releaseAt || a.id - b.id);

  const allIdx = charCards.findIndex((c) => c.id === card.id);
  const sameRarityCards = charCards.filter((c) => c.rarity === card.rarity);
  const rarityIdx = sameRarityCards.findIndex((c) => c.id === card.id);

  const brokenDroughts = buildCardBrokenDroughts(
    card,
    character,
    charCards,
    eventById,
    eventStartsSorted,
    now
  );

  // Co-4★ banner duo droughts broken if this card is a 4★ in a non-World-Link event
  const duoBreaks: DuoDroughtBreakRecord[] = [];
  if (card.rarity === 'rarity_4' && event && event.eventType !== 'world_bloom') {
    const peer4Stars = event.cardIds
      .map((cid) => cardById.get(cid))
      .filter((c): c is CompactCard =>
        Boolean(c && c.rarity === 'rarity_4' && c.characterId !== character.id)
      );
    for (const peer of peer4Stars) {
      const duo = computeDuoBreakForEventPair(
        snapshot,
        cardById,
        charById,
        character.id,
        peer.characterId,
        event.id,
        now
      );
      if (duo) duoBreaks.push(duo);
    }
  }

  const eventCards = event
    ? event.cardIds.map((cid) => cardById.get(cid)).filter((c): c is CompactCard => Boolean(c))
    : [];

  const isUpcoming = card.releaseAt > now;
  const daysAgo = isUpcoming
    ? Math.max(0, Math.ceil((card.releaseAt - now) / MS_PER_DAY))
    : Math.max(0, Math.floor((now - card.releaseAt) / MS_PER_DAY));

  return {
    card,
    character,
    event,
    eventCards,
    prevCharacterCard: allIdx > 0 ? charCards[allIdx - 1] : undefined,
    nextCharacterCard:
      allIdx >= 0 && allIdx + 1 < charCards.length ? charCards[allIdx + 1] : undefined,
    prevSameRarityCard: rarityIdx > 0 ? sameRarityCards[rarityIdx - 1] : undefined,
    nextSameRarityCard:
      rarityIdx >= 0 && rarityIdx + 1 < sameRarityCards.length
        ? sameRarityCards[rarityIdx + 1]
        : undefined,
    daysAgo,
    isUpcoming,
    brokenDroughts,
    duoBreaks
  };
}

function computeRotationContextForEvent(
  snapshot: CountdownSnapshot,
  targetEvent: CompactEvent,
  charById: Map<number, CountdownCharacter>
): EventRotationContext | undefined {
  if (
    !targetEvent.isSoloFocus ||
    targetEvent.unit === 'mixed' ||
    targetEvent.unit === 'virtual_singer'
  ) {
    return undefined;
  }
  const focusChar = charById.get(targetEvent.focusCharacterId);
  if (!focusChar) return undefined;

  const unit = targetEvent.unit;
  const unitChars = snapshot.characters.filter((c) => c.unit === unit);
  const unitSoloEvents = snapshot.events
    .filter((e) => e.isSoloFocus && e.unit === unit)
    .toSorted((a, b) => a.startAt - b.startAt || a.id - b.id);

  const runningCounts = new Map<number, number>(unitChars.map((c) => [c.id, 0]));
  const lastFocusTs = new Map<number, number>(unitChars.map((c) => [c.id, 0]));

  for (const ev of unitSoloEvents) {
    const cid = ev.focusCharacterId;
    const prevCount = runningCounts.get(cid) ?? 0;
    const newCycle = prevCount + 1;
    const myPrevTs = lastFocusTs.get(cid) ?? 0;

    if (ev.id === targetEvent.id) {
      const cycleSkippedIds: number[] = [];
      const queueSkippedIds: number[] = [];

      for (const peer of unitChars) {
        if (peer.id === cid) continue;
        const peerCount = runningCounts.get(peer.id) ?? 0;
        const peerLastTs = lastFocusTs.get(peer.id) ?? 0;
        if (peerCount < newCycle - 1) {
          cycleSkippedIds.push(peer.id);
        } else if (newCycle >= 2 && peerCount === prevCount && peerLastTs < myPrevTs) {
          queueSkippedIds.push(peer.id);
        }
      }

      runningCounts.set(cid, newCycle);
      const countsAfter = unitChars.map((c) => runningCounts.get(c.id) ?? 0);
      const minAfter = Math.min(...countsAfter);
      const maxAfter = Math.max(...countsAfter);
      const waitingAfterEventIds =
        maxAfter > minAfter
          ? unitChars.filter((c) => (runningCounts.get(c.id) ?? 0) === minAfter).map((c) => c.id)
          : [];

      return {
        unit,
        focusCharacter: focusChar,
        cycle: newCycle,
        isCycleJump: cycleSkippedIds.length > 0,
        cycleSkippedIds,
        queueSkippedIds,
        waitingAfterEventIds
      };
    }

    runningCounts.set(cid, newCycle);
    lastFocusTs.set(cid, ev.startAt);
  }

  return undefined;
}

function rarityOrder(r: CompactCard['rarity']): number {
  if (r === 'rarity_4') return 0;
  if (r === 'rarity_birthday') return 1;
  if (r === 'rarity_3') return 2;
  if (r === 'rarity_2') return 3;
  return 4;
}

export function computeEventDossier(
  snapshot: CountdownSnapshot,
  eventId: number,
  now: number
): EventDossierResult | null {
  const eventsSorted = snapshot.events.toSorted((a, b) => a.startAt - b.startAt || a.id - b.id);
  const evIdx = eventsSorted.findIndex((e) => e.id === eventId);
  if (evIdx === -1) return null;

  const event = eventsSorted[evIdx];
  const charById = new Map(snapshot.characters.map((c) => [c.id, c]));
  const cardById = new Map(snapshot.cards.map((c) => [c.id, c]));
  const eventById = new Map(snapshot.events.map((e) => [e.id, e]));
  const musicById = new Map(snapshot.musics.map((m) => [m.id, m]));

  const eventStartsSorted = eventsSorted.filter((e) => e.cardIds.length > 0).map((e) => e.startAt);

  const status: EventDossierResult['status'] =
    event.startAt <= now && event.aggregateAt >= now
      ? 'live'
      : event.startAt > now
        ? 'upcoming'
        : 'ended';

  const daysDelta =
    status === 'upcoming'
      ? Math.max(0, Math.ceil((event.startAt - now) / MS_PER_DAY))
      : Math.max(0, Math.floor((now - event.startAt) / MS_PER_DAY));

  const focusCharacter = event.focusCharacterId ? charById.get(event.focusCharacterId) : undefined;
  const bannerCharacter = event.bannerCharacterId
    ? charById.get(event.bannerCharacterId)
    : undefined;
  const song = event.songId ? musicById.get(event.songId) : undefined;

  const altVocalCharacterIds = song
    ? Array.from(
        new Set(
          snapshot.anotherVocals
            .filter((av) => av.musicId === song.id)
            .flatMap((av) => av.characterIds)
        )
      )
    : [];

  // 1. Event-Level Droughts Broken
  const eventBreaks: BrokenDroughtRecord[] = [];
  const pushEventBreak = (
    key: string,
    labelEn: string,
    labelJa: string,
    predicate: (e: CompactEvent) => boolean,
    fallbackAvgDays: number,
    opts?: { characterId?: number; unitId?: SekaiUnitId }
  ) => {
    const items = eventsSorted.filter(predicate).map(eventToBreakRef);
    const rec = evaluateSequenceBreak({
      key,
      labelEn,
      labelJa,
      items,
      targetId: event.id,
      eventStartsSorted,
      now,
      fallbackAvgDays,
      characterId: opts?.characterId,
      unitId: opts?.unitId
    });
    if (rec) eventBreaks.push(rec);
  };

  if (event.isSoloFocus && focusCharacter) {
    pushEventBreak(
      'char_solo_focus',
      `${focusCharacter.givenNameEn} Solo Focus Event`,
      `${focusCharacter.givenNameJa} 箱イベバナー`,
      (e) => e.isSoloFocus && e.focusCharacterId === focusCharacter.id,
      270,
      { characterId: focusCharacter.id }
    );

    if (event.isHakolim) {
      pushEventBreak(
        'char_hakolim',
        `${focusCharacter.givenNameEn} Hakolim (Limited Focus)`,
        `${focusCharacter.givenNameJa} 箱限定（ハコリム）`,
        (e) => e.isSoloFocus && e.isHakolim && e.focusCharacterId === focusCharacter.id,
        540,
        { characterId: focusCharacter.id }
      );
    }

    if (event.unit !== 'mixed') {
      const uMeta = UNIT_META[event.unit];
      pushEventBreak(
        'unit_solo_focus',
        `${uMeta.shortEn} Unit Focus Event`,
        `${uMeta.nameJa} 箱イベ`,
        (e) => e.isSoloFocus && e.unit === event.unit,
        65,
        { unitId: event.unit }
      );
      if (event.isHakolim) {
        pushEventBreak(
          'unit_hakolim',
          `${uMeta.shortEn} Unit Hakolim`,
          `${uMeta.nameJa} 箱限定イベ`,
          (e) => e.isSoloFocus && e.isHakolim && e.unit === event.unit,
          180,
          { unitId: event.unit }
        );
      }
    }
  }

  if (event.isMixedEvent) {
    if (bannerCharacter && bannerCharacter.id <= 20) {
      pushEventBreak(
        'char_mixed_banner',
        `${bannerCharacter.givenNameEn} Mixed Event Banner Lead`,
        `${bannerCharacter.givenNameJa} 混合イベバナー`,
        (e) => e.isMixedEvent && e.bannerCharacterId === bannerCharacter.id,
        420,
        { characterId: bannerCharacter.id }
      );
    }
    pushEventBreak(
      'any_mixed',
      'Mixed / Shuffle Event',
      '混合イベント',
      (e) => e.isMixedEvent && e.cardIds.length > 0,
      30
    );
  }

  if (event.isVsFocusEvent) {
    if (bannerCharacter) {
      pushEventBreak(
        'vs_banner_char',
        `${bannerCharacter.givenNameEn} Dedicated VS Banner`,
        `${bannerCharacter.givenNameJa} バチャシン箱バナー`,
        (e) => e.isVsFocusEvent && e.bannerCharacterId === bannerCharacter.id,
        540,
        { characterId: bannerCharacter.id }
      );
    }
    pushEventBreak(
      'vs_focus_unit',
      'Dedicated Virtual Singer Event',
      'バチャシン箱イベント',
      (e) => e.isVsFocusEvent && e.cardIds.length > 0,
      180,
      { unitId: 'virtual_singer' }
    );
  }

  if (event.eventType === 'world_bloom') {
    pushEventBreak(
      'world_link',
      'World Link Event',
      'ワールドリンクイベント',
      (e) => e.eventType === 'world_bloom',
      90
    );
  }

  // Virtual Singer Commissioned Song Vocal wait broken on main-unit focus events
  if (song && event.unit !== 'mixed' && event.unit !== 'virtual_singer') {
    const vsSingers = song.sekaiVocalCharacterIds.filter((cid) => cid >= 21);
    for (const vsId of vsSingers) {
      const vsChar = charById.get(vsId);
      if (!vsChar) continue;
      pushEventBreak(
        `vs_song_${vsId}`,
        `${vsChar.givenNameEn} Unit-Focus Song Vocal`,
        `${vsChar.givenNameJa} 箱イベ書き下ろし歌唱`,
        (e) => {
          if (e.unit === 'mixed' || e.unit === 'virtual_singer' || !e.songId) return false;
          const m = musicById.get(e.songId);
          return Boolean(m?.sekaiVocalCharacterIds.includes(vsId));
        },
        140,
        { characterId: vsId }
      );
    }
  }

  // 2. Co-4★ Banner Duo Droughts Broken
  const duoBreaks: DuoDroughtBreakRecord[] = [];
  if (event.eventType !== 'world_bloom') {
    const fourStarCards = event.cardIds
      .map((cid) => cardById.get(cid))
      .filter((c): c is CompactCard => Boolean(c && c.rarity === 'rarity_4'));
    for (let i = 0; i < fourStarCards.length; i += 1) {
      for (let j = i + 1; j < fourStarCards.length; j += 1) {
        const ca = fourStarCards[i].characterId;
        const cb = fourStarCards[j].characterId;
        if (ca === cb) continue;
        const duo = computeDuoBreakForEventPair(
          snapshot,
          cardById,
          charById,
          ca,
          cb,
          event.id,
          now
        );
        if (duo) duoBreaks.push(duo);
      }
    }
    duoBreaks.sort((a, b) => b.daysBroken - a.daysBroken);
  }

  // 3. Lineup Cards & Their Primary Drought Breaks
  const cardsByChar = new Map<number, CompactCard[]>();
  for (const c of snapshot.cards) {
    let arr = cardsByChar.get(c.characterId);
    if (!arr) {
      arr = [];
      cardsByChar.set(c.characterId, arr);
    }
    arr.push(c);
  }
  for (const arr of cardsByChar.values()) {
    arr.sort((a, b) => a.releaseAt - b.releaseAt || a.id - b.id);
  }

  const rawLineup = event.cardIds
    .map((cid) => cardById.get(cid))
    .filter((c): c is CompactCard => Boolean(c))
    .toSorted((a, b) => {
      const rDiff = rarityOrder(a.rarity) - rarityOrder(b.rarity);
      if (rDiff !== 0) return rDiff;
      const aBanner = a.characterId === (event.focusCharacterId || event.bannerCharacterId) ? 0 : 1;
      const bBanner = b.characterId === (event.focusCharacterId || event.bannerCharacterId) ? 0 : 1;
      return aBanner - bBanner || a.id - b.id;
    });

  const lineupCards: EventCardSummary[] = rawLineup.flatMap((card) => {
    const ch = charById.get(card.characterId);
    if (!ch) return [];
    const charCards = cardsByChar.get(ch.id) ?? [];
    const primaryBreaks = buildCardBrokenDroughts(
      card,
      ch,
      charCards,
      eventById,
      eventStartsSorted,
      now
    );
    return [{ card, character: ch, primaryBreaks }];
  });

  const rotationContext = computeRotationContextForEvent(snapshot, event, charById);

  return {
    event,
    status,
    daysDelta,
    focusCharacter,
    bannerCharacter,
    song,
    altVocalCharacterIds,
    prevEvent: evIdx > 0 ? eventsSorted[evIdx - 1] : undefined,
    nextEvent: evIdx + 1 < eventsSorted.length ? eventsSorted[evIdx + 1] : undefined,
    rotationContext,
    eventBreaks,
    duoBreaks,
    lineupCards
  };
}
