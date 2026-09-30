import { Link, createFileRoute } from '@tanstack/react-router'

import { useCurrentUser } from '#/lib/current-user'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  const user = useCurrentUser()

  if (!user) {
    return (
      <main>
        <h1>Welcome to HAUZ</h1>
        <p className="lede">The real estate marketplace for Uzbekistan. Sign in with your email to get started.</p>
        <Link to="/login" className="btn btn-primary btn-inline">
          Sign in
        </Link>
      </main>
    )
  }

  if (!user.account) {
    return (
      <main>
        <h1>Almost there</h1>
        <p className="lede">Finish setting up your account to start using HAUZ.</p>
        <Link to="/onboarding" className="btn btn-primary btn-inline">
          Finish setup
        </Link>
      </main>
    )
  }

  return (
    <main>
      <h1>Welcome back, {user.account.firstName}</h1>
      <p className="lede">Keep your details up to date so people know who they are talking to.</p>
      <Link to="/profile" className="btn btn-primary btn-inline">
        Go to your profile
      </Link>
    </main>
  )
}
