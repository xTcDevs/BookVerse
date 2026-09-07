import { useCallback, useEffect, useState } from 'react';
import { getReadingProgress, saveReadingProgress } from '../lib/storage.js';

export function useReadingProgress(bookId) {
  const [progress, setProgress] = useState(() => getReadingProgress(bookId));

  useEffect(() => {
    const sync = (event) => {
      if (event.detail?.bookId === bookId) setProgress(event.detail.value);
    };
    const syncFromStorage = (event) => {
      if (event.key === 'bookverse-reading-progress') setProgress(getReadingProgress(bookId));
    };
    setProgress(getReadingProgress(bookId));
    window.addEventListener('bookverse:progress', sync);
    window.addEventListener('storage', syncFromStorage);
    return () => {
      window.removeEventListener('bookverse:progress', sync);
      window.removeEventListener('storage', syncFromStorage);
    };
  }, [bookId]);

  const updateProgress = useCallback((value) => {
    const next = Math.max(0, Math.min(100, Math.round(value)));
    setProgress(next);
    saveReadingProgress(bookId, next);
  }, [bookId]);

  return { progress, updateProgress };
}
