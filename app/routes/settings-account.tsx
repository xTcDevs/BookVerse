import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Route } from './+types/settings-account';
import { Switch } from '~/components/controls';
import { useAuth, type Profile } from '~/lib/auth';
import { profileErrorMessage } from '~/lib/auth-errors';
import { buildMeta } from '~/lib/seo';
import { AVATAR_BUCKET, avatarUrl, getSupabase } from '~/lib/supabase';
import { SyncLine } from './settings';

export const meta: Route.MetaFunction = () =>
  buildMeta({
    title: 'Account',
    description: 'Your BookVerse profile and account.',
    path: '/settings/account',
    noindex: true,
  });

const HANDLE = /^[a-z0-9_]{3,30}$/;
const AVATAR_TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

type Status = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved' } | { kind: 'error'; message: string };

function ProfileForm({
  userId,
  profile,
  onSaved,
}: {
  userId: string;
  profile: Profile | null;
  onSaved: () => Promise<void>;
}) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [handleError, setHandleError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(profile?.is_public ?? false);

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const handle = String(form.get('handle') ?? '')
      .trim()
      .toLowerCase();
    if (handle && !HANDLE.test(handle)) {
      setHandleError('Use 3–30 lowercase letters, numbers or underscores.');
      return;
    }
    setHandleError(null);
    const supabase = getSupabase();
    if (!supabase) return;
    setStatus({ kind: 'saving' });
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: String(form.get('display_name') ?? '').trim() || null,
        handle: handle || null,
        bio: String(form.get('bio') ?? '').trim() || null,
        is_public: isPublic,
      })
      .eq('id', userId);
    if (error) {
      if (error.code === '23505') setHandleError('That handle is already taken.');
      setStatus({ kind: 'error', message: profileErrorMessage(error) });
      return;
    }
    await onSaved();
    setStatus({ kind: 'saved' });
  };

  return (
    <form className="settings-group" onSubmit={save} aria-labelledby="profile-title">
      <h2 id="profile-title">Profile</h2>
      <div className="field">
        <label htmlFor="display_name">Name</label>
        <input
          className="input"
          id="display_name"
          name="display_name"
          maxLength={60}
          defaultValue={profile?.display_name ?? ''}
          autoComplete="name"
        />
      </div>
      <div className="field">
        <label htmlFor="handle">Handle</label>
        <input
          className="input"
          id="handle"
          name="handle"
          maxLength={30}
          defaultValue={profile?.handle ?? ''}
          aria-invalid={handleError ? true : undefined}
          aria-describedby="handle-hint"
          autoComplete="username"
        />
        <span className="field-hint" id="handle-hint">
          {handleError ? (
            <span className="field-error">{handleError}</span>
          ) : (
            'Your public address, e.g. bookverse/u/your_handle. Lowercase letters, numbers and underscores.'
          )}
        </span>
      </div>
      <div className="field">
        <label htmlFor="bio">About you</label>
        <textarea className="textarea" id="bio" name="bio" maxLength={500} defaultValue={profile?.bio ?? ''} />
      </div>
      <Switch
        label="Make my profile public"
        checked={isPublic}
        onChange={setIsPublic}
        hint="Off by default. Public profiles become visible when community features open."
      />
      <div className="settings-actions">
        <button className="button button--primary" type="submit" disabled={status.kind === 'saving'}>
          {status.kind === 'saving' ? 'Saving…' : 'Save profile'}
        </button>
        <span role="status" className="sync-status">
          {status.kind === 'saved' && 'Profile saved.'}
          {status.kind === 'error' && status.message}
        </span>
      </div>
    </form>
  );
}

function AvatarField({
  userId,
  profile,
  onSaved,
}: {
  userId: string;
  profile: Profile | null;
  onSaved: () => Promise<void>;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const url = avatarUrl(profile?.avatar_path ?? null, profile?.updated_at);
  const initial = (profile?.display_name ?? '?').charAt(0).toUpperCase();

  const upload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const ext = AVATAR_TYPES[file.type];
    if (!ext) return setMessage('Please choose a PNG, JPEG or WebP image.');
    if (file.size > AVATAR_MAX_BYTES) return setMessage('Please choose an image under 2 MB.');
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    const path = `${userId}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' });
    if (uploadError) {
      setBusy(false);
      return setMessage('The image couldn’t be uploaded. Please try again.');
    }
    const { error: profileError } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', userId);
    setBusy(false);
    if (profileError) return setMessage('The image uploaded, but your profile couldn’t be updated. Please try again.');
    await onSaved();
    setMessage('Photo updated.');
  };

  return (
    <div className="profile-head">
      <div className="avatar-large">
        {url ? <img src={url} alt="Your profile photo" /> : <span aria-hidden="true">{initial}</span>}
      </div>
      <div className="field">
        <label className="button button--small" style={{ cursor: busy ? 'progress' : 'pointer' }}>
          {busy ? 'Uploading…' : 'Change photo'}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="visually-hidden"
            onChange={upload}
            disabled={busy}
          />
        </label>
        <span className="field-hint" role="status">
          {message ?? 'PNG, JPEG or WebP, up to 2 MB.'}
        </span>
      </div>
    </div>
  );
}

function DeleteAccount() {
  const dialog = useRef<HTMLDialogElement>(null);
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const confirmDelete = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error: fnError } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    if (fnError) {
      setBusy(false);
      setError('Your account couldn’t be deleted just now. Nothing was removed. Please try again.');
      return;
    }
    await signOut();
    dialog.current?.close();
    navigate('/', { replace: true });
  };

  return (
    <section className="settings-group" aria-labelledby="delete-title">
      <h2 id="delete-title">Delete account</h2>
      <p className="muted">This permanently removes your profile, photo and saved settings. It can’t be undone.</p>
      <div>
        <button type="button" className="button" onClick={() => dialog.current?.showModal()}>
          Delete my account…
        </button>
      </div>
      <dialog ref={dialog} aria-labelledby="delete-dialog-title">
        <div className="dialog-body">
          <h2 id="delete-dialog-title">Delete your account?</h2>
          <p>Your profile, photo and settings will be removed from BookVerse permanently.</p>
          {error && (
            <p className="notice notice--error" role="alert">
              {error}
            </p>
          )}
          <div className="actions">
            <button type="button" className="button button--primary" onClick={confirmDelete} disabled={busy}>
              {busy ? 'Deleting…' : 'Delete permanently'}
            </button>
            <button type="button" className="button" onClick={() => dialog.current?.close()} disabled={busy}>
              Keep my account
            </button>
          </div>
        </div>
      </dialog>
    </section>
  );
}

export default function AccountSettings() {
  const { state, signOut, refreshProfile } = useAuth();

  if (state.status === 'loading') {
    return <p className="muted">Checking your account…</p>;
  }
  if (state.status === 'unavailable') {
    return (
      <section className="settings-group">
        <h2>Account</h2>
        <p className="notice">
          Accounts aren’t switched on for this deployment yet. Your appearance and reading settings are saved on this
          device.
        </p>
      </section>
    );
  }
  if (state.status === 'signed-out') {
    return (
      <section className="settings-group">
        <h2>Account</h2>
        <p className="lede">
          Sign in to keep your settings on every device, and to be ready for shelves, reviews and writing as they
          arrive.
        </p>
        <div className="actions">
          <Link className="button button--primary" to="/signin">
            Sign in or create an account
          </Link>
        </div>
        <SyncLine />
      </section>
    );
  }

  return (
    <>
      <section className="settings-group" aria-labelledby="account-title">
        <h2 id="account-title">Account</h2>
        <AvatarField userId={state.user.id} profile={state.profile} onSaved={refreshProfile} />
        <p>
          Signed in as <strong>{state.user.email}</strong>
        </p>
        <div className="settings-actions">
          <button type="button" className="button button--small" onClick={() => void signOut()}>
            Sign out
          </button>
          <SyncLine />
        </div>
      </section>
      <ProfileForm
        key={state.profile?.updated_at ?? 'new'}
        userId={state.user.id}
        profile={state.profile}
        onSaved={refreshProfile}
      />
      <DeleteAccount />
    </>
  );
}
