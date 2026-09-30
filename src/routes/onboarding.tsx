import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import type { SubmitEvent } from 'react'
import { z } from 'zod'

import { TextField } from '#/components/TextField'
import { resultOf } from '#/lib/action-result'
import { useCurrentUserCache, useSendToSignIn } from '#/lib/current-user'
import { sanitizeRedirectPath } from '#/lib/destination'
import { PERSONAL_ACCOUNT_ROLES, ROLE_LABELS, type PersonalAccountRole } from '#/lib/personal-account'
import { getFieldErrors, onboardingSchema, type FieldErrors } from '#/lib/schemas'
import { completeOnboarding } from '#/server/profile'

const ROLE_DESCRIPTIONS: Record<PersonalAccountRole, string> = {
  property_owner: 'You own property you want to sell or rent out.',
  realtor: 'You help clients buy, sell or rent property.',
}

export const Route = createFileRoute('/onboarding')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: ({ context, search }) => {
    // Signing in sends people without an account back here, redirect intact.
    if (!context.user) {
      throw redirect({ to: '/login', search: { redirect: search.redirect } })
    }
    if (context.user.account) {
      throw redirect({ href: sanitizeRedirectPath(search.redirect) ?? '/' })
    }
  },
  head: () => ({ meta: [{ title: 'Set up your account · HAUZ' }] }),
  component: OnboardingPage,
})

function OnboardingPage() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const currentUserCache = useCurrentUserCache()
  const sendToSignIn = useSendToSignIn()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  // No default: the role can never be changed, so it has to be a real choice.
  const [role, setRole] = useState<PersonalAccountRole | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // A ref flips immediately, so even two submits in the same tick cannot both
  // get through. The Function is idempotent too, so this is the second guard.
  const submitting = useRef(false)

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return

    const parsed = onboardingSchema.safeParse({ firstName, lastName, role })
    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error))
      return
    }

    submitting.current = true
    setFieldErrors({})
    setError(null)
    setPending(true)
    const result = await resultOf(completeOnboarding({ data: parsed.data }))

    if (!result.ok) {
      submitting.current = false
      setPending(false)
      if (result.error === 'unauthorized') {
        // Sign-in brings people without an account back to onboarding anyway.
        await sendToSignIn(search.redirect ?? '/')
        return
      }
      setError(result.message)
      return
    }

    currentUserCache.setAccount(result.data)
    await navigate({ href: sanitizeRedirectPath(search.redirect) ?? '/' })
  }

  return (
    <main>
      <h1>Set up your account</h1>
      <p className="lede">Tell us who you are. It only takes a moment.</p>
      <form className="card" onSubmit={handleSubmit} noValidate>
        <div className="field-row">
          <TextField
            id="firstName"
            label="First name"
            value={firstName}
            onChange={setFirstName}
            error={fieldErrors.firstName}
            maxLength={100}
            autoComplete="given-name"
            autoFocus
          />
          <TextField
            id="lastName"
            label="Last name"
            value={lastName}
            onChange={setLastName}
            error={fieldErrors.lastName}
            maxLength={100}
            autoComplete="family-name"
          />
        </div>

        <fieldset className="field" aria-describedby={fieldErrors.role ? 'role-error' : 'role-hint'}>
          <legend>I am a</legend>
          <div className="role-options">
            {PERSONAL_ACCOUNT_ROLES.map((value) => (
              <label key={value} className="role-option">
                <input
                  type="radio"
                  name="role"
                  value={value}
                  checked={role === value}
                  onChange={() => setRole(value)}
                />
                <span className="role-option-title">{ROLE_LABELS[value]}</span>
                <span className="role-option-description">{ROLE_DESCRIPTIONS[value]}</span>
              </label>
            ))}
          </div>
          {fieldErrors.role ? (
            <p id="role-error" className="field-error" role="alert">
              {fieldErrors.role}
            </p>
          ) : (
            <p id="role-hint" className="field-note">
              You can't change this later.
            </p>
          )}
        </fieldset>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Creating your account…' : 'Continue'}
        </button>
      </form>
    </main>
  )
}
