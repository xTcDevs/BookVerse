import { Link } from 'react-router';

export default function SettingsIndex() {
  return (
    <div className="genre-index">
      <Link className="genre-tile" to="/settings/appearance">
        <strong>Appearance</strong>
        <span>Eight themes, six accent colours, text size, density, motion and how books are laid out.</span>
      </Link>
      <Link className="genre-tile" to="/settings/reading">
        <strong>Reading</strong>
        <span>
          Fonts, spacing and page colours for books; page modes for comics; speed and timers for audio. Each saved
          separately.
        </span>
      </Link>
      <Link className="genre-tile" to="/settings/account">
        <strong>Account</strong>
        <span>Sign in to sync settings across devices, set your profile, or delete your account.</span>
      </Link>
    </div>
  );
}
