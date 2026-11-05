import { describe, expect, it } from 'vitest';
import { authErrorMessage, linkErrorFromUrl } from './auth-errors';

describe('emailed-link errors', () => {
  it('explains an expired or reused link', () => {
    const href =
      'https://bookverse-1.netlify.app/settings/account#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';
    expect(linkErrorFromUrl(href)).toMatch(/expired or was already used/);
  });

  it('reads errors from the query string too', () => {
    expect(linkErrorFromUrl('https://x.test/settings/account?error=server_error')).toMatch(/didn’t work/);
  });

  it('returns null for normal URLs, successful sign-ins and junk', () => {
    expect(linkErrorFromUrl('https://x.test/settings/account')).toBeNull();
    expect(linkErrorFromUrl('https://x.test/settings/account#access_token=abc&type=magiclink')).toBeNull();
    expect(linkErrorFromUrl('')).toBeNull();
    expect(linkErrorFromUrl('not a url')).toBeNull();
  });
});

describe('auth error messages', () => {
  it('maps rate limits and unknown errors to plain language', () => {
    expect(authErrorMessage({ code: 'over_email_send_rate_limit' })).toMatch(/Too many/);
    expect(authErrorMessage(null)).toMatch(/Something went wrong/);
    expect(authErrorMessage({ status: 0 })).toMatch(/couldn’t reach/);
  });
});
