import { createServerFn } from '@tanstack/react-start'
import type { Functions } from 'node-appwrite'
import { z } from 'zod'

import { createSessionClient } from '#/lib/appwrite-clients.server'
import type { ActionResult, PersonalAccount } from '#/lib/personal-account'
import { readSessionCookie } from '#/lib/session-cookie.server'
import { createPersonalAccount, updatePersonalAccount } from './personal-account.server'

// The caller is identified only by the session cookie. No user id is taken
// from the request: the Function reads it from Appwrite, not from the body.
async function asSignedInUser(
  action: (functions: Functions) => Promise<ActionResult<PersonalAccount>>,
): Promise<ActionResult<PersonalAccount>> {
  const sessionSecret = readSessionCookie()
  if (!sessionSecret) {
    return { ok: false, status: 401, error: 'unauthorized', message: 'Your session expired. Sign in again.' }
  }

  try {
    return await action(createSessionClient(sessionSecret).functions)
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: 'internal_error',
      message: error instanceof Error ? error.message : 'Something went wrong. Try again.',
    }
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
