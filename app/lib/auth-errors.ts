// Plain-language messages for the Supabase errors people can actually hit.

interface MaybeAuthError {
  code?: string;
  status?: number;
  message?: string;
}

export function authErrorMessage(error: unknown): string {
  const e = (error ?? {}) as MaybeAuthError;
  switch (e.code) {
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Too many sign-in emails were sent recently. Please wait a little and try again.';
    case 'email_address_not_authorized':
      return 'Sign-up by email isn’t open to everyone yet. It opens once BookVerse has its own email domain.';
    case 'email_address_invalid':
    case 'validation_failed':
      return 'That email address doesn’t look right.';
    case 'otp_expired':
      return 'That code has expired or was already used. Send yourself a new one.';
    case 'otp_disabled':
    case 'signup_disabled':
      return 'Signing in by email is turned off on this deployment.';
    default:
      if (e.status === 0 || /fetch|network/i.test(e.message ?? ''))
        return 'BookVerse couldn’t reach the sign-in service. Check your connection and try again.';
      return 'Something went wrong while signing in. Please try again.';
  }
}

export function profileErrorMessage(error: unknown): string {
  const e = (error ?? {}) as { code?: string; message?: string };
  if (e.code === '23505') return 'That handle is already taken.';
  if (e.code === '23514') return 'One of the fields isn’t in the right format.';
  return 'Your profile couldn’t be saved. Please try again.';
}
