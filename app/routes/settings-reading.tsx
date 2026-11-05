import { useId, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { Route } from './+types/settings-reading';
import { RangeField, Segmented, Switch } from '~/components/controls';
import { AudioPreview, TextPreview, VisualPreview, type PreviewFormat } from '~/components/reading-previews';
import { contrast, ensureContrast } from '~/design/color';
import { readerThemeIds, readerThemes, readingFontIds, readingFonts } from '~/design/tokens';
import { readerLook, resolveTheme } from '~/lib/prefs/apply';
import { usePrefs } from '~/lib/prefs/hooks';
import { applyTextPreset, textPresets, type ReaderTextPrefs, type TextPresetId } from '~/lib/prefs/schema';
import { buildMeta } from '~/lib/seo';
import { useHydrated } from '~/lib/use-hydrated';
import { useMediaQuery } from '~/lib/use-media';
import { SyncLine } from './settings';

export const meta: Route.MetaFunction = () =>
  buildMeta({
    title: 'Reading settings',
    description: 'Set up how books, comics and audiobooks are presented.',
    path: '/settings/reading',
    noindex: true,
  });

const tabs = [
  { id: 'text', label: 'Books' },
  { id: 'visual', label: 'Manga & comics' },
  { id: 'audio', label: 'Audiobooks' },
] as const;
type TabId = (typeof tabs)[number]['id'];

function useSiteLook() {
  const [appearance] = usePrefs('appearance');
  const dark = useMediaQuery('(prefers-color-scheme: dark)');
  return { theme: resolveTheme(appearance.theme, dark), accent: appearance.accent };
}

function TextSettings() {
  const [prefs, api] = usePrefs('reader_text');
  const site = useSiteLook();
  const look = readerLook(prefs, site.theme, site.accent);
  const fontId = useId();
  // Any manual change after choosing a preset turns it into your own custom set.
  const change = (patch: Partial<ReaderTextPrefs>) => api.update({ ...patch, preset: 'custom' });
  const ratio = contrast(look.ink, look.page);

  return (
    <div className="reading-layout">
      <div className="settings-body">
        <section className="settings-group" aria-labelledby="presets-title">
          <h2 id="presets-title">Presets</h2>
          <div className="preset-grid">
            {(Object.keys(textPresets) as Exclude<TextPresetId, 'custom'>[]).map((id) => {
              const values = textPresets[id].values;
              const sample =
                values.theme === 'match'
                  ? { page: 'var(--bv-surface)', ink: 'var(--bv-text)' }
                  : readerThemes[values.theme as keyof typeof readerThemes];
              return (
                <button
                  key={id}
                  type="button"
                  className="preset"
                  aria-pressed={prefs.preset === id}
                  onClick={() => api.update(applyTextPreset(prefs, id))}
                >
                  <span
                    className="preset__sample"
                    aria-hidden="true"
                    style={{
                      background: 'page' in sample ? sample.page : undefined,
                      color: sample.ink,
                      fontFamily: readingFonts[values.font].stack,
                    }}
                  >
                    Aa
                  </span>
                  {textPresets[id].label}
                </button>
              );
            })}
          </div>
          {prefs.preset === 'custom' && (
            <p className="field-hint">You’re using your own combination. Choose a preset to start again from one.</p>
          )}
        </section>

        <fieldset className="settings-group">
          <legend>Page colour</legend>
          <div className="chip-group">
            <button
              type="button"
              className="chip"
              aria-pressed={prefs.theme === 'match'}
              onClick={() => change({ theme: 'match' })}
            >
              Match the site
            </button>
            {readerThemeIds.map((id) => (
              <button
                key={id}
                type="button"
                className="chip"
                aria-pressed={prefs.theme === id}
                onClick={() => change({ theme: id })}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: '0.9rem',
                    height: '0.9rem',
                    borderRadius: 99,
                    background: readerThemes[id].page,
                    border: '1px solid var(--bv-border-strong)',
                  }}
                />
                {readerThemes[id].label}
              </button>
            ))}
            <button
              type="button"
              className="chip"
              aria-pressed={prefs.theme === 'custom'}
              onClick={() => change({ theme: 'custom' })}
            >
              Custom
            </button>
          </div>
          {prefs.theme === 'custom' && (
            <div className="color-pair">
              <label className="field">
                <span className="field-label">Background</span>
                <input
                  type="color"
                  value={prefs.customPage}
                  onChange={(e) => change({ customPage: e.target.value.toUpperCase() })}
                />
              </label>
              <label className="field">
                <span className="field-label">Text</span>
                <input
                  type="color"
                  value={prefs.customInk}
                  onChange={(e) => change({ customInk: e.target.value.toUpperCase() })}
                />
              </label>
            </div>
          )}
          {ratio < 4.5 && (
            <div className="notice notice--error contrast-warning" role="alert">
              <span>Contrast is {ratio.toFixed(1)}:1, below the 4.5:1 needed for comfortable reading.</span>
              <button
                type="button"
                className="button button--small"
                onClick={() =>
                  change({
                    theme: 'custom',
                    customPage: look.page.toUpperCase(),
                    customInk: ensureContrast(look.ink, [look.page], 4.5),
                  })
                }
              >
                Fix the text colour
              </button>
            </div>
          )}
        </fieldset>

        <section className="settings-group" aria-labelledby="type-title">
          <h2 id="type-title">Type</h2>
          <div className="settings-row">
            <label className="field-label" htmlFor={fontId}>
              Font
            </label>
            <select
              id={fontId}
              className="select"
              style={{ maxWidth: '20rem' }}
              value={prefs.font}
              onChange={(e) => change({ font: e.target.value as ReaderTextPrefs['font'] })}
            >
              {readingFontIds.map((id) => (
                <option key={id} value={id}>
                  {readingFonts[id].label} — {readingFonts[id].kind}
                </option>
              ))}
            </select>
          </div>
          <RangeField
            label="Size"
            value={prefs.fontSize}
            min={14}
            max={32}
            step={1}
            format={(v) => `${v}px`}
            onChange={(fontSize) => change({ fontSize })}
          />
          <RangeField
            label="Weight"
            value={prefs.fontWeight}
            min={300}
            max={700}
            step={10}
            format={(v) => String(v)}
            onChange={(fontWeight) => change({ fontWeight })}
          />
          <RangeField
            label="Line spacing"
            value={prefs.lineHeight}
            min={1.2}
            max={2.2}
            step={0.05}
            format={(v) => v.toFixed(2)}
            onChange={(lineHeight) => change({ lineHeight })}
          />
          <RangeField
            label="Letter spacing"
            value={prefs.letterSpacing}
            min={-0.02}
            max={0.12}
            step={0.01}
            format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`}
            onChange={(letterSpacing) => change({ letterSpacing })}
          />
          <RangeField
            label="Paragraph gap"
            value={prefs.paragraphSpacing}
            min={0}
            max={1.6}
            step={0.1}
            format={(v) => (v === 0 ? 'Indent' : `${v.toFixed(1)} line`)}
            onChange={(paragraphSpacing) => change({ paragraphSpacing })}
          />
        </section>

        <section className="settings-group" aria-labelledby="page-title">
          <h2 id="page-title">Page</h2>
          <RangeField
            label="Line length"
            value={prefs.measure}
            min={45}
            max={90}
            step={1}
            format={(v) => `${v} characters`}
            onChange={(measure) => change({ measure })}
          />
          <RangeField
            label="Margins"
            value={prefs.margins}
            min={0}
            max={6}
            step={1}
            format={(v) => ['None', 'Tiny', 'Small', 'Medium', 'Large', 'Wide', 'Widest'][v] ?? String(v)}
            onChange={(margins) => change({ margins })}
          />
          <Segmented
            label="Alignment"
            value={prefs.align}
            options={[
              { value: 'start', label: 'Left' },
              { value: 'justify', label: 'Justified' },
            ]}
            onChange={(align) => change({ align })}
          />
          <Segmented
            label="Layout"
            value={prefs.layout}
            options={[
              { value: 'scroll', label: 'Scroll' },
              { value: 'paged', label: 'Pages' },
            ]}
            onChange={(layout) => api.update({ layout })}
          />
        </section>
        <div className="settings-actions">
          <button type="button" className="button button--small" onClick={api.reset}>
            Reset book settings
          </button>
          <SyncLine />
        </div>
      </div>
      <aside className="reading-preview" aria-label="Preview">
        <div className="reading-preview__label">
          <span>Preview</span>
          <span>Frankenstein · Standard Ebooks</span>
        </div>
        <TextPreview look={look} />
      </aside>
    </div>
  );
}

function VisualSettings() {
  const [prefs, api] = usePrefs('reader_visual');
  const [format, setFormat] = useState<PreviewFormat>('manga');
  return (
    <div className="reading-layout">
      <div className="settings-body">
        <section className="settings-group" aria-labelledby="visual-title">
          <h2 id="visual-title">Pages</h2>
          <Segmented
            label="Reading mode"
            value={prefs.mode}
            options={[
              { value: 'auto', label: 'Best for each format' },
              { value: 'paged', label: 'Pages' },
              { value: 'vertical', label: 'Vertical scroll' },
            ]}
            onChange={(mode) => api.update({ mode })}
          />
          <Segmented
            label="Direction"
            value={prefs.direction}
            options={[
              { value: 'auto', label: 'Best for each format' },
              { value: 'rtl', label: 'Right to left' },
              { value: 'ltr', label: 'Left to right' },
            ]}
            onChange={(direction) => api.update({ direction })}
          />
          <Segmented
            label="Pages at once"
            value={prefs.spread}
            options={[
              { value: 'single', label: 'One' },
              { value: 'double', label: 'Two (spread)' },
            ]}
            onChange={(spread) => api.update({ spread })}
          />
          <Segmented
            label="Fit"
            value={prefs.fit}
            options={[
              { value: 'width', label: 'Width' },
              { value: 'height', label: 'Height' },
              { value: 'original', label: 'Original size' },
            ]}
            onChange={(fit) => api.update({ fit })}
          />
          <RangeField
            label="Gap between pages"
            value={prefs.gap}
            min={0}
            max={48}
            step={2}
            format={(v) => `${v}px`}
            onChange={(gap) => api.update({ gap })}
          />
          <Segmented
            label="Background"
            value={prefs.background}
            options={[
              { value: 'black', label: 'Black' },
              { value: 'grey', label: 'Grey' },
              { value: 'white', label: 'White' },
              { value: 'match', label: 'Match the site' },
            ]}
            onChange={(background) => api.update({ background })}
          />
          <Switch
            label="Open in full screen"
            checked={prefs.fullscreen}
            onChange={(fullscreen) => api.update({ fullscreen })}
          />
        </section>
        <div className="settings-actions">
          <button type="button" className="button button--small" onClick={api.reset}>
            Reset comics settings
          </button>
          <SyncLine />
        </div>
      </div>
      <aside className="reading-preview" aria-label="Preview">
        <div className="reading-preview__label">
          <span>Preview</span>
          <span>
            <label className="visually-hidden" htmlFor="preview-format">
              Preview format
            </label>
            <select
              id="preview-format"
              value={format}
              onChange={(e) => setFormat(e.target.value as PreviewFormat)}
              style={{
                background: 'transparent',
                border: 0,
                fontWeight: 600,
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                letterSpacing: '0.08em',
              }}
            >
              <option value="manga">Manga</option>
              <option value="webtoon">Webtoon</option>
              <option value="comic">Comic</option>
            </select>
          </span>
        </div>
        <VisualPreview prefs={prefs} format={format} pageBg="var(--bv-bg)" />
      </aside>
    </div>
  );
}

function AudioSettings() {
  const [prefs, api] = usePrefs('reader_audio');
  return (
    <div className="reading-layout">
      <div className="settings-body">
        <section className="settings-group" aria-labelledby="audio-title">
          <h2 id="audio-title">Playback</h2>
          <RangeField
            label="Speed"
            value={prefs.speed}
            min={0.5}
            max={2.5}
            step={0.05}
            format={(v) => `${v.toFixed(2)}×`}
            onChange={(speed) => api.update({ speed })}
          />
          <Segmented
            label="Skip back"
            value={String(prefs.skipBack)}
            options={['5', '10', '15', '30'].map((v) => ({ value: v, label: `${v}s` }))}
            onChange={(v) => api.update({ skipBack: Number(v) as typeof prefs.skipBack })}
          />
          <Segmented
            label="Skip forward"
            value={String(prefs.skipForward)}
            options={['10', '15', '30', '60'].map((v) => ({ value: v, label: `${v}s` }))}
            onChange={(v) => api.update({ skipForward: Number(v) as typeof prefs.skipForward })}
          />
          <Segmented
            label="Sleep timer"
            value={prefs.sleepTimer}
            options={[
              { value: 'off', label: 'Off' },
              { value: '15', label: '15 min' },
              { value: '30', label: '30 min' },
              { value: '60', label: '60 min' },
              { value: 'chapter', label: 'End of chapter' },
            ]}
            onChange={(sleepTimer) => api.update({ sleepTimer })}
          />
          <Switch
            label="Continue to the next chapter"
            checked={prefs.autoplayNext}
            onChange={(autoplayNext) => api.update({ autoplayNext })}
          />
        </section>
        <div className="settings-actions">
          <button type="button" className="button button--small" onClick={api.reset}>
            Reset audio settings
          </button>
          <SyncLine />
        </div>
      </div>
      <aside className="reading-preview" aria-label="Preview">
        <div className="reading-preview__label">
          <span>Preview</span>
          <span>Player</span>
        </div>
        <AudioPreview prefs={prefs} />
      </aside>
    </div>
  );
}

export default function ReadingSettings() {
  const hydrated = useHydrated();
  const [params] = useSearchParams();
  const requested = hydrated ? params.get('tab') : null;
  const tab: TabId = tabs.some((t) => t.id === requested) ? (requested as TabId) : 'text';
  return (
    <>
      <nav className="tabs" aria-label="Reading formats">
        {tabs.map((t) => (
          <Link
            key={t.id}
            to={`?tab=${t.id}`}
            replace
            preventScrollReset
            aria-current={tab === t.id ? 'page' : undefined}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <p className="field-hint">
        These settings are saved separately for each kind of book, and separately from the site’s appearance.
      </p>
      {tab === 'text' && <TextSettings />}
      {tab === 'visual' && <VisualSettings />}
      {tab === 'audio' && <AudioSettings />}
    </>
  );
}
