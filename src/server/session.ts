/**
 * Sign-in (email code) and the current session. Nothing here ever hands the
 * session secret or the API key to the client &mdash; server functions only
 * ever return plain user-facing data.
 */

import { createServerFn } from '@tanstack/react-start'
import { ID } from 'node-appwrite'
import { z } from 'zod'

import { createAdminClient, createSessionClient } from '#/lib/appwrite-clients.server'
import type { ActionResult, PersonalAccount } from '#/lib/personal-account'
import { clearSessionCookie, readSessionCookie, writeSessionCookie } from '#/lib/session-cookie.server'
import { fetchPersonalAccount } from './personal-account.server'

export interface Session {
  userId: string
  email: string
  account: PersonalAccount | null
}

/**
 * `getCookie`/`setCookie` only touch, respectively, the incoming request and
 * the outgoing response &mdash; a cookie written this request is never
 * visible to a `getCookie` call later in the same request. So this takes the
 * session secret directly rather than re-reading the cookie, which lets
 * verifyEmailCode load the freshly created session without that gap.
 */
async function loadSessionFromSecret(secret: string): Promise<Session | null> {
  try {
    const { account, functions } = createSessionClient(secret)
    const user = await account.get()
    const personalAccount = await fetchPersonalAccount(functions)
    return { userId: user.$id, email: user.email, account: personalAccount }
  } catch {
    return null
  }
}

async function loadSession(): Promise<Session | null> {
  const secret = readSessionCookie()
  if (!secret) return null

  const session = await loadSessionFromSecret(secret)
  if (!session) {
    // Per product notes: if loading the current user fails for any reason,
    // treat the caller as signed out and drop the (likely stale) cookie.
    clearSessionCookie()
  }
  return session
}

export const getSession = createServerFn({ method: 'GET' }).handler(() => loadSession())

export const requestEmailCode = createServerFn({ method: 'POST' })
  .validator(z.object({ email: z.email() }))
  .handler(async ({ data }): Promise<ActionResult<{ userId: string }>> => {
    try {
      const { account } = createAdminClient()
      const token = await account.createEmailToken(ID.unique(), data.email)
      return { ok: true, data: { userId: token.userId } }
    } catch (error) {
      return {
        ok: false,
        status: 500,
        error: 'send_failed',
        message: error instanceof Error ? error.message : 'Could not send the code. Try again.',
      }
    }
  })

export const verifyEmailCode = createServerFn({ method: 'POST' })
  .validator(z.object({ userId: z.string().min(1), secret: z.string().min(1) }))
  .handler(async ({ data }): Promise<ActionResult<Session>> => {
    let appwriteSession: { secret: string; expire: string }
    try {
      const { account } = createAdminClient()
      appwriteSession = await account.createSession(data.userId, data.secret)
    } catch (error) {
      return {
        ok: false,
        status: 401,
        error: 'invalid_code',
        message: error instanceof Error ? error.message : 'That code is wrong or expired.',
      }
    }

    writeSessionCookie(appwriteSession.secret, appwriteSession.expire)

    const session = await loadSessionFromSecret(appwriteSession.secret)
    if (!session) {
      return { ok: false, status: 500, error: 'internal_error', message: 'Signed in, but could not load the account.' }
    }
    return { ok: true, data: session }
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const secret = readSessionCookie()
  if (secret) {
    try {
      const { account } = createSessionClient(secret)
      await account.deleteSession('current')
    } catch {
      // Best effort: the cookie is cleared below regardless.
    }
  }
  clearSessionCookie()
})
