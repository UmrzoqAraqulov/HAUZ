import { useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'

import { useCurrentUser, useCurrentUserCache } from '#/lib/current-user'
import { ROLE_LABELS, type PersonalAccount } from '#/lib/personal-account'
import { saveProfile } from '#/server/profile'

export const Route = createFileRoute('/profile')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login', search: { redirect: '/profile' } })
    }
    if (!context.user.account) {
      throw redirect({ to: '/onboarding', search: { redirect: '/profile' } })
    }
  },
  component: ProfilePage,
})

function ProfilePage() {
  const user = useCurrentUser()
  // The route guard guarantees an account; it only goes away mid-logout.
  if (!user?.account) return null
  return <ProfileForm account={user.account} />
}

function ProfileForm({ account }: { account: PersonalAccount }) {
  const currentUserCache = useCurrentUserCache()

  const [firstName, setFirstName] = useState(account.firstName)
  const [lastName, setLastName] = useState(account.lastName)
  const [contactEmail, setContactEmail] = useState(account.contactEmail ?? '')
  const [bio, setBio] = useState(account.bio ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaved(false)

    const patch: { firstName?: string; lastName?: string; contactEmail?: string | null; bio?: string | null } = {}

    const nextFirstName = firstName.trim()
    if (nextFirstName !== account.firstName) patch.firstName = nextFirstName

    const nextLastName = lastName.trim()
    if (nextLastName !== account.lastName) patch.lastName = nextLastName

    // An emptied field means "clear it" (null), not "leave it alone" — see
    // the updateRequest validator in functions/personal-account.
    const nextContactEmail = contactEmail.trim() === '' ? null : contactEmail.trim()
    if (nextContactEmail !== (account.contactEmail ?? null)) patch.contactEmail = nextContactEmail

    const nextBio = bio.trim() === '' ? null : bio.trim()
    if (nextBio !== (account.bio ?? null)) patch.bio = nextBio

    if (Object.keys(patch).length === 0) return

    setPending(true)
    const result = await saveProfile({ data: patch })
    setPending(false)

    if (!result.ok) {
      setError(result.message)
      return
    }

    currentUserCache.setAccount(result.data)
    setSaved(true)
  }

  return (
    <main>
      <h1>Your profile</h1>
      <p className="lede">View and update your details.</p>
      <div className="card">
        <span className="role-readonly" title="Role cannot be changed after your account is created">
          {ROLE_LABELS[account.role]}
        </span>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="firstName">First name</label>
            <input id="firstName" required value={firstName} onChange={(event) => setFirstName(event.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="lastName">Last name</label>
            <input id="lastName" required value={lastName} onChange={(event) => setLastName(event.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="contactEmail">Contact email</label>
            <input
              id="contactEmail"
              type="email"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
              placeholder="Optional"
            />
          </div>

          <div className="field">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              rows={4}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Optional"
            />
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}
          {saved && !error && <p className="form-success">Saved.</p>}
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>
    </main>
  )
}
