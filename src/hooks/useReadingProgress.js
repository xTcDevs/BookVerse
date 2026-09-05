import { useCallback, useEffect, useState } from 'react';
import { getReadingProgress, saveReadingProgress } from '../lib/storage.js';

export function useReadingProgress(bookId) {
  const [progress, setProgress] = useState(() => getReadingProgress(bookId));

  useEffect(() => {
    setProgress(getReadingProgress(bookId));
  }, [bookId]);

  const updateProgress = useCallback((value) => {
    const next = Math.max(0, Math.min(100, Math.round(value)));
    setProgress(next);
    saveReadingProgress(bookId, next);
  }, [bookId]);

  return { progress, updateProgress };
}
