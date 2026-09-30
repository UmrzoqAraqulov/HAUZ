import { z } from 'zod'

import { PERSONAL_ACCOUNT_ROLES } from './personal-account'

// Input rules shared by the forms (for inline errors) and the server
// functions (as their validators). They mirror
// functions/personal-account/src/validation.js, which stays the source of truth.

export const emailSchema = z.email('Enter a valid email address.')

export const codeSchema = z.string().trim().min(1, 'Enter the code from the email.')

const nameSchema = z
  .string()
  .trim()
  .min(1, 'This field is required.')
  .max(100, 'Use 100 characters or fewer.')

export const onboardingSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  role: z.enum(PERSONAL_ACCOUNT_ROLES, { error: 'Choose a role.' }),
})

// Empty optional fields are sent as null (clear it), never as "".
export const profileChangesSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  contactEmail: emailSchema.max(254, 'Use 254 characters or fewer.').nullable().optional(),
  bio: z.string().trim().min(1).max(2000, 'Use 2,000 characters or fewer.').nullable().optional(),
})

export type FieldErrors = Partial<Record<string, string>>

// The first problem with each field, keyed by field name.
export function getFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {}
  for (const issue of error.issues) {
    const field = String(issue.path[0])
    errors[field] ??= issue.message
  }
  return errors
}
