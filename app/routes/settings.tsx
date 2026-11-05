import { NavLink, Outlet } from 'react-router';
import type { Route } from './+types/settings';
import { useAuth } from '~/lib/auth';
import type { SyncStatus } from '~/lib/prefs/sync';
import { Icon } from '~/components/icons';

export const meta: Route.MetaFunction = () => [
  { title: 'Settings · BookVerse' },
  { name: 'robots', content: 'noindex' },
];

const sections = [
  { to: '/settings/appearance', label: 'Appearance', hint: 'Theme, accent, text size, layout' },
  { to: '/settings/reading', label: 'Reading', hint: 'Text, comics and audio, separately' },
  { to: '/settings/account', label: 'Account', hint: 'Profile, sign-in, privacy' },
];

export function SyncLine() {
  const { state, sync } = useAuth();
  const text = describeSync(state.status, sync);
  return (
    <p className="sync-status" role="status">
      {sync.state === 'synced' && <Icon name="check" />}
      {text}
    </p>
  );
}

function describeSync(status: string, sync: SyncStatus): string {
  if (status === 'unavailable') return 'Saved on this device. Account sync isn’t configured on this deployment.';
  if (status !== 'signed-in') return 'Saved on this device. Sign in to use the same settings everywhere.';
  switch (sync.state) {
    case 'syncing':
      return 'Saving to your account…';
    case 'synced':
      return 'Saved to your account.';
    case 'error':
      return sync.message;
    default:
      return 'Saved on this device.';
  }
}

export default function SettingsLayout() {
  return (
    <main id="main" className="container page">
      <header className="page-head">
        <p className="eyebrow">Settings</p>
        <h1>Make BookVerse yours</h1>
        <p className="lede">The site and the reader are styled separately: browse in one theme and read in another.</p>
      </header>
      <div className="settings">
        <nav className="settings-nav" aria-label="Settings sections">
          {sections.map((s) => (
            <NavLink key={s.to} to={s.to}>
              {s.label}
              <span>{s.hint}</span>
            </NavLink>
          ))}
        </nav>
        <div className="settings-body">
          <Outlet />
        </div>
      </div>
    </main>
  );
}
