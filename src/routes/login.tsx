import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'
import { z } from 'zod'

import { resultOf } from '#/lib/action-result'
import { useCurrentUserCache } from '#/lib/current-user'
import { getPathAfterSignIn } from '#/lib/destination'
import { codeSchema, emailSchema } from '#/lib/schemas'
import { sendEmailCode, verifyEmailCode } from '#/server/session'

const RESEND_COOLDOWN_SECONDS = 30

export const Route = createFileRoute('/login')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: ({ context, search }) => {
    if (context.user) {
      throw redirect({ href: getPathAfterSignIn(context.user, search.redirect) })
    }
  },
  head: () => ({ meta: [{ title: 'Sign in · HAUZ' }] }),
  component: LoginPage,
})

interface SentCode {
  email: string
  userId: string
}

// New and returning people see the same two steps: email, then code.
function LoginPage() {
  const [sentCode, setSentCode] = useState<SentCode | null>(null)

  if (!sentCode) return <EmailStep onCodeSent={setSentCode} />
  return <CodeStep sentCode={sentCode} onCodeResent={setSentCode} onUseDifferentEmail={() => setSentCode(null)} />
}

function EmailStep({ onCodeSent }: { onCodeSent: (sentCode: SentCode) => void }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = emailSchema.safeParse(email.trim())
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }

    setError(null)
    setPending(true)
    const result = await resultOf(sendEmailCode({ data: { email: parsed.data } }))
    setPending(false)

    if (!result.ok) {
      setError(result.message)
      return
    }
    onCodeSent({ email: parsed.data, userId: result.data.userId })
  }

  return (
    <main>
      <h1>Sign in</h1>
      <p className="lede">Enter your email and we'll send you a one-time code.</p>
      <form className="card" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'email-error' : undefined}
            autoFocus
          />
          {error && (
            <p id="email-error" className="field-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Sending…' : 'Send code'}
        </button>
      </form>
    </main>
  )
}

interface CodeStepProps {
  sentCode: SentCode
  onCodeResent: (sentCode: SentCode) => void
  onUseDifferentEmail: () => void
}

function CodeStep({ sentCode, onCodeResent, onUseDifferentEmail }: CodeStepProps) {
  const search = Route.useSearch()
  const navigate = useNavigate()
  const currentUserCache = useCurrentUserCache()
  const resendCooldown = useCountdown(RESEND_COOLDOWN_SECONDS)

  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = codeSchema.safeParse(code)
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }

    setError(null)
    setNotice(null)
    setPending(true)
    const result = await resultOf(verifyEmailCode({ data: { userId: sentCode.userId, code: parsed.data } }))

    if (!result.ok) {
      setError(result.message)
      setPending(false)
      return
    }
    // Stay "pending" while navigating away so the button can't be pressed twice.
    currentUserCache.set(result.data)
    await navigate({ href: getPathAfterSignIn(result.data, search.redirect) })
  }

  async function handleResend() {
    setError(null)
    setNotice(null)
    setPending(true)
    const result = await resultOf(sendEmailCode({ data: { email: sentCode.email } }))
    setPending(false)

    if (!result.ok) {
      setError(result.message)
      return
    }
    onCodeResent({ email: sentCode.email, userId: result.data.userId })
    setCode('')
    setNotice('We sent you a new code.')
    resendCooldown.restart()
  }

  return (
    <main>
      <h1>Check your email</h1>
      <p className="lede">
        We sent a code to <strong>{sentCode.email}</strong>. It can take a minute, and sometimes lands in spam.
      </p>
      <form className="card" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="code">Code</label>
          <input
            id="code"
            className="code-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'code-error' : undefined}
            autoFocus
          />
          {error && (
            <p id="code-error" className="field-error" role="alert">
              {error}
            </p>
          )}
          {notice && !error && (
            <p className="field-note" role="status">
              {notice}
            </p>
          )}
        </div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? 'Checking…' : 'Continue'}
        </button>
        <div className="form-links">
          <button type="button" className="btn-link" onClick={onUseDifferentEmail} disabled={pending}>
            Use a different email
          </button>
          <button
            type="button"
            className="btn-link"
            onClick={handleResend}
            disabled={pending || resendCooldown.secondsLeft > 0}
          >
            {resendCooldown.secondsLeft > 0 ? `Resend code in ${resendCooldown.secondsLeft}s` : 'Resend code'}
          </button>
        </div>
      </form>
    </main>
  )
}

// Counts down once per second from `seconds`; restart() starts it again.
function useCountdown(seconds: number) {
  const [secondsLeft, setSecondsLeft] = useState(seconds)

  useEffect(() => {
    if (secondsLeft === 0) return
    const timer = setTimeout(() => setSecondsLeft((left) => left - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  return { secondsLeft, restart: () => setSecondsLeft(seconds) }
}
