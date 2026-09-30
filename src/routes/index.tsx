import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  const { session } = Route.useRouteContext()

  return (
    <main>
      <h1>HAUZ</h1>
      {session ? (
        <>
          <p className="lede">Signed in as {session.account?.firstName ?? session.email}.</p>
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
