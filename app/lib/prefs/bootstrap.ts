import { accentIds, themeIds, themes } from '~/design/tokens';
import { storageKey } from './store';

interface BootstrapConfig {
  key: string;
  themes: readonly string[];
  accents: readonly string[];
  backgrounds: Record<string, string>;
}

// Runs inline in <head> before the first paint, so the saved theme is applied
// before anything is drawn (no flash of the wrong theme). It must stay
// self-contained: no imports, no closures. Mirrors applyAppearance().
function bootstrap(config: BootstrapConfig): void {
  const root = document.documentElement;
  let saved: Record<string, unknown> = {};
  try {
    const raw = window.localStorage.getItem(config.key);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed.data === 'object' && parsed.data) saved = parsed.data;
  } catch {
    // Storage unavailable: defaults apply.
  }
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const choice = typeof saved.theme === 'string' ? saved.theme : 'system';
  const theme = config.themes.indexOf(choice) >= 0 ? choice : dark ? 'dark' : 'paper';
  const accent =
    typeof saved.accent === 'string' && config.accents.indexOf(saved.accent) >= 0 ? saved.accent : 'terracotta';
  const motion = saved.motion === 'reduced' || saved.motion === 'full' ? saved.motion : reduce ? 'reduced' : 'full';
  const density = saved.density === 'compact' ? 'compact' : 'comfortable';
  const scale =
    typeof saved.textScale === 'number' && saved.textScale >= 90 && saved.textScale <= 130 ? saved.textScale : 100;
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-accent', accent);
  root.setAttribute('data-motion', motion);
  root.setAttribute('data-density', density);
  root.style.setProperty('--bv-text-scale', String(scale / 100));
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && config.backgrounds[theme]) meta.setAttribute('content', config.backgrounds[theme]);
}

export function themeBootstrapScript(): string {
  const config: BootstrapConfig = {
    key: storageKey('appearance'),
    themes: themeIds,
    accents: accentIds,
    backgrounds: Object.fromEntries(themeIds.map((id) => [id, themes[id].bg])),
  };
  return `(${bootstrap.toString()})(${JSON.stringify(config)});`;
}
