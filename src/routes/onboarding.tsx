import { useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { z } from 'zod'

import { safePath } from '#/lib/destination'
import type { PersonalAccountRole } from '#/lib/personal-account'
import { createPersonalAccount } from '#/server/profile'

const searchSchema = z.object({ redirect: z.string().optional() })

export const Route = createFileRoute('/onboarding')({
  validateSearch: searchSchema,
  beforeLoad: ({ context, search }) => {
    if (!context.session) {
      throw redirect({ to: '/login', search: { redirect: '/onboarding' } })
    }
    if (context.session.account) {
      throw redirect({ href: safePath(search.redirect) ?? '/' })
    }
  },
  component: OnboardingPage,
})

function OnboardingPage() {
  const search = Route.useSearch()
  const router = useRouter()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState<PersonalAccountRole>('property_owner')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (pending) return // belt and suspenders: the disabled button already stops a double click

    setError(null)
    setPending(true)
    const result = await createPersonalAccount({ data: { firstName, lastName, role } })

    if (!result.ok) {
      setPending(false)
      setError(result.message)
      return
    }

    await router.invalidate()
    await router.navigate({ href: safePath(search.redirect) ?? '/' })
  }

  return (
    <main>
      <h1>Welcome to HAUZ</h1>
      <p className="lede">Tell us a bit about you. You cannot change your role later.</p>
      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="firstName">First name</label>
            <input
              id="firstName"
              required
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              autoFocus
            />
          </div>

          <div className="field">
            <label htmlFor="lastName">Last name</label>
            <input id="lastName" required value={lastName} onChange={(event) => setLastName(event.target.value)} />
          </div>

          <fieldset>
            <legend>Role</legend>
            <div className="role-options">
              <label className="role-option">
                <input
                  type="radio"
                  name="role"
                  value="property_owner"
                  checked={role === 'property_owner'}
                  onChange={() => setRole('property_owner')}
                />
                <span>Property Owner</span>
              </label>
              <label className="role-option">
                <input
                  type="radio"
                  name="role"
                  value="realtor"
                  checked={role === 'realtor'}
                  onChange={() => setRole('realtor')}
                />
                <span>Realtor</span>
              </label>
            </div>
          </fieldset>

          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? 'Creating…' : 'Continue'}
          </button>
        </form>
      </div>
    </main>
  )
}
