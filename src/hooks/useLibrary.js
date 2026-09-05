import { useCallback, useState } from 'react';
import { getLibrary, saveLibrary } from '../lib/storage.js';

export function useLibrary() {
  const [library, setLibrary] = useState(() => getLibrary());

  const toggle = useCallback((bookId) => {
    setLibrary((current) => {
      const next = current.includes(bookId)
        ? current.filter((id) => id !== bookId)
        : [...current, bookId];
      saveLibrary(next);
      return next;
    });
  }, []);

  const remove = useCallback((bookId) => {
    setLibrary((current) => {
      const next = current.filter((id) => id !== bookId);
      saveLibrary(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    saveLibrary([]);
    setLibrary([]);
  }, []);

  return {
    library,
    savedCount: library.length,
    isSaved: (bookId) => library.includes(bookId),
    toggle,
    remove,
    clear,
  };
}
