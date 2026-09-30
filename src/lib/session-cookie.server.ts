import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server'

// httpOnly: browser JavaScript can never read the Appwrite session secret.
const SESSION_COOKIE = 'hauz_session'

export function readSessionCookie(): string | null {
  return getCookie(SESSION_COOKIE) ?? null
}

export function writeSessionCookie(sessionSecret: string, expiresAt: string) {
  setCookie(SESSION_COOKIE, sessionSecret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(expiresAt),
  })
}

export function clearSessionCookie() {
  deleteCookie(SESSION_COOKIE, { path: '/' })
}
