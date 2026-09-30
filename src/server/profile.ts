/**
 * Onboarding and profile edits. Both require a session cookie; neither takes
 * a user id from the caller &mdash; see NOTES.md for why that departs from
 * the brief.
 */

import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { createSessionClient } from '#/lib/appwrite-clients.server'
import type { ActionResult, PersonalAccount } from '#/lib/personal-account'
import { readSessionCookie } from '#/lib/session-cookie.server'
import { editPersonalAccount, submitPersonalAccount } from './personal-account.server'

/** Everything below returns a result rather than throwing, so a stale tab or
 * a Function hiccup shows as a message, not a crashed form. */
async function guarded<T>(run: () => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  const secret = readSessionCookie()
  if (!secret) {
    return { ok: false, status: 401, error: 'unauthorized', message: 'Your session expired. Sign in again.' }
  }

  try {
    return await run()
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: 'internal_error',
      message: error instanceof Error ? error.message : 'Something went wrong. Try again.',
    }
  }
}

export const createPersonalAccount = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      firstName: z.string().trim().min(1).max(100),
      lastName: z.string().trim().min(1).max(100),
      role: z.enum(['property_owner', 'realtor']),
    }),
  )
  .handler(({ data }): Promise<ActionResult<PersonalAccount>> =>
    guarded(() => {
      const { functions } = createSessionClient(readSessionCookie()!)
      return submitPersonalAccount(functions, data)
    }),
  )

export const updatePersonalAccount = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      firstName: z.string().trim().min(1).max(100).optional(),
      lastName: z.string().trim().min(1).max(100).optional(),
      contactEmail: z.string().nullable().optional(),
      bio: z.string().nullable().optional(),
    }),
  )
  .handler(({ data }): Promise<ActionResult<PersonalAccount>> =>
    guarded(() => {
      const { functions } = createSessionClient(readSessionCookie()!)
      return editPersonalAccount(functions, data)
    }),
  )
