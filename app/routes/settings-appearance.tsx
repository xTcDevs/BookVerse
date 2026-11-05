import type { CSSProperties } from 'react';
import type { Route } from './+types/settings-appearance';
import { ChipToggles, RangeField, Segmented } from '~/components/controls';
import { accentIds, accents, resolveAccent, themeIds, themes, type ThemeChoice, type ThemeId } from '~/design/tokens';
import { formatList, type FormatSlug } from '~/data/formats';
import { topLevelGenres } from '~/data/genres';
import { resolveTheme } from '~/lib/prefs/apply';
import { usePrefs } from '~/lib/prefs/hooks';
import { buildMeta } from '~/lib/seo';
import { useMediaQuery } from '~/lib/use-media';
import { SyncLine } from './settings';

export const meta: Route.MetaFunction = () =>
  buildMeta({
    title: 'Appearance',
    description: 'Choose how BookVerse looks.',
    path: '/settings/appearance',
    noindex: true,
  });

function optionStyle(id: ThemeId, accentId: (typeof accentIds)[number]): CSSProperties {
  const t = themes[id];
  return {
    '--opt-bg': t.bg,
    '--opt-text': t.text,
    '--opt-muted': t.muted,
    '--opt-accent': resolveAccent(id, accentId).accent,
  } as CSSProperties;
}

function ThemeOption({
  id,
  label,
  description,
  checked,
  style,
  onSelect,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  style: CSSProperties;
  onSelect: () => void;
}) {
  return (
    <label className="theme-option" style={style}>
      <input type="radio" name="theme" value={id} checked={checked} onChange={onSelect} />
      <span className="theme-option__sample" aria-hidden="true">
        <span className="theme-option__cover" />
        <span className="theme-option__lines">
          <i />
          <i />
          <i />
        </span>
      </span>
      <span className="theme-option__name">{label}</span>
      <span className="theme-option__desc">{description}</span>
    </label>
  );
}

export default function AppearanceSettings() {
  const [appearance, appearanceApi] = usePrefs('appearance');
  const [browse, browseApi] = usePrefs('browse');
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const activeTheme = resolveTheme(appearance.theme, prefersDark);
  const setTheme = (theme: ThemeChoice) => appearanceApi.update({ theme });

  return (
    <>
      <fieldset className="settings-group">
        <legend>Theme</legend>
        <div className="theme-grid">
          <ThemeOption
            id="system"
            label="Match my device"
            description={`Paper by day, Dark at night. Now: ${themes[resolveTheme('system', prefersDark)].label}.`}
            checked={appearance.theme === 'system'}
            style={optionStyle(resolveTheme('system', prefersDark), appearance.accent)}
            onSelect={() => setTheme('system')}
          />
          {themeIds.map((id) => (
            <ThemeOption
              key={id}
              id={id}
              label={themes[id].label}
              description={themes[id].description}
              checked={appearance.theme === id}
              style={optionStyle(id, appearance.accent)}
              onSelect={() => setTheme(id)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="settings-group">
        <legend>Accent colour</legend>
        <p className="field-hint">
          Each accent is tuned per theme so links and buttons always meet contrast guidelines.
        </p>
        <div className="swatches">
          {accentIds.map((id) => (
            <label
              key={id}
              className="swatch"
              style={{ '--sw': resolveAccent(activeTheme, id).accent } as CSSProperties}
            >
              <input
                type="radio"
                name="accent"
                value={id}
                checked={appearance.accent === id}
                onChange={() => appearanceApi.update({ accent: id })}
              />
              <i aria-hidden="true" />
              {accents[id].label}
            </label>
          ))}
        </div>
      </fieldset>

      <section className="settings-group" aria-labelledby="comfort-title">
        <h2 id="comfort-title">Comfort</h2>
        <RangeField
          label="Text size"
          value={appearance.textScale}
          min={90}
          max={130}
          step={5}
          format={(v) => `${v}%`}
          onChange={(textScale) => appearanceApi.update({ textScale })}
        />
        <Segmented
          label="Density"
          value={appearance.density}
          options={[
            { value: 'comfortable', label: 'Comfortable' },
            { value: 'compact', label: 'Compact' },
          ]}
          onChange={(density) => appearanceApi.update({ density })}
        />
        <Segmented
          label="Motion"
          value={appearance.motion}
          options={[
            { value: 'system', label: 'Match device' },
            { value: 'reduced', label: 'Reduced' },
            { value: 'full', label: 'Full' },
          ]}
          onChange={(motion) => appearanceApi.update({ motion })}
        />
        <div className="settings-actions">
          <button type="button" className="button button--small" onClick={appearanceApi.reset}>
            Reset appearance
          </button>
        </div>
      </section>

      <section className="settings-group" aria-labelledby="browse-title">
        <h2 id="browse-title">Browsing</h2>
        <Segmented
          label="Book layout"
          value={browse.layout}
          options={[
            { value: 'grid', label: 'Covers' },
            { value: 'list', label: 'List' },
          ]}
          onChange={(layout) => browseApi.update({ layout })}
        />
        <Segmented
          label="Cover size"
          value={browse.coverSize}
          options={[
            { value: 'small', label: 'Small' },
            { value: 'medium', label: 'Medium' },
            { value: 'large', label: 'Large' },
          ]}
          onChange={(coverSize) => browseApi.update({ coverSize })}
        />
        <ChipToggles<FormatSlug>
          label="Formats you read most (shown first on Home)"
          options={formatList.map((f) => ({ value: f.slug, label: f.label }))}
          selected={browse.preferredFormats}
          onChange={(preferredFormats) => browseApi.update({ preferredFormats })}
        />
        <ChipToggles
          label="Genres you love (used for recommendations from Milestone 6)"
          options={topLevelGenres().map((g) => ({ value: g.slug, label: g.name }))}
          selected={browse.preferredGenres}
          onChange={(preferredGenres) => browseApi.update({ preferredGenres })}
        />
        <div className="settings-actions">
          <button type="button" className="button button--small" onClick={browseApi.reset}>
            Reset browsing
          </button>
          <SyncLine />
        </div>
      </section>
    </>
  );
}
