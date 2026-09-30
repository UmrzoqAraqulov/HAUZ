import type { Session } from '#/server/session'

/**
 * Only ever trust `redirect` as an in-app path. It comes from a query
 * parameter, so without this a value like `?redirect=https://evil.example`
 * would send a just-signed-in visitor straight off the site.
 */
export function safePath(path: string | undefined): string | undefined {
  if (!path) return undefined
  return path.startsWith('/') && !path.startsWith('//') ? path : undefined
}

/**
 * Where to send someone once they have a session: onboarding if they have no
 * Personal Account yet (carrying the original `redirect` along so it is not
 * lost), otherwise wherever `redirect` named, otherwise home.
 */
export function destinationAfterAuth(session: Session, redirectTo?: string): string {
  const target = safePath(redirectTo)
  if (!session.account) {
    return target ? `/onboarding?redirect=${encodeURIComponent(target)}` : '/onboarding'
  }
  return target ?? '/'
}
