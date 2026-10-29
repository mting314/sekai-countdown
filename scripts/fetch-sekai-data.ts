/**
 * Fetches Sekai-World JP + EN master DB tables and writes the compact snapshot to
 * data/sekai/snapshot.json.
 *
 *   bun scripts/fetch-sekai-data.ts
 */
import fs from 'node:fs';
import { MASTER_DB_EN, MASTER_DB_JP } from '../src/utils/countdown/constants';
import {
  normalizeMasterTables,
  type RawCard,
  type RawEvent,
  type RawEventCard,
  type RawEventMusic,
  type RawEventStory,
  type RawEventStoryUnit,
  type RawGameCharacter,
  type RawGameCharacterUnit,
  type RawMusic,
  type RawMusicCategory,
  type RawMusicTag,
  type RawMusicVocal,
  type RawStamp
} from '../src/utils/countdown/normalize';

async function fetchJson<T>(base: string, table: string): Promise<T> {
  const url = `${base}/${table}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return (await res.json()) as T;
}

async function fetchOptional<T>(base: string, table: string): Promise<T[]> {
  try {
    return await fetchJson<T[]>(base, table);
  } catch {
    return [];
  }
}

const focusOverrides = JSON.parse(
  fs.readFileSync('data/sekai/focus-overrides.json', 'utf-8')
) as Record<string, number>;
const nicknames = JSON.parse(fs.readFileSync('data/sekai/nicknames.json', 'utf-8')) as Record<
  string,
  string
>;

const [
  events,
  eventStories,
  eventStoryUnits,
  eventCards,
  eventMusics,
  cards,
  gameCharacters,
  gameCharacterUnits,
  musics,
  musicTags,
  musicVocals,
  musicCategories,
  stamps,
  versions,
  eventsEn,
  cardsEn,
  musicsEn,
  gameCharactersEn
] = await Promise.all([
  fetchJson<RawEvent[]>(MASTER_DB_JP, 'events'),
  fetchJson<RawEventStory[]>(MASTER_DB_JP, 'eventStories'),
  fetchJson<RawEventStoryUnit[]>(MASTER_DB_JP, 'eventStoryUnits'),
  fetchJson<RawEventCard[]>(MASTER_DB_JP, 'eventCards'),
  fetchJson<RawEventMusic[]>(MASTER_DB_JP, 'eventMusics'),
  fetchJson<RawCard[]>(MASTER_DB_JP, 'cards'),
  fetchJson<RawGameCharacter[]>(MASTER_DB_JP, 'gameCharacters'),
  fetchJson<RawGameCharacterUnit[]>(MASTER_DB_JP, 'gameCharacterUnits'),
  fetchJson<RawMusic[]>(MASTER_DB_JP, 'musics'),
  fetchJson<RawMusicTag[]>(MASTER_DB_JP, 'musicTags'),
  fetchJson<RawMusicVocal[]>(MASTER_DB_JP, 'musicVocals'),
  fetchJson<RawMusicCategory[]>(MASTER_DB_JP, 'musicCategories'),
  fetchJson<RawStamp[]>(MASTER_DB_JP, 'stamps'),
  fetchJson<{ dataVersion?: string } | { dataVersion?: string }[]>(MASTER_DB_JP, 'versions').catch(
    (): { dataVersion?: string } => ({})
  ),
  fetchOptional<{ id: number; name?: string }>(MASTER_DB_EN, 'events'),
  fetchOptional<{ id: number; prefix?: string }>(MASTER_DB_EN, 'cards'),
  fetchOptional<{ id: number; title?: string }>(MASTER_DB_EN, 'musics'),
  fetchOptional<RawGameCharacter>(MASTER_DB_EN, 'gameCharacters')
]);

const latestVersion = Array.isArray(versions) ? versions.at(-1)?.dataVersion : versions.dataVersion;

const snapshot = normalizeMasterTables({
  events,
  eventStories,
  eventStoryUnits,
  eventCards,
  eventMusics,
  cards,
  gameCharacters,
  gameCharacterUnits,
  musics,
  musicTags,
  musicVocals,
  musicCategories,
  stamps,
  eventsEn,
  cardsEn,
  musicsEn,
  gameCharactersEn,
  focusOverrides,
  nicknames,
  dataVersion: latestVersion,
  generatedAt: Date.now()
});

fs.mkdirSync('data/sekai', { recursive: true });
const serialized = JSON.stringify(snapshot);
fs.writeFileSync('data/sekai/snapshot.json', serialized);

const soloCount = snapshot.events.filter((e) => e.isSoloFocus).length;
const hakolimCount = snapshot.events.filter((e) => e.isHakolim).length;
const mixedCount = snapshot.events.filter((e) => e.isMixedEvent).length;
const vsFocusCount = snapshot.events.filter((e) => e.isVsFocusEvent).length;

console.log(
  `Wrote data/sekai/snapshot.json (${(serialized.length / 1024).toFixed(1)} KB): ` +
    `${snapshot.events.length} events (${soloCount} solo focus, ${hakolimCount} hakolim, ${mixedCount} mixed, ${vsFocusCount} VS focus), ` +
    `${snapshot.cards.length} cards, ${snapshot.musics.length} songs, ${snapshot.anotherVocals.length} alt vocals, ${snapshot.stamps.length} stamps.`
);
