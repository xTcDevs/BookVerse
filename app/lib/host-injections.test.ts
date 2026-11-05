import { describe, expect, it } from 'vitest';
import { parkHostInjectedNodes } from './host-injections';

describe('host-injected nodes', () => {
  it('sets aside Netlify comments, head whitespace, toolbar scripts and the badge, then restores them', () => {
    document.head.innerHTML = '<meta charset="utf-8">\n<!-- This site is hosted on Netlify. --><title>t</title>';
    document.body.innerHTML =
      '<main>app</main><!--$?--><script src="/.netlify/scripts/hud?variant=public"></script><iframe id="nl-badge-frame"></iframe>';

    const restore = parkHostInjectedNodes();
    expect(document.head.innerHTML).toBe('<meta charset="utf-8"><title>t</title>');
    // React's own Suspense markers and app content are untouched.
    expect(document.body.innerHTML).toBe('<main>app</main><!--$?-->');

    restore();
    expect(document.querySelector('#nl-badge-frame')).not.toBeNull();
    expect(document.querySelector('script[src*=".netlify/"]')).not.toBeNull();
    expect(document.head.innerHTML).toContain('hosted on Netlify');
  });

  it('does nothing on a page without host additions', () => {
    document.head.innerHTML = '<meta charset="utf-8"><title>t</title>';
    document.body.innerHTML = '<main>app</main>';
    const restore = parkHostInjectedNodes();
    restore();
    expect(document.head.innerHTML).toBe('<meta charset="utf-8"><title>t</title>');
    expect(document.body.innerHTML).toBe('<main>app</main>');
  });
});
