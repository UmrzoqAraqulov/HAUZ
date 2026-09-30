import type { CurrentUser } from '#/server/session'

const PLACEHOLDER_ORIGIN = 'http://redirect.invalid'

// `redirect` comes from the URL, so only a path on this site is accepted.
// Parsing it (instead of checking the first characters) also rejects values
// like "/\evil.com", which browsers read as "//evil.com".
export function sanitizeRedirectPath(path: string | undefined): string | undefined {
  if (!path?.startsWith('/')) return undefined

  try {
    const url = new URL(path, PLACEHOLDER_ORIGIN)
    return url.origin === PLACEHOLDER_ORIGIN ? url.pathname + url.search + url.hash : undefined
  } catch {
    return undefined
  }
}

// Someone without a Personal Account goes through onboarding first, and the
// redirect is carried along so they still end up where they were headed.
export function getPathAfterSignIn(user: CurrentUser, redirectTo?: string): string {
  const redirectPath = sanitizeRedirectPath(redirectTo)

  if (!user.account) {
    return redirectPath ? `/onboarding?redirect=${encodeURIComponent(redirectPath)}` : '/onboarding'
  }
  return redirectPath ?? '/'
}
