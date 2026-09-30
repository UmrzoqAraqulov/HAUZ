/**
 * Shapes shared between server functions and UI. Mirrors the response shape
 * the personal-account Function describes in functions/personal-account/src/handlers.js.
 */

export type PersonalAccountRole = 'property_owner' | 'realtor'

export interface PersonalAccount {
  personalAccountId: string
  firstName: string
  lastName: string
  role: PersonalAccountRole
  contactEmail: string | null
  bio: string | null
  createdAt: string
  updatedAt: string
}

export interface FunctionErrorBody {
  error: string
  message: string
  issues?: { field: string; message: string }[]
}

/** A result type instead of throwing, so form components get structured errors. */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; message: string; issues?: FunctionErrorBody['issues'] }
