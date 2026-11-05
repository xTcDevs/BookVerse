// Small, dependency-free colour helpers used to build and verify the theme tokens.

export type Hex = `#${string}`;

interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): Rgb {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? [...clean].map((c) => c + c).join('') : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) throw new Error(`Invalid hex colour: ${hex}`);
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): Hex {
  const part = (n: number) =>
    Math.round(Math.min(255, Math.max(0, n)))
      .toString(16)
      .padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase() as Hex;
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2.x relative luminance. */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.x contrast ratio, 1–21. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Linear blend: amount 0 returns `a`, 1 returns `b`. */
export function mix(a: string, b: string, amount: number): Hex {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex({
    r: x.r + (y.r - x.r) * amount,
    g: x.g + (y.g - x.g) * amount,
    b: x.b + (y.b - x.b) * amount,
  });
}

/**
 * Moves `color` towards black (on light backgrounds) or white (on dark ones)
 * in small steps until it reaches `target` contrast against every background.
 */
export function ensureContrast(color: string, backgrounds: string[], target: number): Hex {
  const darkBackground = backgrounds.every((bg) => luminance(bg) < 0.2);
  const towards = darkBackground ? '#FFFFFF' : '#000000';
  let current = rgbToHex(hexToRgb(color));
  for (let step = 0; step <= 100; step += 1) {
    const candidate = mix(color, towards, step / 100);
    if (backgrounds.every((bg) => contrast(candidate, bg) >= target)) return candidate;
    current = candidate;
  }
  return current;
}

/** Picks white or near-black text, whichever reads better on `background`. */
export function readableOn(background: string): Hex {
  return contrast('#FFFFFF', background) >= contrast('#14110E', background) ? '#FFFFFF' : '#14110E';
}
