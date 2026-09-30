import { createServerFn } from '@tanstack/react-start'
import type { Functions } from 'node-appwrite'
import { z } from 'zod'

import { failure, unexpectedFailure, type ActionResult } from '#/lib/action-result'
import { createSessionClient, hasAppwriteStatus } from '#/lib/appwrite-clients.server'
import type { PersonalAccount } from '#/lib/personal-account'
import { clearSessionCookie, readSessionCookie } from '#/lib/session-cookie.server'
import { createPersonalAccount, updatePersonalAccount } from './personal-account.server'

const SESSION_EXPIRED = failure('unauthorized', 'Your session has expired. Please sign in again.')

// The caller is identified only by the session cookie. No user id is taken
// from the request: the Function reads it from Appwrite, not from the body.
async function asSignedInUser(
  action: (functions: Functions) => Promise<ActionResult<PersonalAccount>>,
): Promise<ActionResult<PersonalAccount>> {
  const sessionSecret = readSessionCookie()
  if (!sessionSecret) return SESSION_EXPIRED

  try {
    const result = await action(createSessionClient(sessionSecret).functions)
    if (!result.ok && result.error === 'unauthorized') clearSessionCookie()
    return result
  } catch (error) {
    // A dead session reaches Appwrite as a guest, and "Execute access: users"
    // turns guests away before the Function even runs.
    if (hasAppwriteStatus(error, 401)) {
      clearSessionCookie()
      return SESSION_EXPIRED
    }
    return unexpectedFailure('Calling the personal-account Function failed', error)
  }
}

export const completeOnboarding = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      firstName: z.string().trim().min(1).max(100),
      lastName: z.string().trim().min(1).max(100),
      role: z.enum(['property_owner', 'realtor']),
    }),
  )
  .handler(({ data }) => asSignedInUser((functions) => createPersonalAccount(functions, data)))

export const saveProfile = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      firstName: z.string().trim().min(1).max(100).optional(),
      lastName: z.string().trim().min(1).max(100).optional(),
      contactEmail: z.string().nullable().optional(),
      bio: z.string().nullable().optional(),
    }),
  )
  .handler(({ data }) => asSignedInUser((functions) => updatePersonalAccount(functions, data)))
