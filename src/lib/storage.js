const STORAGE_KEYS = {
  library: 'bookverse-library',
  theme: 'bookverse-theme',
  progress: 'bookverse-reading-progress',
};

function readJSON(key, fallback) {
  if (typeof window === 'undefined') return fallback;

  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in private browsing or restricted contexts.
  }
}

export function getLibrary() {
  const library = readJSON(STORAGE_KEYS.library, []);
  return Array.isArray(library) ? library : [];
}

export function saveLibrary(library) {
  writeJSON(STORAGE_KEYS.library, library);
}

export function getTheme() {
  if (typeof window === 'undefined') return 'light';
  return window.localStorage.getItem(STORAGE_KEYS.theme) === 'dark' ? 'dark' : 'light';
}

export function saveTheme(theme) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEYS.theme, theme);
}

export function getReadingProgress(bookId) {
  const progress = readJSON(STORAGE_KEYS.progress, {});
  return typeof progress === 'object' && progress !== null ? progress[bookId] || 0 : 0;
}

export function saveReadingProgress(bookId, value) {
  const progress = readJSON(STORAGE_KEYS.progress, {});
  const next = typeof progress === 'object' && progress !== null ? progress : {};
  next[bookId] = Math.max(0, Math.min(100, Math.round(value)));
  writeJSON(STORAGE_KEYS.progress, next);
}

export { STORAGE_KEYS };
