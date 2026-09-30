/**
 * The one place that touches the session cookie. It is httpOnly, so browser
 * JavaScript can never read the Appwrite session secret it holds &mdash; only
 * this server code ever sees the value.
 */

import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server'

const SESSION_COOKIE = 'hauz_session'

export function readSessionCookie(): string | null {
  return getCookie(SESSION_COOKIE) ?? null
}

export function writeSessionCookie(secret: string, expire: string) {
  setCookie(SESSION_COOKIE, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(expire),
  })
}

export function clearSessionCookie() {
  deleteCookie(SESSION_COOKIE, { path: '/' })
}
