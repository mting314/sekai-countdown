import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import bakedSnapshotJson from '../../data/sekai/snapshot.json';
import type {
  CompactAnotherVocal,
  CompactCard,
  CompactEvent,
  CompactMusic,
  CompactStamp,
  CountdownCharacter,
  CountdownSnapshot
} from '~/types/countdown';
import {
  checkRemoteDataVersion,
  fetchAndBuildLiveSnapshot,
  markLiveCheckedNow,
  readCachedLiveSnapshot,
  shouldAutoCheckLive
} from '~/utils/countdown/live-sync';

export type LiveSyncStatus = 'baked' | 'checking' | 'syncing' | 'live' | 'error';

interface CountdownDataContextValue {
  snapshot: CountdownSnapshot;
  now: number;
  preferTrained: boolean;
  setPreferTrained: (next: boolean) => void;
  syncStatus: LiveSyncStatus;
  syncLiveNow: () => Promise<void>;
  charById: Map<number, CountdownCharacter>;
  cardById: Map<number, CompactCard>;
  eventById: Map<number, CompactEvent>;
  musicById: Map<number, CompactMusic>;
  anotherVocalsByMusicId: Map<number, CompactAnotherVocal[]>;
  eventBySongId: Map<number, CompactEvent>;
  stampById: Map<number, CompactStamp>;
}

const bakedSnapshot = bakedSnapshotJson as unknown as CountdownSnapshot;
const ART_PREF_KEY = 'sekai-countdown:prefer-trained';

const CountdownDataContext = createContext<CountdownDataContextValue | null>(null);

export function CountdownDataProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<CountdownSnapshot>(bakedSnapshot);
  // Start with bakedSnapshot.generatedAt during SSR so hydration matches cleanly, then tick to Date.now() on mount.
  const [now, setNow] = useState<number>(() => bakedSnapshot.generatedAt);
  const [preferTrained, setPreferTrainedState] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<LiveSyncStatus>('baked');

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(ART_PREF_KEY);
      if (saved === 'false') setPreferTrainedState(false);
    } catch {
      // ignore
    }
  }, []);

  const setPreferTrained = useCallback((next: boolean) => {
    setPreferTrainedState(next);
    try {
      localStorage.setItem(ART_PREF_KEY, String(next));
    } catch {
      // ignore
    }
  }, []);

  const syncLiveNow = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const remoteVer = await checkRemoteDataVersion().catch(() => undefined);
      const fresh = await fetchAndBuildLiveSnapshot(remoteVer);
      setSnapshot(fresh);
      setNow(Date.now());
      setSyncStatus('live');
    } catch {
      setSyncStatus('error');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const cached = await readCachedLiveSnapshot();
      let current = bakedSnapshot;
      if (
        cached &&
        cached.generatedAt > bakedSnapshot.generatedAt &&
        cached.events.length >= bakedSnapshot.events.length
      ) {
        current = cached;
        if (!cancelled) {
          setSnapshot(cached);
          setSyncStatus('live');
        }
      }

      if (!shouldAutoCheckLive()) return;
      if (!cancelled) setSyncStatus('checking');
      try {
        const remoteVersion = await checkRemoteDataVersion();
        markLiveCheckedNow();
        if (cancelled) return;
        if (remoteVersion && remoteVersion !== current.dataVersion) {
          setSyncStatus('syncing');
          const fresh = await fetchAndBuildLiveSnapshot(remoteVersion);
          if (!cancelled) {
            setSnapshot(fresh);
            setSyncStatus('live');
          }
        } else {
          setSyncStatus('live');
        }
      } catch {
        if (!cancelled) {
          setSyncStatus(current === bakedSnapshot ? 'baked' : 'live');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const lookups = useMemo(() => {
    const anotherVocalsByMusicId = new Map<number, CompactAnotherVocal[]>();
    for (const av of snapshot.anotherVocals) {
      const list = anotherVocalsByMusicId.get(av.musicId) ?? [];
      list.push(av);
      anotherVocalsByMusicId.set(av.musicId, list);
    }

    const eventBySongId = new Map<number, CompactEvent>();
    for (const ev of snapshot.events) {
      if (ev.songId) {
        eventBySongId.set(ev.songId, ev);
      }
    }

    return {
      charById: new Map(snapshot.characters.map((c) => [c.id, c])),
      cardById: new Map(snapshot.cards.map((c) => [c.id, c])),
      eventById: new Map(snapshot.events.map((e) => [e.id, e])),
      musicById: new Map(snapshot.musics.map((m) => [m.id, m])),
      anotherVocalsByMusicId,
      eventBySongId,
      stampById: new Map(snapshot.stamps.map((s) => [s.id, s]))
    };
  }, [snapshot]);

  const value = useMemo<CountdownDataContextValue>(
    () => ({
      snapshot,
      now,
      preferTrained,
      setPreferTrained,
      syncStatus,
      syncLiveNow,
      ...lookups
    }),
    [snapshot, now, preferTrained, setPreferTrained, syncStatus, syncLiveNow, lookups]
  );

  return <CountdownDataContext.Provider value={value}>{children}</CountdownDataContext.Provider>;
}

export function useCountdownData(): CountdownDataContextValue {
  const ctx = useContext(CountdownDataContext);
  if (!ctx) {
    throw new Error('useCountdownData must be used inside CountdownDataProvider');
  }
  return ctx;
}
