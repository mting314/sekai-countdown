import { describe, expect, it } from 'vitest';
import snapshotJson from '../../../data/sekai/snapshot.json';
import type { CountdownSnapshot } from '~/types/countdown';
import { MS_PER_DAY } from './constants';
import {
  buildDroughtClock,
  computeCardMetrics,
  computeCharacterDossier,
  computeExtrasMetrics,
  computeFocusMetrics,
  computeMixedAndAttributeMetrics,
  computeVirtualSingerMetrics
} from './metrics';
import { normalizeMasterTables } from './normalize';

const snapshot = snapshotJson as unknown as CountdownSnapshot;
const TEST_NOW = Date.parse('2026-10-29T00:00:00Z');

describe('Sekai master DB normalization invariants', () => {
  it('loads all 26 characters in canonical order', () => {
    expect(snapshot.characters).toHaveLength(26);
    expect(snapshot.characters[0].id).toBe(1);
    expect(snapshot.characters[19].abbrev).toBe('mizu');
    expect(snapshot.characters[20].unit).toBe('virtual_singer');
  });

  it('applies focus override on Event #97 (Light Up the Fire -> An #10)', () => {
    const ev97 = snapshot.events.find((e) => e.id === 97);
    expect(ev97).toBeDefined();
    expect(ev97?.isSoloFocus).toBe(true);
    expect(ev97?.focusCharacterId).toBe(10);
  });

  it('excludes 0-card recap events (Memories) and world_bloom from solo focus', () => {
    for (const ev of snapshot.events) {
      if (ev.eventType === 'world_bloom' || ev.cardIds.length === 0) {
        expect(ev.isSoloFocus).toBe(false);
      }
    }
  });

  it('does not re-attach older World Link cards as new debuts on Finale Event #218', () => {
    const ev218 = snapshot.events.find((e) => e.id === 218);
    if (ev218) {
      expect(ev218.cardIds).toHaveLength(0);
    }
  });

  it('excludes 2099 sentinel timestamps when normalizing raw tables', () => {
    const res = normalizeMasterTables({
      events: [],
      eventStories: [],
      eventStoryUnits: [],
      eventCards: [],
      eventMusics: [],
      cards: [
        {
          id: 1,
          characterId: 1,
          cardRarityType: 'rarity_4',
          attr: 'cool',
          assetbundleName: 'res001_no001',
          releaseAt: 4102412399000,
          cardSupplyId: 1
        }
      ],
      gameCharacters: [{ id: 1, firstName: '星乃', givenName: '一歌' }],
      gameCharacterUnits: [],
      musics: [],
      musicTags: [],
      musicVocals: [],
      musicCategories: [],
      stamps: [
        {
          id: 99,
          stampType: 'illustration',
          characterId1: 1,
          archivePublishedAt: 4102412399000
        }
      ]
    });
    expect(res.cards).toHaveLength(0);
    expect(res.stamps).toHaveLength(0);
  });
});

describe('Countdown & rotation metrics engine', () => {
  it('computes solo focus counts, waiting members, and rotation cells for all 5 main units', () => {
    const focus = computeFocusMetrics(snapshot, TEST_NOW);
    expect(focus.characterFocus).toHaveLength(20);
    expect(focus.unitFocus).toHaveLength(5);

    for (const unit of [
      'leo_need',
      'more_more_jump',
      'vivid_bad_squad',
      'wonderlands_showtime',
      'nightcord'
    ] as const) {
      const rot = focus.rotationByUnit[unit];
      expect(rot.rows).toHaveLength(4);
      expect(rot.maxCycle).toBeGreaterThanOrEqual(6);
    }
  });

  it('separates Hairstyle Limited 4★ from World Link 4★ when includeWorldLink is toggled', () => {
    const withoutWl = computeCardMetrics(snapshot, TEST_NOW, {
      includeWorldLink: false,
      includeCollab: true
    });
    const withWl = computeCardMetrics(snapshot, TEST_NOW, {
      includeWorldLink: true,
      includeCollab: true
    });

    const totalWithout = withoutWl.lim4Star.reduce((s, c) => s + c.count, 0);
    const totalWith = withWl.lim4Star.reduce((s, c) => s + c.count, 0);
    expect(totalWith).toBeGreaterThan(totalWithout);
  });

  it('builds a 6x5 SEKAI Virtual Singer sub-unit matrix and 26x5 attribute matrix', () => {
    const vs = computeVirtualSingerMetrics(snapshot, TEST_NOW);
    expect(vs.subUnitMatrix).toHaveLength(6);
    expect(vs.subUnitMatrix[0]).toHaveLength(5);

    const mixedAttr = computeMixedAndAttributeMetrics(snapshot, TEST_NOW);
    expect(mixedAttr.mixedBanner).toHaveLength(20);
    expect(mixedAttr.attributeMatrix).toHaveLength(26);
    expect(mixedAttr.attributeMatrix[0]).toHaveLength(5);
  });

  it('computes Another Vocal, Stamp, Co-Banner Duo, and Character Dossier views cleanly', () => {
    const extras = computeExtrasMetrics(snapshot, TEST_NOW);
    expect(extras.altVocals).toHaveLength(26);
    expect(extras.stamps).toHaveLength(26);
    expect(extras.duoPairingsForCharacter(20)).toHaveLength(25);

    const mizuDossier = computeCharacterDossier(snapshot, 20, TEST_NOW);
    expect(mizuDossier?.character.abbrev).toBe('mizu');
    expect(mizuDossier?.timeline.length).toBeGreaterThan(10);

    const mikuDossier = computeCharacterDossier(snapshot, 21, TEST_NOW);
    expect(mikuDossier?.subUnits).toHaveLength(5);
  });

  it('flags record waits when daysSince exceeds historical maxGapDays', () => {
    const t0 = Date.parse('2024-01-01T00:00:00Z');
    const clock = buildDroughtClock({
      entityId: 1,
      occurrences: [
        { timestamp: t0, labelJa: 'A' },
        { timestamp: t0 + 100 * MS_PER_DAY, labelJa: 'B' },
        { timestamp: t0 + 220 * MS_PER_DAY, labelJa: 'C' }
      ],
      now: t0 + 400 * MS_PER_DAY
    });
    expect(clock.maxGapDays).toBe(120);
    expect(clock.daysSince).toBe(180);
    expect(clock.isRecordWait).toBe(true);
    expect(clock.severity).toBe('record');
  });
});
