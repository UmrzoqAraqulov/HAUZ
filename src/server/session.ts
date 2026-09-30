import { createServerFn } from '@tanstack/react-start'
import { ID } from 'node-appwrite'
import { z } from 'zod'

import { failure, unexpectedFailure, type ActionResult } from '#/lib/action-result'
import { createAdminClient, createSessionClient, hasAppwriteStatus } from '#/lib/appwrite-clients.server'
import type { PersonalAccount } from '#/lib/personal-account'
import { codeSchema, emailSchema } from '#/lib/schemas'
import { clearSessionCookie, readSessionCookie, writeSessionCookie } from '#/lib/session-cookie.server'
import { getPersonalAccount } from './personal-account.server'

// Everything the UI knows about who is signed in. Never includes the session secret.
export interface CurrentUser {
  userId: string
  email: string
  account: PersonalAccount | null
}

const TOO_MANY_ATTEMPTS = failure('rate_limited', 'Too many attempts. Please wait a minute and try again.')

// Takes the secret as an argument rather than reading the cookie: a cookie
// set earlier in the same request is not visible to getCookie yet.
async function loadCurrentUser(sessionSecret: string): Promise<CurrentUser | null> {
  try {
    const { account, functions } = createSessionClient(sessionSecret)
    const user = await account.get()
    return { userId: user.$id, email: user.email, account: await getPersonalAccount(functions) }
  } catch (error) {
    console.error('Could not load the current user:', error instanceof Error ? error.message : error)
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
  .validator(z.object({ email: emailSchema }))
  .handler(async ({ data }): Promise<ActionResult<{ userId: string }>> => {
    try {
      const { account } = createAdminClient()
      // ID.unique() is only used for a new email; an existing user keeps their ID.
      const token = await account.createEmailToken({ userId: ID.unique(), email: data.email })
      return { ok: true, data: { userId: token.userId } }
    } catch (error) {
      if (hasAppwriteStatus(error, 429)) return TOO_MANY_ATTEMPTS
      if (hasAppwriteStatus(error, 400)) return failure('invalid_email', 'Enter a valid email address.')
      return unexpectedFailure('Sending the email code failed', error)
    }
  })

export const verifyEmailCode = createServerFn({ method: 'POST' })
  .validator(z.object({ userId: z.string().min(1), code: codeSchema }))
  .handler(async ({ data }): Promise<ActionResult<CurrentUser>> => {
    let session: { secret: string; expire: string }
    try {
      const { account } = createAdminClient()
      session = await account.createSession({ userId: data.userId, secret: data.code })
    } catch (error) {
      if (hasAppwriteStatus(error, 429)) return TOO_MANY_ATTEMPTS
      if (hasAppwriteStatus(error, 400, 401, 404)) {
        return failure('invalid_code', 'That code is wrong or has expired.')
      }
      return unexpectedFailure('Verifying the email code failed', error)
    }

    writeSessionCookie(session.secret, session.expire)

    const user = await loadCurrentUser(session.secret)
    if (!user) {
      clearSessionCookie()
      return failure('unexpected', 'You were signed in, but we could not load your account. Please try again.')
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
