import { describe, expect, it } from 'vitest';
import snapshot from '../../../data/sekai/snapshot.json';
import type { CountdownSnapshot } from '~/types/countdown';
import { resolveUnitId } from '~/components/views/UnitDossierView';
import { computeCardDossier, computeEventDossier } from './drought-break';

const typedSnapshot = snapshot as unknown as CountdownSnapshot;
const FIXED_NOW = 1730000000000; // Late 2024 timestamp

describe('drought-break analytics engine', () => {
  describe('computeCardDossier', () => {
    it('returns null for nonexistent card', () => {
      const res = computeCardDossier(typedSnapshot, 999999, FIXED_NOW);
      expect(res).toBeNull();
    });

    it('computes broken droughts for a valid 4★ card', () => {
      // Find a known 4★ card in snapshot
      const sample4Star = typedSnapshot.cards.find(
        (c) => c.rarity === 'rarity_4' && c.eventId !== undefined
      );
      expect(sample4Star).toBeDefined();
      if (!sample4Star) return;

      const res = computeCardDossier(typedSnapshot, sample4Star.id, FIXED_NOW);
      expect(res).not.toBeNull();
      expect(res?.card.id).toBe(sample4Star.id);
      expect(res?.character.id).toBe(sample4Star.characterId);
      expect(res?.brokenDroughts.length).toBeGreaterThan(0);

      const any4Break = res?.brokenDroughts.find((b) => b.key === 'any_4star');
      expect(any4Break).toBeDefined();
      expect(any4Break?.daysBroken).toBeGreaterThanOrEqual(0);
      expect(any4Break?.ordinal).toBeGreaterThanOrEqual(1);
    });

    it('marks 1st debut cards with isFirstEver and days since launch', () => {
      // Find the first 4★ card for character 1 (Ichika)
      const firstIchika4 = typedSnapshot.cards
        .filter((c) => c.characterId === 1 && c.rarity === 'rarity_4')
        .toSorted((a, b) => a.releaseAt - b.releaseAt)[0];
      expect(firstIchika4).toBeDefined();

      const res = computeCardDossier(typedSnapshot, firstIchika4.id, FIXED_NOW);
      expect(res).not.toBeNull();
      const any4Break = res?.brokenDroughts.find((b) => b.key === 'any_4star');
      expect(any4Break?.isFirstEver).toBe(true);
      expect(any4Break?.ordinal).toBe(1);
    });
  });

  describe('computeEventDossier', () => {
    it('returns null for nonexistent event', () => {
      const res = computeEventDossier(typedSnapshot, 999999, FIXED_NOW);
      expect(res).toBeNull();
    });

    it('computes event dossier and rotation status for mizu5 (Event #145)', () => {
      const res = computeEventDossier(typedSnapshot, 145, FIXED_NOW);
      expect(res).not.toBeNull();
      expect(res?.event.id).toBe(145);
      expect(res?.event.nickname).toBe('mizu5');
      expect(res?.focusCharacter?.id).toBe(20); // Mizuki
      expect(res?.rotationContext?.cycle).toBe(5);
      expect(res?.rotationContext?.waitingAfterEventIds).toContain(17); // Kanade
      expect(res?.rotationContext?.waitingAfterEventIds).toContain(19); // Ena
      expect(res?.eventBreaks.length).toBeGreaterThan(0);
      expect(res?.lineupCards.length).toBeGreaterThan(0);
    });

    it('detects cycle jump on saki6 (Event #147)', () => {
      const res = computeEventDossier(typedSnapshot, 147, FIXED_NOW);
      expect(res).not.toBeNull();
      expect(res?.event.nickname).toBe('saki6');
      expect(res?.rotationContext?.cycle).toBe(6);
      expect(res?.rotationContext?.isCycleJump).toBe(true);
      expect(res?.rotationContext?.cycleSkippedIds).toContain(3); // Honami
      expect(res?.rotationContext?.cycleSkippedIds).toContain(4); // Shiho
    });

    it('computes Co-4★ duo pairing breaks on multi-4★ banner events', () => {
      // Find a solo focus event with multiple 4★ cards
      const multi4Event = typedSnapshot.events.find((e) => e.isSoloFocus && e.cardIds.length >= 3);
      expect(multi4Event).toBeDefined();
      if (!multi4Event) return;

      const res = computeEventDossier(typedSnapshot, multi4Event.id, FIXED_NOW);
      expect(res).not.toBeNull();
      expect(res?.duoBreaks.length).toBeGreaterThan(0);
      expect(res?.duoBreaks[0].daysBroken).toBeGreaterThanOrEqual(0);
    });
  });

  describe('resolveUnitId', () => {
    it('resolves short codes and full names to correct SekaiUnitId', () => {
      expect(resolveUnitId('n25')).toBe('nightcord');
      expect(resolveUnitId('school_refusal')).toBe('nightcord');
      expect(resolveUnitId('nightcord')).toBe('nightcord');
      expect(resolveUnitId('ln')).toBe('leo_need');
      expect(resolveUnitId('light_sound')).toBe('leo_need');
      expect(resolveUnitId('leo_need')).toBe('leo_need');
      expect(resolveUnitId('mmj')).toBe('more_more_jump');
      expect(resolveUnitId('idol')).toBe('more_more_jump');
      expect(resolveUnitId('more_more_jump')).toBe('more_more_jump');
      expect(resolveUnitId('vbs')).toBe('vivid_bad_squad');
      expect(resolveUnitId('street')).toBe('vivid_bad_squad');
      expect(resolveUnitId('vivid_bad_squad')).toBe('vivid_bad_squad');
      expect(resolveUnitId('wxs')).toBe('wonderlands_showtime');
      expect(resolveUnitId('theme_park')).toBe('wonderlands_showtime');
      expect(resolveUnitId('wonderlands_showtime')).toBe('wonderlands_showtime');
      expect(resolveUnitId('レオニ')).toBe('leo_need');
      expect(resolveUnitId('モモジャン')).toBe('more_more_jump');
      expect(resolveUnitId('ビビバス')).toBe('vivid_bad_squad');
      expect(resolveUnitId('ワンダショ')).toBe('wonderlands_showtime');
      expect(resolveUnitId('ニーゴ')).toBe('nightcord');
      expect(resolveUnitId('バチャシン')).toBe('virtual_singer');
      expect(resolveUnitId('vs')).toBe('virtual_singer');
      expect(resolveUnitId('virtual_singer')).toBe('virtual_singer');
      expect(resolveUnitId('unknown_unit')).toBeUndefined();
    });
  });
});
