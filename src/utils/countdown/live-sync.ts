import focusOverridesJson from '../../../data/sekai/focus-overrides.json';
import nicknamesJson from '../../../data/sekai/nicknames.json';
import type { CountdownSnapshot } from '~/types/countdown';
import { MASTER_DB_EN, MASTER_DB_JP } from './constants';
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
} from './normalize';

const IDB_NAME = 'sekai-countdown-db';
const IDB_STORE = 'snapshots';
const IDB_KEY = 'latest-live';
const CHECK_TTL_MS = 30 * 60 * 1000; // 30 minutes
const LAST_CHECK_STORAGE_KEY = 'sekai-countdown:last-version-check';

function openCacheDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.addEventListener('upgradeneeded', () => {
      req.result.createObjectStore(IDB_STORE);
    });
    req.addEventListener('success', () => resolve(req.result));
    req.addEventListener('error', () => reject(req.error));
  });
}

export async function readCachedLiveSnapshot(): Promise<CountdownSnapshot | null> {
  if (typeof indexedDB === 'undefined') return null;
  try {
    const db = await openCacheDb();
    return await new Promise<CountdownSnapshot | null>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.addEventListener('success', () =>
        resolve((req.result as CountdownSnapshot | undefined) ?? null)
      );
      req.addEventListener('error', () => resolve(null));
    });
  } catch {
    return null;
  }
}

async function writeCachedLiveSnapshot(snapshot: CountdownSnapshot): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await openCacheDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(snapshot, IDB_KEY);
      tx.addEventListener('complete', () => resolve());
      tx.addEventListener('error', () => resolve());
    });
  } catch {
    // Ignore storage quota / private-browsing errors
  }
}

async function fetchJson<T>(base: string, table: string): Promise<T> {
  const res = await fetch(`${base}/${table}.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${table}`);
  return (await res.json()) as T;
}

async function fetchOptional<T>(base: string, table: string): Promise<T[]> {
  try {
    return await fetchJson<T[]>(base, table);
  } catch {
    return [];
  }
}

export async function checkRemoteDataVersion(): Promise<string | undefined> {
  const raw = await fetchJson<{ dataVersion?: string } | { dataVersion?: string }[]>(
    MASTER_DB_JP,
    'versions'
  );
  return Array.isArray(raw) ? raw.at(-1)?.dataVersion : raw.dataVersion;
}

export function shouldAutoCheckLive(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    const prev = Number(localStorage.getItem(LAST_CHECK_STORAGE_KEY) || '0');
    return Date.now() - prev > CHECK_TTL_MS;
  } catch {
    return false;
  }
}

export function markLiveCheckedNow(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LAST_CHECK_STORAGE_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export async function fetchAndBuildLiveSnapshot(knownVersion?: string): Promise<CountdownSnapshot> {
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
    fetchOptional<{ id: number; name?: string }>(MASTER_DB_EN, 'events'),
    fetchOptional<{ id: number; prefix?: string }>(MASTER_DB_EN, 'cards'),
    fetchOptional<{ id: number; title?: string }>(MASTER_DB_EN, 'musics'),
    fetchOptional<RawGameCharacter>(MASTER_DB_EN, 'gameCharacters')
  ]);

  const numericOverrides: Record<string, number> = {};
  for (const [k, v] of Object.entries(focusOverridesJson)) {
    if (/^\d+$/.test(k) && typeof v === 'number') {
      numericOverrides[k] = v;
    }
  }

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
    focusOverrides: numericOverrides,
    nicknames: nicknamesJson as Record<string, string>,
    dataVersion: knownVersion,
    generatedAt: Date.now()
  });

  await writeCachedLiveSnapshot(snapshot);
  markLiveCheckedNow();
  return snapshot;
}
