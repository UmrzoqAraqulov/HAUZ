import { Link, useRouter } from '@tanstack/react-router'

import type { Session } from '#/server/session'
import { logout } from '#/server/session'

export function Header({ session }: { session: Session | null }) {
  const router = useRouter()

  async function handleLogout() {
    await logout()
    await router.invalidate()
    await router.navigate({ to: '/' })
  }

  return (
    <header className="site-header">
      <Link to="/" className="brand">
        HAUZ
      </Link>
      {session ? (
        <div className="header-actions">
          <span className="header-user">{session.account?.firstName ?? session.email}</span>
          <button type="button" className="btn btn-small" onClick={handleLogout}>
            Log out
          </button>
        </div>
      ) : (
        <Link to="/login" className="btn btn-small">
          Sign in
        </Link>
      )}
    </header>
  )
}
