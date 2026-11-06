import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import type { Route } from './+types/signin';
import { useAuth } from '~/lib/auth';
import { authErrorMessage } from '~/lib/auth-errors';
import { buildMeta } from '~/lib/seo';
import { getSupabase } from '~/lib/supabase';

export const meta: Route.MetaFunction = () =>
  buildMeta({
    title: 'Sign in',
    description: 'Sign in to BookVerse with a one-time email link.',
    path: '/signin',
    noindex: true,
  });

type Step =
  | { kind: 'email' }
  | { kind: 'sending'; email: string }
  | { kind: 'code'; email: string }
  | { kind: 'verifying'; email: string };

export default function SignIn() {
  const { state, linkError } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>({ kind: 'email' });
  const [error, setError] = useState<string | null>(null);

  if (state.status === 'unavailable') {
    return (
      <main id="main" className="container page">
        <div className="auth-card">
          <p className="eyebrow">Sign in</p>
          <h1>Accounts aren’t switched on here yet</h1>
          <p className="lede">
            This deployment has no account service configured. Your settings still save on this device.
          </p>
        </div>
      </main>
    );
  }

  if (state.status === 'signed-in') {
    return (
      <main id="main" className="container page">
        <div className="auth-card">
          <p className="eyebrow">Signed in</p>
          <h1>You’re signed in</h1>
          <p className="lede">As {state.user.email}. Your settings now follow you to every device.</p>
          <p>
            <Link className="button button--primary" to="/settings/account">
              Go to your account
            </Link>
          </p>
        </div>
      </main>
    );
  }

  const sendCode = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get('email') ?? '').trim();
    const supabase = getSupabase();
    if (!supabase || !email) return;
    setError(null);
    setStep({ kind: 'sending', email });
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/settings/account` },
    });
    if (otpError) {
      setError(authErrorMessage(otpError));
      setStep({ kind: 'email' });
      return;
    }
    setStep({ kind: 'code', email });
  };

  const verify = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step.kind !== 'code') return;
    const token = String(new FormData(e.currentTarget).get('code') ?? '').replace(/\s/g, '');
    const supabase = getSupabase();
    if (!supabase) return;
    setError(null);
    const email = step.email;
    setStep({ kind: 'verifying', email });
    const { error: verifyError } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (verifyError) {
      setError(authErrorMessage(verifyError));
      setStep({ kind: 'code', email });
      return;
    }
    navigate('/settings/account', { replace: true });
  };

  const showingCode = step.kind === 'code' || step.kind === 'verifying';

  return (
    <main id="main" className="container page">
      <div className="auth-card">
        <p className="eyebrow">Sign in or create an account</p>
        <h1>{showingCode ? 'Check your email' : 'Welcome to BookVerse'}</h1>
        {!showingCode ? (
          <form className="auth-card" onSubmit={sendCode} noValidate={false} aria-busy={step.kind === 'sending'}>
            <p className="lede">We’ll email you a one-time sign-in link. No password to remember.</p>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                className="input"
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                defaultValue={step.kind === 'sending' ? step.email : undefined}
              />
            </div>
            <button className="button button--primary" type="submit" disabled={step.kind === 'sending'}>
              {step.kind === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
            </button>
          </form>
        ) : (
          <form className="auth-card" onSubmit={verify} aria-busy={step.kind === 'verifying'}>
            <p className="lede">
              We sent an email to {step.email}. Open its sign-in link on any device; in this browser, this page updates
              by itself. If your email shows a code instead, enter it here.
            </p>
            <div className="field">
              <label htmlFor="code">Code from the email (if it has one)</label>
              <input
                className="input code-input"
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9 ]{6,8}"
                maxLength={8}
                required
                disabled={step.kind === 'verifying'}
              />
            </div>
            <div className="actions">
              <button className="button button--primary" type="submit" disabled={step.kind === 'verifying'}>
                {step.kind === 'verifying' ? 'Verifying…' : 'Sign in'}
              </button>
              <button
                className="button button--ghost"
                type="button"
                onClick={() => setStep({ kind: 'email' })}
                disabled={step.kind === 'verifying'}
              >
                Use a different email
              </button>
            </div>
            {step.kind === 'verifying' && (
              <p className="field-hint" role="status">
                Checking your code…
              </p>
            )}
          </form>
        )}
        {!error && linkError && step.kind === 'email' && (
          <p className="notice notice--error" role="alert">
            {linkError}
          </p>
        )}
        {error && (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        )}
        <p className="muted small">
          By continuing you agree that BookVerse stores your email and settings to run your account. You can delete your
          account at any time in Settings.
        </p>
      </div>
    </main>
  );
}
