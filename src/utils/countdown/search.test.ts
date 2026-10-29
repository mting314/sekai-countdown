import { describe, expect, it } from 'vitest';
import snapshotJson from '../../../data/sekai/snapshot.json';
import type { CountdownSnapshot } from '~/types/countdown';
import { computeFocusMetrics } from './metrics';
import {
  buildGlobalSearchIndex,
  matchesClockQuery,
  queryGlobalSearch,
  type ClockFilterLookups
} from './search';

const snapshot = snapshotJson as unknown as CountdownSnapshot;
const TEST_NOW = Date.parse('2026-10-29T00:00:00Z');

describe('Global omni-search & inline filter search', () => {
  const index = buildGlobalSearchIndex(snapshot, TEST_NOW);

  it('indexes all 26 characters, >400 countdown clocks, events, 4★/BD cards, and songs', () => {
    expect(index.characters).toHaveLength(26);
    expect(index.clocks.length).toBeGreaterThan(400);
    expect(index.events.length).toBeGreaterThan(200);
    expect(index.cards.length).toBeGreaterThan(400);
    expect(index.songs.length).toBeGreaterThan(600);
  });

  it('prioritizes exact fan event nickname matches like "mizu5" at #1 in flat results', () => {
    const res = queryGlobalSearch(index, 'mizu5');
    expect(res.events.length).toBeGreaterThan(0);
    expect(res.events[0].event.nickname).toBe('mizu5');
    expect(res.flat[0].kind).toBe('event');
    if (res.flat[0].kind === 'event') {
      expect(res.flat[0].event.id).toBe(145);
    }
  });

  it('finds multi-token character + clock queries across Hakolim, SEKAI VS sub-units, Fes, and attributes', () => {
    const hakolim = queryGlobalSearch(index, 'mizuki hakolim');
    expect(hakolim.clocks.length).toBeGreaterThan(0);
    expect(hakolim.clocks[0].character.id).toBe(20);
    expect(hakolim.clocks[0].categoryEn).toContain('Hakolim');

    const rinMmj = queryGlobalSearch(index, 'rin mmj');
    expect(rinMmj.clocks.some((c) => c.character.id === 22 && c.subUnit === 'more_more_jump')).toBe(
      true
    );

    const akitoHappy = queryGlobalSearch(index, 'akito happy');
    expect(akitoHappy.clocks.some((c) => c.character.id === 11 && c.attr === 'happy')).toBe(true);

    const airiBloomfes = queryGlobalSearch(index, 'airi bloomfes');
    expect(airiBloomfes.clocks.some((c) => c.character.id === 7)).toBe(true);
  });

  it('supports Japanese queries across kanji names, unit nicknames, and clock categories', () => {
    const mizuJa = queryGlobalSearch(index, '暁山');
    expect(mizuJa.characters[0]?.character.id).toBe(20);

    const niigoJa = queryGlobalSearch(index, 'ニーゴ');
    expect(niigoJa.characters).toHaveLength(4);

    const altVocalJa = queryGlobalSearch(index, 'アナボ', 'clock');
    expect(altVocalJa.clocks.length).toBeGreaterThan(0);
  });

  it('filters leaderboard clocks via matchesClockQuery by character, unit alias, nickname, and record tag', () => {
    const lookups: ClockFilterLookups = {
      charById: new Map(snapshot.characters.map((c) => [c.id, c])),
      cardById: new Map(snapshot.cards.map((c) => [c.id, c])),
      eventById: new Map(snapshot.events.map((e) => [e.id, e])),
      musicById: new Map(snapshot.musics.map((m) => [m.id, m])),
      stampById: new Map(snapshot.stamps.map((s) => [s.id, s]))
    };

    const focus = computeFocusMetrics(snapshot, TEST_NOW);
    const n25Matches = focus.characterFocus.filter((c) => matchesClockQuery('n25', c, lookups));
    expect(n25Matches).toHaveLength(4);

    const mizuMatches = focus.characterFocus.filter((c) => matchesClockQuery('mizuki', c, lookups));
    expect(mizuMatches).toHaveLength(1);
    expect(mizuMatches[0].characterId).toBe(20);

    const recordMatches = focus.characterHakolim.filter((c) =>
      matchesClockQuery('new record', c, lookups)
    );
    expect(recordMatches.length).toBeGreaterThan(0);
    expect(recordMatches.every((c) => c.isRecordWait)).toBe(true);
  });
});
