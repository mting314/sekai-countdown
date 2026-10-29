import type {
  CardAttribute,
  CompactCard,
  CompactEvent,
  CompactMusic,
  CountdownCharacter,
  CountdownSnapshot,
  DroughtClock,
  DroughtSeverity,
  GapOccurrence,
  SekaiUnitId
} from '~/types/countdown';
import {
  ALL_CHARACTER_IDS,
  ALL_UNITS,
  CARD_ATTRIBUTES,
  HUMAN_CHARACTER_IDS,
  JP_LAUNCH_MS,
  MAIN_UNITS,
  MS_PER_DAY,
  UNIT_META,
  VIRTUAL_SINGER_IDS
} from './constants';

export function classifySeverity(overdueRatio: number, isRecordWait: boolean): DroughtSeverity {
  if (isRecordWait || overdueRatio >= 1.75) return 'record';
  if (overdueRatio >= 1.35) return 'overdue';
  if (overdueRatio >= 1.0) return 'due';
  if (overdueRatio >= 0.6) return 'normal';
  return 'fresh';
}

function countEventsAfter(
  eventStartsSorted: number[],
  sinceTs: number | null,
  now: number
): number {
  const floor = sinceTs ?? JP_LAUNCH_MS;
  let count = 0;
  for (const ts of eventStartsSorted) {
    if (ts > now) break;
    if (ts > floor) count += 1;
  }
  return count;
}

export function buildDroughtClock(params: {
  entityId: number | string;
  characterId?: number;
  unitId?: SekaiUnitId;
  occurrences: GapOccurrence[];
  now: number;
  fallbackAvgDays?: number;
  countableEventStarts?: number[];
}): DroughtClock {
  const {
    entityId,
    characterId,
    unitId,
    occurrences,
    now,
    fallbackAvgDays = 140,
    countableEventStarts
  } = params;

  const sorted = occurrences.toSorted((a, b) => a.timestamp - b.timestamp);
  const past: GapOccurrence[] = [];
  const future: GapOccurrence[] = [];

  for (const occ of sorted) {
    if (occ.timestamp <= now) {
      const prevTs = past.length > 0 ? past[past.length - 1].timestamp : JP_LAUNCH_MS;
      past.push({
        ...occ,
        gapDaysFromPrev: Math.max(0, Math.round((occ.timestamp - prevTs) / MS_PER_DAY))
      });
    } else {
      future.push(occ);
    }
  }

  const last = past.at(-1);
  const lastTimestamp = last?.timestamp ?? null;
  const daysSince = Math.max(0, Math.floor((now - (lastTimestamp ?? JP_LAUNCH_MS)) / MS_PER_DAY));

  // Inter-release gaps (from 2nd occurrence onward) capture steady-state cadence;
  // include launch-to-first gap when only 1 occurrence exists.
  const interGaps =
    past.length >= 2
      ? past.slice(1).map((p) => p.gapDaysFromPrev ?? 0)
      : past.length === 1
        ? [past[0].gapDaysFromPrev ?? fallbackAvgDays]
        : [];

  const avgGapDays =
    interGaps.length > 0
      ? Math.max(14, Math.round(interGaps.reduce((s, d) => s + d, 0) / interGaps.length))
      : fallbackAvgDays;

  const maxGapDays = interGaps.length > 0 ? Math.max(...interGaps) : avgGapDays;
  const overdueRatio = avgGapDays > 0 ? Number((daysSince / avgGapDays).toFixed(2)) : 0;
  const isRecordWait = past.length >= 2 && daysSince > maxGapDays;
  const severity = classifySeverity(overdueRatio, isRecordWait);

  return {
    entityId,
    characterId,
    unitId,
    daysSince,
    eventsSince: countableEventStarts
      ? countEventsAfter(countableEventStarts, lastTimestamp, now)
      : undefined,
    count: past.length,
    lastTimestamp,
    avgGapDays,
    maxGapDays,
    overdueRatio,
    isRecordWait,
    severity,
    latest: last,
    upcoming: future[0],
    history: past
  };
}

export interface BannerTimelineState {
  activeEvent?: CompactEvent;
  latestPastEvent?: CompactEvent;
  upcomingEvents: CompactEvent[];
}

export function getBannerTimelineState(
  snapshot: CountdownSnapshot,
  now: number
): BannerTimelineState {
  const activeEvent = snapshot.events.find((e) => e.startAt <= now && e.aggregateAt >= now);
  const pastEvents = snapshot.events.filter((e) => e.startAt <= now);
  const upcomingEvents = snapshot.events.filter((e) => e.startAt > now);
  return {
    activeEvent,
    latestPastEvent: pastEvents.at(-1),
    upcomingEvents
  };
}

export interface RotationCell {
  cycle: number;
  event?: CompactEvent;
  focusCard?: CompactCard;
  song?: CompactMusic;
  isUpcoming?: boolean;
  /** True if this member started cycle `k` while >= 1 unitmate had `< k - 1` focuses. */
  isCycleJump: boolean;
  /** Unitmate IDs who had been waiting longer (earlier `k - 1` focus) when this `k` focus dropped. */
  queueJumpedIds: number[];
}

export interface UnitRotationSummary {
  unit: SekaiUnitId;
  minCycle: number;
  maxCycle: number;
  waitingCharacterIds: number[];
  aheadCharacterIds: number[];
  rows: {
    character: CountdownCharacter;
    focusCount: number;
    clock: DroughtClock;
    cells: RotationCell[];
  }[];
  recentJumps: {
    event: CompactEvent;
    characterId: number;
    cycle: number;
    kind: 'cycle_jump' | 'queue_jump';
    skippedCharacterIds: number[];
  }[];
}

export interface FocusMetricsResult {
  characterFocus: DroughtClock[];
  characterHakolim: DroughtClock[];
  unitFocus: DroughtClock[];
  unitHakolim: DroughtClock[];
  rotationByUnit: Record<SekaiUnitId, UnitRotationSummary>;
}

function realEventStarts(snapshot: CountdownSnapshot): number[] {
  return snapshot.events
    .filter((e) => e.cardIds.length > 0 || e.eventType === 'world_bloom')
    .map((e) => e.startAt);
}

export function computeFocusMetrics(snapshot: CountdownSnapshot, now: number): FocusMetricsResult {
  const cardById = new Map(snapshot.cards.map((c) => [c.id, c]));
  const musicById = new Map(snapshot.musics.map((m) => [m.id, m]));
  const charById = new Map(snapshot.characters.map((c) => [c.id, c]));
  const countableStarts = realEventStarts(snapshot);

  const soloEvents = snapshot.events.filter((e) => e.isSoloFocus && e.focusCharacterId > 0);

  const findFocusCard = (ev: CompactEvent): CompactCard | undefined => {
    const cards = ev.cardIds
      .map((id) => cardById.get(id))
      .filter((c): c is CompactCard => Boolean(c));
    return (
      cards.find((c) => c.characterId === ev.focusCharacterId && c.rarity === 'rarity_4') ??
      cards.find((c) => c.characterId === ev.focusCharacterId) ??
      cards.find((c) => c.rarity === 'rarity_4')
    );
  };

  const toEventOcc = (ev: CompactEvent): GapOccurrence => {
    const fc = findFocusCard(ev);
    return {
      timestamp: ev.startAt,
      labelJa: ev.nameJa,
      labelEn: ev.nameEn,
      sublabel: ev.nickname,
      eventId: ev.id,
      cardId: fc?.id,
      musicId: ev.songId
    };
  };

  const characterFocus: DroughtClock[] = HUMAN_CHARACTER_IDS.map((cid) =>
    buildDroughtClock({
      entityId: cid,
      characterId: cid,
      unitId: charById.get(cid)?.unit,
      occurrences: soloEvents.filter((e) => e.focusCharacterId === cid).map(toEventOcc),
      now,
      fallbackAvgDays: 145,
      countableEventStarts: countableStarts
    })
  );

  const characterHakolim: DroughtClock[] = HUMAN_CHARACTER_IDS.map((cid) =>
    buildDroughtClock({
      entityId: cid,
      characterId: cid,
      unitId: charById.get(cid)?.unit,
      occurrences: soloEvents
        .filter((e) => e.focusCharacterId === cid && e.isHakolim)
        .map(toEventOcc),
      now,
      fallbackAvgDays: 420,
      countableEventStarts: countableStarts
    })
  );

  const unitFocus: DroughtClock[] = MAIN_UNITS.map((unit) =>
    buildDroughtClock({
      entityId: unit,
      unitId: unit,
      occurrences: soloEvents.filter((e) => e.unit === unit).map(toEventOcc),
      now,
      fallbackAvgDays: 36,
      countableEventStarts: countableStarts
    })
  );

  const unitHakolim: DroughtClock[] = MAIN_UNITS.map((unit) =>
    buildDroughtClock({
      entityId: unit,
      unitId: unit,
      occurrences: soloEvents.filter((e) => e.unit === unit && e.isHakolim).map(toEventOcc),
      now,
      fallbackAvgDays: 140,
      countableEventStarts: countableStarts
    })
  );

  const focusClockByChar = new Map(characterFocus.map((c) => [c.characterId!, c]));

  const rotationByUnit = {} as Record<SekaiUnitId, UnitRotationSummary>;
  for (const unit of MAIN_UNITS) {
    const unitChars = snapshot.characters.filter((c) => c.unit === unit);
    const unitSoloPast = soloEvents.filter((e) => e.unit === unit && e.startAt <= now);
    const unitSoloAll = soloEvents.filter((e) => e.unit === unit);

    // Track running counts and last-focus timestamps as each focus event occurs in this unit
    const runningCounts = new Map<number, number>(unitChars.map((c) => [c.id, 0]));
    const lastFocusTs = new Map<number, number>(unitChars.map((c) => [c.id, 0]));
    const jumpMetaByEventId = new Map<number, { isCycleJump: boolean; queueJumpedIds: number[] }>();
    const recentJumps: UnitRotationSummary['recentJumps'] = [];

    for (const ev of unitSoloPast) {
      const cid = ev.focusCharacterId;
      const prevCount = runningCounts.get(cid) ?? 0;
      const newCycle = prevCount + 1;
      const myPrevTs = lastFocusTs.get(cid) ?? 0;

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

      const isCycleJump = cycleSkippedIds.length > 0;
      jumpMetaByEventId.set(ev.id, { isCycleJump, queueJumpedIds: queueSkippedIds });

      if (isCycleJump || queueSkippedIds.length > 0) {
        recentJumps.push({
          event: ev,
          characterId: cid,
          cycle: newCycle,
          kind: isCycleJump ? 'cycle_jump' : 'queue_jump',
          skippedCharacterIds: isCycleJump ? cycleSkippedIds : queueSkippedIds
        });
      }

      runningCounts.set(cid, newCycle);
      lastFocusTs.set(cid, ev.startAt);
    }

    const countsArr = unitChars.map((c) => runningCounts.get(c.id) ?? 0);
    const minCycle = Math.min(...countsArr);
    const maxCycle = Math.max(1, ...countsArr);

    const waitingCharacterIds =
      maxCycle > minCycle
        ? unitChars.filter((c) => (runningCounts.get(c.id) ?? 0) === minCycle).map((c) => c.id)
        : [];
    const aheadCharacterIds =
      maxCycle > minCycle
        ? unitChars.filter((c) => (runningCounts.get(c.id) ?? 0) > minCycle).map((c) => c.id)
        : [];

    // Include an extra upcoming column if any preloaded future event extends beyond maxCycle
    const displayMaxCycle = Math.max(maxCycle, ...unitSoloAll.map((e) => e.focusIndex ?? 0));

    const rows = unitChars.map((ch) => {
      const charEvents = unitSoloAll.filter((e) => e.focusCharacterId === ch.id);
      const cells: RotationCell[] = [];
      for (let cycle = 1; cycle <= displayMaxCycle; cycle += 1) {
        const ev = charEvents.find((e) => e.focusIndex === cycle);
        const jumpMeta = ev ? jumpMetaByEventId.get(ev.id) : undefined;
        cells.push({
          cycle,
          event: ev,
          focusCard: ev ? findFocusCard(ev) : undefined,
          song: ev?.songId ? musicById.get(ev.songId) : undefined,
          isUpcoming: ev ? ev.startAt > now : false,
          isCycleJump: jumpMeta?.isCycleJump ?? false,
          queueJumpedIds: jumpMeta?.queueJumpedIds ?? []
        });
      }
      return {
        character: ch,
        focusCount: runningCounts.get(ch.id) ?? 0,
        clock: focusClockByChar.get(ch.id)!,
        cells
      };
    });

    rotationByUnit[unit] = {
      unit,
      minCycle,
      maxCycle,
      waitingCharacterIds,
      aheadCharacterIds,
      rows,
      recentJumps: recentJumps.toReversed()
    };
  }

  return {
    characterFocus,
    characterHakolim,
    unitFocus,
    unitHakolim,
    rotationByUnit
  };
}

export interface CardFilterOptions {
  includeWorldLink: boolean;
  includeCollab: boolean;
}

export interface CharacterFesSummary {
  characterId: number;
  colorFesCount: number;
  bloomFesCount: number;
  clock: DroughtClock;
}

export interface CardMetricsResult {
  any4Star: DroughtClock[];
  lim4Star: DroughtClock[];
  fes4Star: CharacterFesSummary[];
  waitingForBloomFesIds: number[];
  perm4Star: DroughtClock[];
  event3Star: DroughtClock[];
  event2Star: DroughtClock[];
}

function isStandardLim4Star(card: CompactCard, opts: CardFilterOptions): boolean {
  if (card.rarity !== 'rarity_4') return false;
  if (card.supply === 'permanent' || card.supply === 'birthday') return false;
  if (!opts.includeWorldLink && card.isWorldLink) return false;
  if (!opts.includeCollab && card.supply === 'collab_limited') return false;
  return true;
}

function toCardOcc(card: CompactCard, eventById: Map<number, CompactEvent>): GapOccurrence {
  const ev = card.eventId ? eventById.get(card.eventId) : undefined;
  return {
    timestamp: card.releaseAt,
    labelJa: card.prefixJa || ev?.nameJa || `#${card.id}`,
    labelEn: card.prefixEn || ev?.nameEn,
    sublabel: ev?.nickname || card.supply,
    cardId: card.id,
    eventId: card.eventId
  };
}

export function computeCardMetrics(
  snapshot: CountdownSnapshot,
  now: number,
  options: CardFilterOptions = { includeWorldLink: false, includeCollab: true }
): CardMetricsResult {
  const charById = new Map(snapshot.characters.map((c) => [c.id, c]));
  const eventById = new Map(snapshot.events.map((e) => [e.id, e]));
  const countableStarts = realEventStarts(snapshot);

  const cardsByChar = new Map<number, CompactCard[]>();
  for (const cid of ALL_CHARACTER_IDS) cardsByChar.set(cid, []);
  for (const c of snapshot.cards) {
    cardsByChar.get(c.characterId)?.push(c);
  }

  const buildForPredicate = (
    pred: (c: CompactCard) => boolean,
    fallbackAvgDays: number
  ): DroughtClock[] =>
    ALL_CHARACTER_IDS.map((cid) =>
      buildDroughtClock({
        entityId: cid,
        characterId: cid,
        unitId: charById.get(cid)?.unit,
        occurrences: (cardsByChar.get(cid) ?? []).filter(pred).map((c) => toCardOcc(c, eventById)),
        now,
        fallbackAvgDays,
        countableEventStarts: countableStarts
      })
    );

  const any4Star = buildForPredicate((c) => c.rarity === 'rarity_4', 95);
  const lim4Star = buildForPredicate((c) => isStandardLim4Star(c, options), 240);
  const perm4Star = buildForPredicate(
    (c) => c.rarity === 'rarity_4' && c.supply === 'permanent',
    165
  );
  const event3Star = buildForPredicate(
    (c) => c.rarity === 'rarity_3' && c.eventId !== undefined,
    270
  );
  const event2Star = buildForPredicate(
    (c) => c.rarity === 'rarity_2' && c.eventId !== undefined,
    250
  );

  const fesClocks = buildForPredicate(
    (c) => c.rarity === 'rarity_4' && (c.supply === 'colorful_fes' || c.supply === 'bloom_fes'),
    650
  );

  const fes4Star: CharacterFesSummary[] = ALL_CHARACTER_IDS.map((cid, idx) => {
    const pastCards = (cardsByChar.get(cid) ?? []).filter((c) => c.releaseAt <= now);
    const colorFesCount = pastCards.filter((c) => c.supply === 'colorful_fes').length;
    const bloomFesCount = pastCards.filter((c) => c.supply === 'bloom_fes').length;
    return {
      characterId: cid,
      colorFesCount,
      bloomFesCount,
      clock: fesClocks[idx]
    };
  });

  const waitingForBloomFesIds = fes4Star
    .filter((f) => f.bloomFesCount === 0)
    .toSorted((a, b) => b.clock.daysSince - a.clock.daysSince)
    .map((f) => f.characterId);

  return {
    any4Star,
    lim4Star,
    fes4Star,
    waitingForBloomFesIds,
    perm4Star,
    event3Star,
    event2Star
  };
}

export interface VsSubUnitCell {
  vsCharacterId: number;
  supportUnit: SekaiUnitId;
  clock4Star: DroughtClock;
  clockAnyCard: DroughtClock;
}

export interface VirtualSingerMetricsResult {
  unitFocusVs4Star: DroughtClock[];
  unitFocusVsAnyCard: DroughtClock[];
  unitFocusVsSong: DroughtClock[];
  vsBannerFocus: DroughtClock[];
  subUnitMatrix: VsSubUnitCell[][];
}

export function computeVirtualSingerMetrics(
  snapshot: CountdownSnapshot,
  now: number
): VirtualSingerMetricsResult {
  const cardById = new Map(snapshot.cards.map((c) => [c.id, c]));
  const musicById = new Map(snapshot.musics.map((m) => [m.id, m]));
  const eventById = new Map(snapshot.events.map((e) => [e.id, e]));

  const soloFocusEvents = snapshot.events.filter((e) => e.isSoloFocus);
  const soloFocusStarts = soloFocusEvents.map((e) => e.startAt);
  const countableStarts = realEventStarts(snapshot);

  const unitFocusVs4Star: DroughtClock[] = VIRTUAL_SINGER_IDS.map((vsId) => {
    const occs: GapOccurrence[] = [];
    for (const ev of soloFocusEvents) {
      const vsCard = ev.cardIds
        .map((id) => cardById.get(id))
        .find((c) => c && c.characterId === vsId && c.rarity === 'rarity_4');
      if (vsCard) {
        occs.push({
          timestamp: ev.startAt,
          labelJa: ev.nameJa,
          labelEn: ev.nameEn,
          sublabel: `${ev.nickname ?? ''} · ${UNIT_META[ev.unit].shortEn}`,
          eventId: ev.id,
          cardId: vsCard.id
        });
      }
    }
    return buildDroughtClock({
      entityId: vsId,
      characterId: vsId,
      unitId: 'virtual_singer',
      occurrences: occs,
      now,
      fallbackAvgDays: 120,
      countableEventStarts: soloFocusStarts
    });
  });

  const unitFocusVsAnyCard: DroughtClock[] = VIRTUAL_SINGER_IDS.map((vsId) => {
    const occs: GapOccurrence[] = [];
    for (const ev of soloFocusEvents) {
      const vsCard = ev.cardIds
        .map((id) => cardById.get(id))
        .find((c) => c && c.characterId === vsId);
      if (vsCard) {
        occs.push({
          timestamp: ev.startAt,
          labelJa: ev.nameJa,
          labelEn: ev.nameEn,
          sublabel: `${ev.nickname ?? ''} · ${UNIT_META[ev.unit].shortEn}`,
          eventId: ev.id,
          cardId: vsCard.id
        });
      }
    }
    return buildDroughtClock({
      entityId: vsId,
      characterId: vsId,
      unitId: 'virtual_singer',
      occurrences: occs,
      now,
      fallbackAvgDays: 75,
      countableEventStarts: soloFocusStarts
    });
  });

  const unitFocusVsSong: DroughtClock[] = VIRTUAL_SINGER_IDS.map((vsId) => {
    const occs: GapOccurrence[] = [];
    for (const ev of soloFocusEvents) {
      const song = ev.songId ? musicById.get(ev.songId) : undefined;
      if (song && song.sekaiVocalCharacterIds.includes(vsId)) {
        const vsCard = ev.cardIds
          .map((id) => cardById.get(id))
          .find((c) => c && c.characterId === vsId);
        occs.push({
          timestamp: ev.startAt,
          labelJa: song.titleJa,
          labelEn: song.titleEn,
          sublabel: `${ev.nickname ?? ''} · ${UNIT_META[ev.unit].shortEn}`,
          eventId: ev.id,
          musicId: song.id,
          cardId: vsCard?.id
        });
      }
    }
    return buildDroughtClock({
      entityId: vsId,
      characterId: vsId,
      unitId: 'virtual_singer',
      occurrences: occs,
      now,
      fallbackAvgDays: 90,
      countableEventStarts: soloFocusStarts
    });
  });

  const vsBannerFocus: DroughtClock[] = VIRTUAL_SINGER_IDS.map((vsId) => {
    const occs: GapOccurrence[] = snapshot.events
      .filter((e) => e.isVsFocusEvent && e.bannerCharacterId === vsId)
      .map((ev) => {
        const bannerCard = ev.cardIds
          .map((id) => cardById.get(id))
          .find((c) => c && c.characterId === vsId);
        return {
          timestamp: ev.startAt,
          labelJa: ev.nameJa,
          labelEn: ev.nameEn,
          eventId: ev.id,
          cardId: bannerCard?.id
        };
      });
    return buildDroughtClock({
      entityId: vsId,
      characterId: vsId,
      unitId: 'virtual_singer',
      occurrences: occs,
      now,
      fallbackAvgDays: 500,
      countableEventStarts: countableStarts
    });
  });

  const vsCards = snapshot.cards.filter((c) => c.characterId >= 21 && c.characterId <= 26);
  const subUnitMatrix: VsSubUnitCell[][] = VIRTUAL_SINGER_IDS.map((vsId) =>
    MAIN_UNITS.map((unit) => {
      const matching = vsCards.filter((c) => c.characterId === vsId && c.supportUnit === unit);
      return {
        vsCharacterId: vsId,
        supportUnit: unit,
        clock4Star: buildDroughtClock({
          entityId: `${vsId}:${unit}:4`,
          characterId: vsId,
          unitId: unit,
          occurrences: matching
            .filter((c) => c.rarity === 'rarity_4')
            .map((c) => toCardOcc(c, eventById)),
          now,
          fallbackAvgDays: 420
        }),
        clockAnyCard: buildDroughtClock({
          entityId: `${vsId}:${unit}:any`,
          characterId: vsId,
          unitId: unit,
          occurrences: matching
            .filter((c) => c.rarity !== 'rarity_1' && c.rarity !== 'rarity_birthday')
            .map((c) => toCardOcc(c, eventById)),
          now,
          fallbackAvgDays: 220
        })
      };
    })
  );

  return {
    unitFocusVs4Star,
    unitFocusVsAnyCard,
    unitFocusVsSong,
    vsBannerFocus,
    subUnitMatrix
  };
}

export interface AttributeCell {
  characterId: number;
  attr: CardAttribute;
  clockAll4Star: DroughtClock;
  clockLim4Star: DroughtClock;
}

export interface MixedAndAttributeMetricsResult {
  mixedBanner: DroughtClock[];
  mixedLineup4Star: DroughtClock[];
  mixedLineupAny: DroughtClock[];
  attributeMatrix: AttributeCell[][];
}

export function computeMixedAndAttributeMetrics(
  snapshot: CountdownSnapshot,
  now: number
): MixedAndAttributeMetricsResult {
  const charById = new Map(snapshot.characters.map((c) => [c.id, c]));
  const cardById = new Map(snapshot.cards.map((c) => [c.id, c]));
  const eventById = new Map(snapshot.events.map((e) => [e.id, e]));
  const mixedEvents = snapshot.events.filter((e) => e.isMixedEvent);
  const mixedStarts = mixedEvents.map((e) => e.startAt);

  // Mixed event banners are led by the 20 human characters (Virtual Singers lead vs_focus events instead)
  const mixedBanner: DroughtClock[] = HUMAN_CHARACTER_IDS.map((cid) => {
    const occs: GapOccurrence[] = mixedEvents
      .filter((e) => e.bannerCharacterId === cid)
      .map((ev) => {
        const card = ev.cardIds
          .map((id) => cardById.get(id))
          .find((c) => c && c.characterId === cid);
        return {
          timestamp: ev.startAt,
          labelJa: ev.nameJa,
          labelEn: ev.nameEn,
          eventId: ev.id,
          cardId: card?.id
        };
      });
    return buildDroughtClock({
      entityId: cid,
      characterId: cid,
      unitId: charById.get(cid)?.unit,
      occurrences: occs,
      now,
      fallbackAvgDays: 450,
      countableEventStarts: mixedStarts
    });
  });

  const mixedLineup4Star: DroughtClock[] = ALL_CHARACTER_IDS.map((cid) => {
    const occs: GapOccurrence[] = [];
    for (const ev of mixedEvents) {
      const card = ev.cardIds
        .map((id) => cardById.get(id))
        .find((c) => c && c.characterId === cid && c.rarity === 'rarity_4');
      if (card) {
        occs.push({
          timestamp: ev.startAt,
          labelJa: ev.nameJa,
          labelEn: ev.nameEn,
          eventId: ev.id,
          cardId: card.id
        });
      }
    }
    return buildDroughtClock({
      entityId: cid,
      characterId: cid,
      unitId: charById.get(cid)?.unit,
      occurrences: occs,
      now,
      fallbackAvgDays: 220,
      countableEventStarts: mixedStarts
    });
  });

  const mixedLineupAny: DroughtClock[] = ALL_CHARACTER_IDS.map((cid) => {
    const occs: GapOccurrence[] = [];
    for (const ev of mixedEvents) {
      const card = ev.cardIds.map((id) => cardById.get(id)).find((c) => c && c.characterId === cid);
      if (card) {
        occs.push({
          timestamp: ev.startAt,
          labelJa: ev.nameJa,
          labelEn: ev.nameEn,
          eventId: ev.id,
          cardId: card.id
        });
      }
    }
    return buildDroughtClock({
      entityId: cid,
      characterId: cid,
      unitId: charById.get(cid)?.unit,
      occurrences: occs,
      now,
      fallbackAvgDays: 135,
      countableEventStarts: mixedStarts
    });
  });

  const cards4ByChar = new Map<number, CompactCard[]>();
  for (const cid of ALL_CHARACTER_IDS) cards4ByChar.set(cid, []);
  for (const c of snapshot.cards) {
    if (c.rarity === 'rarity_4') cards4ByChar.get(c.characterId)?.push(c);
  }

  const attributeMatrix: AttributeCell[][] = ALL_CHARACTER_IDS.map((cid) =>
    CARD_ATTRIBUTES.map((attr) => {
      const matching = (cards4ByChar.get(cid) ?? []).filter((c) => c.attr === attr);
      return {
        characterId: cid,
        attr,
        clockAll4Star: buildDroughtClock({
          entityId: `${cid}:${attr}:all`,
          characterId: cid,
          unitId: charById.get(cid)?.unit,
          occurrences: matching.map((c) => toCardOcc(c, eventById)),
          now,
          fallbackAvgDays: 420
        }),
        clockLim4Star: buildDroughtClock({
          entityId: `${cid}:${attr}:lim`,
          characterId: cid,
          unitId: charById.get(cid)?.unit,
          occurrences: matching
            .filter((c) => isStandardLim4Star(c, { includeWorldLink: false, includeCollab: true }))
            .map((c) => toCardOcc(c, eventById)),
          now,
          fallbackAvgDays: 750
        })
      };
    })
  );

  return {
    mixedBanner,
    mixedLineup4Star,
    mixedLineupAny,
    attributeMatrix
  };
}

export interface DuoPairingEntry {
  charA: number;
  charB: number;
  sameUnit: boolean;
  sharedCount: number;
  daysSince: number;
  lastTimestamp: number | null;
  latestEvent?: CompactEvent;
  cardAId?: number;
  cardBId?: number;
}

export interface UnitMusicSummary {
  unit: SekaiUnitId;
  commissioned: DroughtClock;
  cover: DroughtClock;
  mv3d: DroughtClock;
  mv2d: DroughtClock;
}

export interface ExtrasMetricsResult {
  altVocals: DroughtClock[];
  stamps: DroughtClock[];
  unitSongs: UnitMusicSummary[];
  duoPairingsForCharacter: (charId: number) => DuoPairingEntry[];
  topOverdueSameUnitDuos: DuoPairingEntry[];
}

function toMusicOcc(m: CompactMusic): GapOccurrence {
  return {
    timestamp: m.publishedAt,
    labelJa: m.titleJa,
    labelEn: m.titleEn,
    musicId: m.id
  };
}

function keyFor(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function computeExtrasMetrics(
  snapshot: CountdownSnapshot,
  now: number
): ExtrasMetricsResult {
  const charById = new Map(snapshot.characters.map((c) => [c.id, c]));
  const musicById = new Map(snapshot.musics.map((m) => [m.id, m]));
  const cardById = new Map(snapshot.cards.map((c) => [c.id, c]));

  const altVocals: DroughtClock[] = ALL_CHARACTER_IDS.map((cid) => {
    const occs: GapOccurrence[] = snapshot.anotherVocals
      .filter((v) => v.characterIds.includes(cid))
      .map((v) => {
        const m = musicById.get(v.musicId);
        const coSingers = v.characterIds
          .filter((id) => id !== cid)
          .map((id) => charById.get(id)?.givenNameEn)
          .filter(Boolean)
          .join(', ');
        return {
          timestamp: v.publishedAt,
          labelJa: m?.titleJa ?? `Song #${v.musicId}`,
          labelEn: m?.titleEn,
          sublabel: coSingers ? `w/ ${coSingers}` : 'Solo',
          musicId: v.musicId
        };
      });
    return buildDroughtClock({
      entityId: cid,
      characterId: cid,
      unitId: charById.get(cid)?.unit,
      occurrences: occs,
      now,
      fallbackAvgDays: 110
    });
  });

  const stamps: DroughtClock[] = ALL_CHARACTER_IDS.map((cid) => {
    const occs: GapOccurrence[] = snapshot.stamps
      .filter((s) => s.characterId1 === cid || s.characterId2 === cid)
      .map((s) => ({
        timestamp: s.publishedAt,
        labelJa: s.nameJa,
        stampId: s.id
      }));
    return buildDroughtClock({
      entityId: cid,
      characterId: cid,
      unitId: charById.get(cid)?.unit,
      occurrences: occs,
      now,
      fallbackAvgDays: 120
    });
  });

  const unitSongs: UnitMusicSummary[] = ALL_UNITS.map((unit) => {
    const unitMusics = snapshot.musics.filter((m) => m.units.includes(unit));
    return {
      unit,
      commissioned: buildDroughtClock({
        entityId: `${unit}:comm`,
        unitId: unit,
        occurrences: unitMusics.filter((m) => m.commissioned).map(toMusicOcc),
        now,
        fallbackAvgDays: 45
      }),
      cover: buildDroughtClock({
        entityId: `${unit}:cover`,
        unitId: unit,
        occurrences: unitMusics.filter((m) => !m.commissioned).map(toMusicOcc),
        now,
        fallbackAvgDays: 45
      }),
      mv3d: buildDroughtClock({
        entityId: `${unit}:mv3d`,
        unitId: unit,
        occurrences: unitMusics.filter((m) => m.categories.includes('mv')).map(toMusicOcc),
        now,
        fallbackAvgDays: 60
      }),
      mv2d: buildDroughtClock({
        entityId: `${unit}:mv2d`,
        unitId: unit,
        occurrences: unitMusics.filter((m) => m.categories.includes('mv_2d')).map(toMusicOcc),
        now,
        fallbackAvgDays: 55
      })
    };
  });

  // Co-4★ Banner Duos (excluding World Link events that drop whole units simultaneously)
  const pairMap = new Map<string, DuoPairingEntry>();

  for (let i = 0; i < ALL_CHARACTER_IDS.length; i += 1) {
    for (let j = i + 1; j < ALL_CHARACTER_IDS.length; j += 1) {
      const a = ALL_CHARACTER_IDS[i];
      const b = ALL_CHARACTER_IDS[j];
      pairMap.set(keyFor(a, b), {
        charA: a,
        charB: b,
        sameUnit: charById.get(a)?.unit === charById.get(b)?.unit,
        sharedCount: 0,
        daysSince: Math.max(0, Math.floor((now - JP_LAUNCH_MS) / MS_PER_DAY)),
        lastTimestamp: null
      });
    }
  }

  for (const ev of snapshot.events) {
    if (ev.startAt > now || ev.eventType === 'world_bloom') continue;
    const fourStarCards = ev.cardIds
      .map((id) => cardById.get(id))
      .filter((c): c is CompactCard => Boolean(c && c.rarity === 'rarity_4'));
    for (let i = 0; i < fourStarCards.length; i += 1) {
      for (let j = i + 1; j < fourStarCards.length; j += 1) {
        const ca = fourStarCards[i];
        const cb = fourStarCards[j];
        if (ca.characterId === cb.characterId) continue;
        const entry = pairMap.get(keyFor(ca.characterId, cb.characterId));
        if (!entry) continue;
        entry.sharedCount += 1;
        if (entry.lastTimestamp === null || ev.startAt >= entry.lastTimestamp) {
          entry.lastTimestamp = ev.startAt;
          entry.daysSince = Math.max(0, Math.floor((now - ev.startAt) / MS_PER_DAY));
          entry.latestEvent = ev;
          entry.cardAId = ca.characterId === entry.charA ? ca.id : cb.id;
          entry.cardBId = ca.characterId === entry.charB ? ca.id : cb.id;
        }
      }
    }
  }

  const duoPairingsForCharacter = (charId: number): DuoPairingEntry[] => {
    const out: DuoPairingEntry[] = [];
    for (const other of ALL_CHARACTER_IDS) {
      if (other === charId) continue;
      const entry = pairMap.get(keyFor(charId, other));
      if (entry) out.push(entry);
    }
    return out.toSorted((a, b) => b.daysSince - a.daysSince);
  };

  const topOverdueSameUnitDuos = [...pairMap.values()]
    .filter((p) => p.sameUnit && p.charA <= 20 && p.charB <= 20)
    .toSorted((a, b) => b.daysSince - a.daysSince);

  return {
    altVocals,
    stamps,
    unitSongs,
    duoPairingsForCharacter,
    topOverdueSameUnitDuos
  };
}

export interface CharacterDossier {
  character: CountdownCharacter;
  heroCard?: CompactCard;
  latestLimCard?: CompactCard;
  latestStampId?: number;
  clocks: {
    key: string;
    labelKey: string;
    defaultLabel: string;
    clock: DroughtClock;
  }[];
  attributes: AttributeCell[];
  subUnits?: VsSubUnitCell[];
  timeline: {
    kind: 'focus' | 'card4';
    timestamp: number;
    gapDays?: number;
    event?: CompactEvent;
    card?: CompactCard;
  }[];
}

export function computeCharacterDossier(
  snapshot: CountdownSnapshot,
  characterId: number,
  now: number
): CharacterDossier | undefined {
  const character = snapshot.characters.find((c) => c.id === characterId);
  if (!character) return undefined;

  const focus = computeFocusMetrics(snapshot, now);
  const cards = computeCardMetrics(snapshot, now, { includeWorldLink: false, includeCollab: true });
  const vs = computeVirtualSingerMetrics(snapshot, now);
  const mixedAttr = computeMixedAndAttributeMetrics(snapshot, now);
  const extras = computeExtrasMetrics(snapshot, now);

  const byChar = (arr: DroughtClock[]) => arr.find((c) => c.characterId === characterId)!;

  const clocks: CharacterDossier['clocks'] = [];
  if (characterId <= 20) {
    clocks.push(
      {
        key: 'solo_focus',
        labelKey: 'clocks.solo_focus',
        defaultLabel: 'Solo Focus Event',
        clock: byChar(focus.characterFocus)
      },
      {
        key: 'hakolim',
        labelKey: 'clocks.hakolim',
        defaultLabel: 'Hakolim (Limited Focus)',
        clock: byChar(focus.characterHakolim)
      }
    );
  } else {
    clocks.push(
      {
        key: 'vs_unit_4star',
        labelKey: 'clocks.vs_unit_4star',
        defaultLabel: 'Unit-Focus 4★ Slot',
        clock: byChar(vs.unitFocusVs4Star)
      },
      {
        key: 'vs_unit_song',
        labelKey: 'clocks.vs_unit_song',
        defaultLabel: 'Unit-Focus Song Vocal',
        clock: byChar(vs.unitFocusVsSong)
      },
      {
        key: 'vs_banner',
        labelKey: 'clocks.vs_banner',
        defaultLabel: 'VS Banner Focus',
        clock: byChar(vs.vsBannerFocus)
      }
    );
  }

  const fesSummary = cards.fes4Star.find((f) => f.characterId === characterId)!;
  clocks.push(
    {
      key: 'any_4star',
      labelKey: 'clocks.any_4star',
      defaultLabel: 'Any 4★ Card',
      clock: byChar(cards.any4Star)
    },
    {
      key: 'lim_4star',
      labelKey: 'clocks.lim_4star',
      defaultLabel: 'Hairstyle Limited 4★',
      clock: byChar(cards.lim4Star)
    },
    {
      key: 'fes_4star',
      labelKey: 'clocks.fes_4star',
      defaultLabel: 'Fes 4★ (ColorFes / BloomFes)',
      clock: fesSummary.clock
    },
    {
      key: 'perm_4star',
      labelKey: 'clocks.perm_4star',
      defaultLabel: 'Permanent 4★',
      clock: byChar(cards.perm4Star)
    },
    ...(characterId <= 20
      ? [
          {
            key: 'mixed_banner',
            labelKey: 'clocks.mixed_banner',
            defaultLabel: 'Mixed Event Banner Lead',
            clock: byChar(mixedAttr.mixedBanner)
          }
        ]
      : []),
    {
      key: 'mixed_lineup',
      labelKey: 'clocks.mixed_lineup',
      defaultLabel: 'Mixed Event Card',
      clock: byChar(mixedAttr.mixedLineupAny)
    },
    {
      key: 'event_3star',
      labelKey: 'clocks.event_3star',
      defaultLabel: 'Event Reward 3★',
      clock: byChar(cards.event3Star)
    },
    {
      key: 'event_2star',
      labelKey: 'clocks.event_2star',
      defaultLabel: 'Event Reward 2★',
      clock: byChar(cards.event2Star)
    },
    {
      key: 'alt_vocal',
      labelKey: 'clocks.alt_vocal',
      defaultLabel: 'Another Vocal Cover',
      clock: byChar(extras.altVocals)
    },
    {
      key: 'stamp',
      labelKey: 'clocks.stamp',
      defaultLabel: 'Illustration Stamp',
      clock: byChar(extras.stamps)
    }
  );

  const past4Stars = snapshot.cards.filter(
    (c) => c.characterId === characterId && c.rarity === 'rarity_4' && c.releaseAt <= now
  );
  const heroCard = past4Stars.at(-1);
  const latestLimCard = past4Stars.findLast((c) =>
    isStandardLim4Star(c, { includeWorldLink: false, includeCollab: true })
  );
  const latestStampId = byChar(extras.stamps).latest?.stampId;

  const eventById = new Map(snapshot.events.map((e) => [e.id, e]));
  const rawTimeline: CharacterDossier['timeline'] = past4Stars.map((card) => ({
    kind: 'card4',
    timestamp: card.releaseAt,
    card,
    event: card.eventId ? eventById.get(card.eventId) : undefined
  }));

  rawTimeline.sort((a, b) => a.timestamp - b.timestamp);
  for (let i = 1; i < rawTimeline.length; i += 1) {
    rawTimeline[i].gapDays = Math.max(
      0,
      Math.round((rawTimeline[i].timestamp - rawTimeline[i - 1].timestamp) / MS_PER_DAY)
    );
  }

  const charIdx = ALL_CHARACTER_IDS.indexOf(characterId as (typeof ALL_CHARACTER_IDS)[number]);
  const vsIdx = VIRTUAL_SINGER_IDS.indexOf(characterId as (typeof VIRTUAL_SINGER_IDS)[number]);

  return {
    character,
    heroCard,
    latestLimCard,
    latestStampId,
    clocks,
    attributes: mixedAttr.attributeMatrix[charIdx] ?? [],
    subUnits: vsIdx >= 0 ? vs.subUnitMatrix[vsIdx] : undefined,
    timeline: rawTimeline.toReversed()
  };
}
