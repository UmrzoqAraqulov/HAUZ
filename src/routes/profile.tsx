import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import type { SubmitEvent } from 'react'

import { TextField } from '#/components/TextField'
import { resultOf } from '#/lib/action-result'
import { useCurrentUser, useCurrentUserCache, useSendToSignIn } from '#/lib/current-user'
import { ROLE_LABELS, type PersonalAccount, type PersonalAccountChanges } from '#/lib/personal-account'
import { getFieldErrors, profileChangesSchema, type FieldErrors } from '#/lib/schemas'
import { saveProfile } from '#/server/profile'

const BIO_MAX_LENGTH = 2000

export const Route = createFileRoute('/profile')({
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: '/login', search: { redirect: '/profile' } })
    }
    if (!context.user.account) {
      throw redirect({ to: '/onboarding', search: { redirect: '/profile' } })
    }
  },
  head: () => ({ meta: [{ title: 'Your profile · HAUZ' }] }),
  component: ProfilePage,
})

function ProfilePage() {
  const user = useCurrentUser()
  // The route guard guarantees an account; it only goes away mid-logout.
  if (!user?.account) return null
  return <ProfileForm account={user.account} signInEmail={user.email} />
}

interface FormValues {
  firstName: string
  lastName: string
  contactEmail: string
  bio: string
}

function toFormValues(account: PersonalAccount): FormValues {
  return {
    firstName: account.firstName,
    lastName: account.lastName,
    contactEmail: account.contactEmail ?? '',
    bio: account.bio ?? '',
  }
}

// Only what changed is sent. An emptied optional field becomes null, which
// the Function reads as "clear it" (it rejects an empty string).
function getChanges(account: PersonalAccount, values: FormValues): PersonalAccountChanges {
  const changes: PersonalAccountChanges = {}
  const firstName = values.firstName.trim()
  const lastName = values.lastName.trim()
  const contactEmail = values.contactEmail.trim() || null
  const bio = values.bio.trim() || null

  if (firstName !== account.firstName) changes.firstName = firstName
  if (lastName !== account.lastName) changes.lastName = lastName
  if (contactEmail !== account.contactEmail) changes.contactEmail = contactEmail
  if (bio !== account.bio) changes.bio = bio
  return changes
}

function ProfileForm({ account, signInEmail }: { account: PersonalAccount; signInEmail: string }) {
  const currentUserCache = useCurrentUserCache()
  const sendToSignIn = useSendToSignIn()

  const [values, setValues] = useState(() => toFormValues(account))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)

  const changes = getChanges(account, values)
  const hasChanges = Object.keys(changes).length > 0

  function setField(field: keyof FormValues) {
    return (value: string) => {
      setValues((current) => ({ ...current, [field]: value }))
      setFieldErrors((errors) => ({ ...errors, [field]: undefined }))
      setSaved(false)
    }
  }

  function discardChanges() {
    setValues(toFormValues(account))
    setFieldErrors({})
    setError(null)
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!hasChanges) return

    const parsed = profileChangesSchema.safeParse(changes)
    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error))
      return
    }

    setFieldErrors({})
    setError(null)
    setPending(true)
    const result = await resultOf(saveProfile({ data: parsed.data }))
    setPending(false)

    if (!result.ok) {
      if (result.error === 'unauthorized') {
        await sendToSignIn('/profile')
        return
      }
      setError(result.message)
      return
    }

    currentUserCache.setAccount(result.data)
    // Show exactly what was stored (surrounding spaces trimmed).
    setValues(toFormValues(result.data))
    setSaved(true)
  }

  return (
    <main>
      <h1>Your profile</h1>
      <p className="lede">Signed in as {signInEmail}</p>

      <form className="card" onSubmit={handleSubmit} noValidate>
        <div className="profile-role">
          <span className="badge">{ROLE_LABELS[account.role]}</span>
          <span className="field-note">Your role can't be changed.</span>
        </div>

        <div className="field-row">
          <TextField
            id="firstName"
            label="First name"
            value={values.firstName}
            onChange={setField('firstName')}
            error={fieldErrors.firstName}
            maxLength={100}
            autoComplete="given-name"
          />
          <TextField
            id="lastName"
            label="Last name"
            value={values.lastName}
            onChange={setField('lastName')}
            error={fieldErrors.lastName}
            maxLength={100}
            autoComplete="family-name"
          />
        </div>

        <TextField
          id="contactEmail"
          label="Contact email"
          type="email"
          value={values.contactEmail}
          onChange={setField('contactEmail')}
          error={fieldErrors.contactEmail}
          hint="Optional. Leave it empty to remove it."
          maxLength={254}
          autoComplete="email"
        />

        <div className="field">
          <div className="label-row">
            <label htmlFor="bio">Bio</label>
            <span className="field-note">
              {values.bio.length} / {BIO_MAX_LENGTH}
            </span>
          </div>
          <textarea
            id="bio"
            rows={5}
            maxLength={BIO_MAX_LENGTH}
            value={values.bio}
            onChange={(event) => setField('bio')(event.target.value)}
            placeholder="Optional. A few words about you."
            aria-invalid={fieldErrors.bio ? true : undefined}
            aria-describedby={fieldErrors.bio ? 'bio-error' : undefined}
          />
          {fieldErrors.bio && (
            <p id="bio-error" className="field-error" role="alert">
              {fieldErrors.bio}
            </p>
          )}
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={pending || !hasChanges}>
            {pending ? 'Saving…' : 'Save changes'}
          </button>
          {hasChanges && !pending && (
            <button type="button" className="btn-link" onClick={discardChanges}>
              Discard changes
            </button>
          )}
          {saved && (
            <span className="form-success" role="status">
              Saved
            </span>
          )}
        </div>
      </form>
    </main>
  )
}
