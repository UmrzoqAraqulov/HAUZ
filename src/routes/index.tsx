import { Link, createFileRoute } from '@tanstack/react-router'

import { useCurrentUser } from '#/lib/current-user'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  const user = useCurrentUser()

  return (
    <main>
      <h1>HAUZ</h1>
      {user ? (
        <>
          <p className="lede">Signed in as {user.account?.firstName ?? user.email}.</p>
          <Link to="/profile" className="btn btn-primary btn-inline">
            View your profile
          </Link>
        </>
      ) : (
        <>
          <p className="lede">Sign in to view and edit your profile.</p>
          <Link to="/login" className="btn btn-primary btn-inline">
            Sign in
          </Link>
        </>
      )}
    </main>
  )
}
