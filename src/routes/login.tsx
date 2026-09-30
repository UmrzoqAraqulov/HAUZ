import { useState } from 'react'
import type { FormEvent } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'

import { useCurrentUserCache } from '#/lib/current-user'
import { getPathAfterSignIn } from '#/lib/destination'
import { sendEmailCode, verifyEmailCode } from '#/server/session'

const searchSchema = z.object({ redirect: z.string().optional() })

export const Route = createFileRoute('/login')({
  validateSearch: searchSchema,
  beforeLoad: ({ context, search }) => {
    if (context.user) {
      throw redirect({ href: getPathAfterSignIn(context.user, search.redirect) })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const currentUserCache = useCurrentUserCache()

  const [stage, setStage] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [code, setCode] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSendCode(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setPending(true)
    const result = await sendEmailCode({ data: { email } })
    setPending(false)

    if (!result.ok) {
      setError(result.message)
      return
    }

    setUserId(result.data.userId)
    setStage('code')
  }

  async function handleVerify(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setPending(true)
    const result = await verifyEmailCode({ data: { userId, code } })
    setPending(false)

    if (!result.ok) {
      setError(result.message)
      return
    }

    currentUserCache.set(result.data)
    await navigate({ href: getPathAfterSignIn(result.data, search.redirect) })
  }

  if (stage === 'email') {
    return (
      <main>
        <h1>Sign in</h1>
        <p className="lede">Enter your email and we'll send you a one-time code.</p>
        <div className="card">
          <form onSubmit={handleSendCode}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoFocus
              />
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? 'Sending…' : 'Send code'}
            </button>
          </form>
        </div>
      </main>
    )
  }

  return (
    <main>
      <h1>Enter your code</h1>
      <p className="lede">We sent a code to {email}.</p>
      <div className="card">
        <form onSubmit={handleVerify}>
          <div className="field">
            <label htmlFor="code">Code</label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoFocus
            />
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? 'Verifying…' : 'Continue'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={pending}
            onClick={() => {
              setStage('email')
              setCode('')
              setError(null)
            }}
          >
            Use a different email
          </button>
        </form>
      </div>
    </main>
  )
}
