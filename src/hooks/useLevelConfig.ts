/**
 * useLevelConfig
 *
 * Loads level configuration from Firestore `level_config` collection.
 * Falls back to the hardcoded LEVELS_DATA if Firestore returns nothing or
 * the read fails.  On first load, seeds Firestore from the hardcoded data
 * so the admin can start customizing immediately.
 */

import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LEVELS_DATA, type LevelData } from '@/utils/levelSystem';

export interface LevelConfigEntry extends LevelData {
  docId: string; // Firestore doc ID (e.g. "level_0")
}

interface UseLevelConfigResult {
  levels: LevelConfigEntry[];
  loading: boolean;
  save: (entries: LevelConfigEntry[]) => Promise<void>;
  refresh: () => void;
}

export function useLevelConfig(): UseLevelConfigResult {
  const [levels, setLevels] = useState<LevelConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'level_config'));

      if (snap.empty) {
        // Seed Firestore with the hardcoded defaults
        const seeds = LEVELS_DATA.map((l) => ({ ...l, docId: `level_${l.index}` }));
        await Promise.all(
          seeds.map((entry) =>
            setDoc(doc(db, 'level_config', entry.docId), {
              name: entry.name,
              index: entry.index,
              cumulativePointsRequired: entry.cumulativePointsRequired,
              dailyPointsForPrivileges: entry.dailyPointsForPrivileges,
            })
          )
        );
        setLevels(seeds);
      } else {
        const loaded: LevelConfigEntry[] = snap.docs
          .map((d) => ({ docId: d.id, ...(d.data() as LevelData) }))
          .sort((a, b) => a.index - b.index);
        setLevels(loaded);
      }
    } catch {
      // Network failure — fall back to hardcoded data without seeding
      setLevels(LEVELS_DATA.map((l) => ({ ...l, docId: `level_${l.index}` })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (entries: LevelConfigEntry[]) => {
    const results = await Promise.allSettled(
      entries.map((entry) =>
        setDoc(doc(db, 'level_config', entry.docId), {
          name: entry.name,
          index: entry.index,
          cumulativePointsRequired: entry.cumulativePointsRequired,
          dailyPointsForPrivileges: entry.dailyPointsForPrivileges,
        })
      )
    );
    const successfulEntries = entries.filter((_, index) => results[index]?.status === 'fulfilled');
    const failedWrites = results.filter((result) => result.status === 'rejected');
    if (failedWrites.length > 0) {
      console.error('Failed to save one or more level configuration entries:', failedWrites);
    }
    if (successfulEntries.length > 0) {
      setLevels([...successfulEntries]);
    }
  }, []);

  return { levels, loading, save, refresh: load };
}
