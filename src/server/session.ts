import { createServerFn } from '@tanstack/react-start'
import { ID } from 'node-appwrite'
import { z } from 'zod'

import { createAdminClient, createSessionClient } from '#/lib/appwrite-clients.server'
import type { ActionResult, PersonalAccount } from '#/lib/personal-account'
import { clearSessionCookie, readSessionCookie, writeSessionCookie } from '#/lib/session-cookie.server'
import { getPersonalAccount } from './personal-account.server'

// Everything the UI knows about who is signed in. Never includes the session secret.
export interface CurrentUser {
  userId: string
  email: string
  account: PersonalAccount | null
}

// Takes the secret as an argument rather than reading the cookie: a cookie
// set earlier in the same request is not visible to getCookie yet.
async function loadCurrentUser(sessionSecret: string): Promise<CurrentUser | null> {
  try {
    const { account, functions } = createSessionClient(sessionSecret)
    const user = await account.get()
    return { userId: user.$id, email: user.email, account: await getPersonalAccount(functions) }
  } catch {
    return null
  }
}

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(async () => {
  const sessionSecret = readSessionCookie()
  if (!sessionSecret) return null

  const user = await loadCurrentUser(sessionSecret)
  // From the brief: if loading the current user fails for any reason, treat
  // them as signed out and delete the session cookie.
  if (!user) clearSessionCookie()
  return user
})

export const sendEmailCode = createServerFn({ method: 'POST' })
  .validator(z.object({ email: z.email() }))
  .handler(async ({ data }): Promise<ActionResult<{ userId: string }>> => {
    try {
      const { account } = createAdminClient()
      // ID.unique() is only used for a new email; an existing user keeps their ID.
      const token = await account.createEmailToken({ userId: ID.unique(), email: data.email })
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
  .validator(z.object({ userId: z.string().min(1), code: z.string().min(1) }))
  .handler(async ({ data }): Promise<ActionResult<CurrentUser>> => {
    let session: { secret: string; expire: string }
    try {
      const { account } = createAdminClient()
      session = await account.createSession({ userId: data.userId, secret: data.code })
    } catch (error) {
      return {
        ok: false,
        status: 401,
        error: 'invalid_code',
        message: error instanceof Error ? error.message : 'That code is wrong or expired.',
      }
    }

    writeSessionCookie(session.secret, session.expire)

    const user = await loadCurrentUser(session.secret)
    if (!user) {
      return { ok: false, status: 500, error: 'internal_error', message: 'Signed in, but could not load the account.' }
    }
    return { ok: true, data: user }
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  const sessionSecret = readSessionCookie()
  if (sessionSecret) {
    // Ending the Appwrite session means a copied cookie stops working too. The
    // cookie is cleared below even if Appwrite can't be reached.
    await createSessionClient(sessionSecret)
      .account.deleteSession({ sessionId: 'current' })
      .catch(() => {})
  }
  clearSessionCookie()
})
