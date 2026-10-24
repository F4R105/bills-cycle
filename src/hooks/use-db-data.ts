import { useFocusEffect } from 'expo-router';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';

/** Loads data from SQLite whenever the screen gains focus (e.g. after a modal closes). */
export function useDbData<T>(load: (db: SQLiteDatabase) => Promise<T>) {
  const db = useSQLiteContext();
  const [data, setData] = useState<T | null>(null);

  // Always call the latest `load` without making `refresh` change identity every render.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  const refresh = useCallback(async () => {
    setData(await loadRef.current(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return { data, refresh, db };
}
