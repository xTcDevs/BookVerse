import type { SVGProps } from 'react';

// Inline stroke icons. Decorative by default (aria-hidden); pair with visible text
// or an aria-label on the control that contains them.

const paths = {
  search: 'M8.5 3a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM12.5 12.5 17 17',
  chevronDown: 'M5 7.5l5 5 5-5',
  chevronRight: 'M7.5 5l5 5-5 5',
  arrowRight: 'M4 10h11M11 6l4 4-4 4',
  external: 'M11 4h5v5M16 4l-7 7M14 11v4.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5H9',
  book: 'M2 4h5a3 3 0 0 1 3 3v9a2 2 0 0 0-2-2H2zM18 4h-5a3 3 0 0 0-3 3v9a2 2 0 0 1 2-2h6z',
  headphones: 'M3 14v-3a7 7 0 0 1 14 0v3M3 13h3v5H3zM14 13h3v5h-3z',
  library: 'M3 8l7-4 7 4M5 8v8M8.5 8v8M11.5 8v8M15 8v8M2 17h16',
  bag: 'M4 7h12l-1 10H5zM7 7V5.5a3 3 0 0 1 6 0V7',
  eye: 'M1.5 10S5 4 10 4s8.5 6 8.5 6-3.5 6-8.5 6-8.5-6-8.5-6zM10 12.6a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2z',
  info: 'M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM10 9v5M10 6.2v.1',
  download: 'M10 3v10M6 9l4 4 4-4M4 16h12',
  home: 'M3 9l7-6 7 6v8H12v-5H8v5H3z',
  compass: 'M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM13 7l-1.8 4.2L7 13l1.8-4.2z',
  user: 'M10 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3.5 17a6.5 6.5 0 0 1 13 0',
  settings:
    'M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4',
  pen: 'M13.5 3.5l3 3L7 16H4v-3zM11.5 5.5l3 3',
  check: 'M4 10.5l4 4 8-9',
  close: 'M5 5l10 10M15 5L5 15',
  grid: 'M3 3h6v6H3zM11 3h6v6h-6zM3 11h6v6H3zM11 11h6v6h-6z',
  list: 'M7 5h10M7 10h10M7 15h10M3 5h.01M3 10h.01M3 15h.01',
  play: 'M6 4l10 6-10 6z',
  back: 'M9 6l-4 4 4 4M5 10h7a4 4 0 0 1 0 8h-1',
  forward: 'M11 6l4 4-4 4M15 10H8a4 4 0 0 0 0 8h1',
  moon: 'M16 12.5A7 7 0 0 1 7.5 4a7 7 0 1 0 8.5 8.5z',
  trophy: 'M6 3h8v4a4 4 0 0 1-8 0zM6 5H3a3 3 0 0 0 3 3M14 5h3a3 3 0 0 1-3 3M10 11v3M7 17h6M8 14h4',
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, className = 'icon', ...rest }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      <path d={paths[name]} />
    </svg>
  );
}
